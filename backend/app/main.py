from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import aiohttp
import asyncpg
import os
from datetime import datetime, date, timedelta
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 露營區名稱映射
HOTEL_NAMES = {
    "2436": "霧繞",
    "2799": "霧語", 
    "2155": "山中靜靜",
    "2656": "暖硫"
}

def get_hotel_name(hotel_id: str) -> str:
    """獲取酒店中文名稱"""
    return HOTEL_NAMES.get(hotel_id, f"酒店-{hotel_id}")

class InventoryData(BaseModel):
    date: str
    quantity: int
    status: str

class APIResponse(BaseModel):
    data: List[dict]

class WeeklyStatistics(BaseModel):
    inv_type_code: str
    week_start_date: date
    week_end_date: date
    actual_occupancy_rate: float
    actual_vacancy_rate: float
    total_occupancy_rate: float
    total_vacancy_rate: float
    total_rooms: int
    total_available_days: int
    total_days: int = 7

class DataSnapshot(BaseModel):
    id: Optional[int] = None
    snapshot_date: date
    snapshot_time: Optional[datetime] = None
    description: Optional[str] = None
    status: str = "completed"
    total_records: int = 0
    created_by: str = "system"

class SnapshotComparison(BaseModel):
    from_snapshot: DataSnapshot
    to_snapshot: DataSnapshot
    changes_summary: dict
    room_type_changes: List[dict]

class DatabaseManager:
    def __init__(self):
        self.pool = None
    
    async def create_pool(self):
        if self.pool is None:
            self.pool = await asyncpg.create_pool(
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", "5432")),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "password"),
                database=os.getenv("DB_NAME", "hotel_management"),
                min_size=5,
                max_size=20
            )
    
    async def close_pool(self):
        if self.pool:
            await self.pool.close()
    
    async def get_connection(self):
        try:
            if self.pool is None:
                await self.create_pool()
            return self.pool
        except Exception as e:
            logger.error(f"❌ 獲取數據庫連接失敗: {str(e)}")
            raise HTTPException(status_code=503, detail=f"數據庫服務不可用: {str(e)}")

db_manager = DatabaseManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - 優雅處理數據庫連接
    try:
        await db_manager.create_pool()
        logger.info("✅ 數據庫連接池創建成功")
    except Exception as e:
        logger.warning(f"⚠️ 數據庫連接失敗，以無數據庫模式運行: {str(e)}")
        # 不阻止應用啟動，允許前端正常工作
    
    yield
    
    # Shutdown
    try:
        await db_manager.close_pool()
        logger.info("✅ 數據庫連接池已關閉")
    except Exception as e:
        logger.warning(f"⚠️ 關閉數據庫連接池時出錯: {str(e)}")

class HotelAPI:
    def __init__(self):
        self.base_url = "https://pms.shalom.com.tw/api/cm/channel/inventory/"
        self.echo_token = os.getenv("API_ECHO_TOKEN", "GD837Fjk3")
        self.password = os.getenv("API_PASSWORD", "mz9k8czQHqnFt8Q")
        self.username = os.getenv("API_USERNAME", "woorao")
    
    async def fetch_inventory_data(self, inv_type_code: str, start_date: str, end_date: str, hotel_id: str):
        params = {
            "echo_token": self.echo_token,
            "end_date": end_date,
            "hotel_code": hotel_id,  # 使用動態的 hotel_id
            "inv_type_code": inv_type_code,
            "password": self.password,
            "start_date": start_date,
            "timestamp": datetime.now().strftime("%Y-%m-%d+%H%%3A%M%%3A%S"),
            "username": self.username
        }
        
        logger.info(f"Making API request to {self.base_url} with params: {params}")
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(self.base_url, params=params) as response:
                    logger.info(f"API response status: {response.status}")
                    
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"API response data: {data}")
                        return data
                    else:
                        response_text = await response.text()
                        logger.error(f"API request failed with status {response.status}, response: {response_text}")
                        return None
            except Exception as e:
                logger.error(f"API request error: {str(e)}")
                return None

hotel_api = HotelAPI()

# ================================
# 快照系統核心功能函數
# ================================

async def create_data_snapshot(description: str = None) -> int:
    """創建數據快照"""
    pool = await db_manager.get_connection()
    today = datetime.now().date()
    
    async with pool.acquire() as conn:
        # 檢查今天是否已經有快照
        existing = await conn.fetchval(
            "SELECT id FROM data_snapshots WHERE snapshot_date = $1", today
        )
        
        if existing:
            logger.info(f"今天已存在快照 ID: {existing}")
            return existing
        
        async with conn.transaction():
            # 創建快照元數據
            snapshot_id = await conn.fetchval("""
                INSERT INTO data_snapshots (snapshot_date, description, status)
                VALUES ($1, $2, 'processing')
                RETURNING id
            """, today, description or f"自動快照 - {today}")
            
            # 複製當前庫存數據到快照表
            inventory_count = await conn.fetchval("""
                INSERT INTO inventory_snapshots 
                (snapshot_id, inv_type_code, hotel_id, date, quantity, status)
                SELECT $1, inv_type_code, hotel_id, date, quantity, status
                FROM inventory_data
                RETURNING (SELECT COUNT(*) FROM inventory_data)
            """, snapshot_id)
            
            # 複製當前週統計數據到快照表
            stats_count = await conn.fetchval("""
                INSERT INTO weekly_statistics_snapshots 
                (snapshot_id, inv_type_code, hotel_id, week_start_date, week_end_date,
                 actual_occupancy_rate, actual_vacancy_rate, total_occupancy_rate, 
                 total_vacancy_rate, total_rooms, total_available_days, total_days)
                SELECT $1, inv_type_code, hotel_id, week_start_date, week_end_date,
                       actual_occupancy_rate, actual_vacancy_rate, total_occupancy_rate,
                       total_vacancy_rate, total_rooms, total_available_days, total_days
                FROM weekly_statistics
                RETURNING (SELECT COUNT(*) FROM weekly_statistics)
            """, snapshot_id)
            
            total_records = (inventory_count or 0) + (stats_count or 0)
            
            # 更新快照狀態
            await conn.execute("""
                UPDATE data_snapshots 
                SET status = 'completed', total_records = $2
                WHERE id = $1
            """, snapshot_id, total_records)
            
            logger.info(f"✅ 創建快照成功 ID: {snapshot_id}, 記錄數: {total_records}")
            return snapshot_id

async def get_snapshots(limit: int = 10) -> List[dict]:
    """獲取快照列表"""
    pool = await db_manager.get_connection()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT * FROM latest_snapshot_summary 
            ORDER BY snapshot_date DESC 
            LIMIT $1
        """, limit)
        return [dict(row) for row in rows]

async def get_snapshot_by_id(snapshot_id: int) -> Optional[dict]:
    """根據ID獲取快照詳情"""
    pool = await db_manager.get_connection()
    async with pool.acquire() as conn:
        snapshot = await conn.fetchrow("""
            SELECT * FROM latest_snapshot_summary WHERE id = $1
        """, snapshot_id)
        
        if not snapshot:
            return None
            
        return dict(snapshot)

async def delete_snapshot(snapshot_id: int) -> bool:
    """刪除快照"""
    pool = await db_manager.get_connection()
    async with pool.acquire() as conn:
        result = await conn.execute("""
            DELETE FROM data_snapshots WHERE id = $1
        """, snapshot_id)
        
        # 檢查是否有記錄被刪除
        return result.split()[-1] != '0'

async def compare_snapshots(from_date: str, to_date: str) -> dict:
    """比較兩個快照之間的變化"""
    pool = await db_manager.get_connection()
    
    async with pool.acquire() as conn:
        # 獲取快照ID
        from_snapshot = await conn.fetchrow("""
            SELECT * FROM data_snapshots 
            WHERE snapshot_date = $1 AND status = 'completed'
        """, datetime.strptime(from_date, "%Y-%m-%d").date())
        
        to_snapshot = await conn.fetchrow("""
            SELECT * FROM data_snapshots 
            WHERE snapshot_date = $1 AND status = 'completed'
        """, datetime.strptime(to_date, "%Y-%m-%d").date())
        
        if not from_snapshot or not to_snapshot:
            raise HTTPException(status_code=404, detail="找不到指定日期的快照")
        
        # 比較週統計變化
        changes = await conn.fetch("""
            WITH from_stats AS (
                SELECT inv_type_code, hotel_id, week_start_date, 
                       actual_occupancy_rate, total_rooms
                FROM weekly_statistics_snapshots 
                WHERE snapshot_id = $1
            ),
            to_stats AS (
                SELECT inv_type_code, hotel_id, week_start_date,
                       actual_occupancy_rate, total_rooms
                FROM weekly_statistics_snapshots 
                WHERE snapshot_id = $2
            )
            SELECT 
                COALESCE(f.inv_type_code, t.inv_type_code) as inv_type_code,
                COALESCE(f.hotel_id, t.hotel_id) as hotel_id,
                COALESCE(f.week_start_date, t.week_start_date) as week_start_date,
                f.actual_occupancy_rate as from_occupancy,
                t.actual_occupancy_rate as to_occupancy,
                CASE 
                    WHEN f.actual_occupancy_rate IS NULL THEN 'new'
                    WHEN t.actual_occupancy_rate IS NULL THEN 'removed'
                    WHEN f.actual_occupancy_rate != t.actual_occupancy_rate THEN 'changed'
                    ELSE 'unchanged'
                END as change_type,
                (t.actual_occupancy_rate - f.actual_occupancy_rate) as occupancy_diff
            FROM from_stats f
            FULL OUTER JOIN to_stats t 
                ON f.inv_type_code = t.inv_type_code 
                AND f.hotel_id = t.hotel_id 
                AND f.week_start_date = t.week_start_date
            WHERE COALESCE(f.actual_occupancy_rate, 0) != COALESCE(t.actual_occupancy_rate, 0)
            ORDER BY change_type, inv_type_code, week_start_date
        """, from_snapshot['id'], to_snapshot['id'])
        
        changes_list = [dict(row) for row in changes]
        
        # 計算變化摘要
        summary = {
            "total_changes": len(changes_list),
            "new_records": len([c for c in changes_list if c['change_type'] == 'new']),
            "removed_records": len([c for c in changes_list if c['change_type'] == 'removed']),
            "modified_records": len([c for c in changes_list if c['change_type'] == 'changed']),
            "biggest_increase": None,
            "biggest_decrease": None
        }
        
        # 找出最大變化
        occupancy_changes = [c for c in changes_list if c['change_type'] == 'changed' and c['occupancy_diff']]
        if occupancy_changes:
            biggest_increase = max(occupancy_changes, key=lambda x: x['occupancy_diff'] or 0)
            biggest_decrease = min(occupancy_changes, key=lambda x: x['occupancy_diff'] or 0)
            
            summary["biggest_increase"] = biggest_increase if biggest_increase['occupancy_diff'] > 0 else None
            summary["biggest_decrease"] = biggest_decrease if biggest_decrease['occupancy_diff'] < 0 else None
        
        return {
            "comparison": {
                "period": {"from": from_date, "to": to_date},
                "from_snapshot": dict(from_snapshot),
                "to_snapshot": dict(to_snapshot),
                "summary": summary,
                "changes": changes_list
            }
        }

app = FastAPI(title="Hotel Management API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hotel Management API"}

@app.get("/ping")
async def ping():
    """最簡單的連接測試 - 不依賴任何外部服務"""
    return {
        "message": "pong", 
        "status": "🏕️ 蟬說露營區管理系統運行中",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/init-database")
async def init_database():
    """初始化數據庫表結構"""
    try:
        pool = await db_manager.get_connection()
        async with pool.acquire() as conn:
            # 創建房型表
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS room_types (
                    id SERIAL PRIMARY KEY,
                    inv_type_code VARCHAR(10) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    total_rooms INTEGER NOT NULL DEFAULT 0,
                    hotel_id VARCHAR(10) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(inv_type_code, hotel_id)
                )
            """)
            
            # 創建庫存數據表
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS inventory_data (
                    id SERIAL PRIMARY KEY,
                    inv_type_code VARCHAR(10) NOT NULL,
                    hotel_id VARCHAR(10) NOT NULL,
                    date DATE NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 0,
                    status VARCHAR(10) NOT NULL CHECK (status IN ('OPEN', 'CLOSE')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(inv_type_code, hotel_id, date)
                )
            """)
            
            # 創建週統計表
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS weekly_statistics (
                    id SERIAL PRIMARY KEY,
                    inv_type_code VARCHAR(10) NOT NULL,
                    hotel_id VARCHAR(10) NOT NULL,
                    week_start_date DATE NOT NULL,
                    week_end_date DATE NOT NULL,
                    actual_occupancy_rate DECIMAL(5,2),
                    actual_vacancy_rate DECIMAL(5,2),
                    total_occupancy_rate DECIMAL(5,2),
                    total_vacancy_rate DECIMAL(5,2),
                    total_rooms INTEGER NOT NULL,
                    total_available_days INTEGER NOT NULL,
                    total_days INTEGER NOT NULL DEFAULT 7,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(inv_type_code, hotel_id, week_start_date)
                )
            """)
            
            # 創建快照表
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS inventory_snapshots (
                    id SERIAL PRIMARY KEY,
                    snapshot_date DATE NOT NULL,
                    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('inventory', 'weekly_stats')),
                    data JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            logger.info("✅ 數據庫表結構初始化完成")
            return {
                "success": True,
                "message": "數據庫表結構初始化成功",
                "tables": ["room_types", "inventory_data", "weekly_statistics", "inventory_snapshots"]
            }
            
    except Exception as e:
        logger.error(f"❌ 數據庫初始化失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"數據庫初始化失敗: {str(e)}")

@app.get("/health")
async def health_check():
    """基礎健康檢查 - 不依賴數據庫"""
    try:
        # 基礎服務檢查
        basic_status = {
            "status": "healthy", 
            "service": "蟬說露營區管理系統",
            "timestamp": datetime.now().isoformat()
        }
        
        # 嘗試數據庫連接檢查（可選）
        try:
            pool = await db_manager.get_connection()
            async with pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            basic_status["database"] = "connected"
        except Exception as db_error:
            logger.warning(f"Database connection failed: {str(db_error)}")
            basic_status["database"] = "disconnected"
            basic_status["database_error"] = str(db_error)
        
        return basic_status
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {"status": "unhealthy", "error": str(e)}

@app.get("/room-types")
async def get_room_types(hotel_id: Optional[str] = Query(None, description="酒店ID，不指定則返回所有酒店的房型")):
    pool = await db_manager.get_connection()
    async with pool.acquire() as conn:
        if hotel_id:
            rows = await conn.fetch("SELECT * FROM room_types WHERE hotel_id = $1 ORDER BY inv_type_code", hotel_id)
        else:
            rows = await conn.fetch("SELECT * FROM room_types ORDER BY hotel_id, inv_type_code")
        
        # 添加酒店名稱
        result = []
        for row in rows:
            room_data = dict(row)
            room_data['hotel_name'] = get_hotel_name(room_data['hotel_id'])
            result.append(room_data)
        
        return result

# ===================
# 房間管理 API
# ===================

class RoomTypeUpdate(BaseModel):
    name: str
    total_rooms: int

class RoomTypeCreate(BaseModel):
    inv_type_code: str
    name: str
    total_rooms: int
    hotel_id: str

@app.put("/room-types/{room_id}")
async def update_room_type(room_id: int, room_update: RoomTypeUpdate):
    """更新房間類型信息"""
    try:
        pool = await db_manager.get_connection()
        async with pool.acquire() as conn:
            # 檢查房間是否存在
            existing_room = await conn.fetchrow("SELECT * FROM room_types WHERE id = $1", room_id)
            if not existing_room:
                raise HTTPException(status_code=404, detail="房間類型不存在")
            
            # 更新房間信息
            await conn.execute("""
                UPDATE room_types 
                SET name = $1, total_rooms = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            """, room_update.name, room_update.total_rooms, room_id)
            
            # 返回更新後的數據
            updated_room = await conn.fetchrow("SELECT * FROM room_types WHERE id = $1", room_id)
            room_data = dict(updated_room)
            room_data['hotel_name'] = get_hotel_name(room_data['hotel_id'])
            
            logger.info(f"房間類型已更新: ID={room_id}, 名稱={room_update.name}, 總數={room_update.total_rooms}")
            return room_data
            
    except Exception as e:
        logger.error(f"更新房間類型失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新房間類型失敗: {str(e)}")

@app.post("/room-types")
async def create_room_type(room_create: RoomTypeCreate):
    """創建新的房間類型"""
    try:
        pool = await db_manager.get_connection()
        async with pool.acquire() as conn:
            # 檢查房型代碼是否已存在於該酒店
            existing_room = await conn.fetchrow(
                "SELECT * FROM room_types WHERE inv_type_code = $1 AND hotel_id = $2", 
                room_create.inv_type_code, room_create.hotel_id
            )
            if existing_room:
                raise HTTPException(status_code=400, detail="該蟬說露營區已存在相同的房型代碼")
            
            # 創建新房間類型
            new_room = await conn.fetchrow("""
                INSERT INTO room_types (inv_type_code, name, total_rooms, hotel_id)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            """, room_create.inv_type_code, room_create.name, room_create.total_rooms, room_create.hotel_id)
            
            room_data = dict(new_room)
            room_data['hotel_name'] = get_hotel_name(room_data['hotel_id'])
            
            logger.info(f"新房間類型已創建: {room_create.inv_type_code} - {room_create.name}")
            return room_data
            
    except Exception as e:
        logger.error(f"創建房間類型失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"創建房間類型失敗: {str(e)}")

@app.delete("/room-types/{room_id}")
async def delete_room_type(room_id: int):
    """刪除房間類型"""
    try:
        pool = await db_manager.get_connection()
        async with pool.acquire() as conn:
            # 檢查房間是否存在
            existing_room = await conn.fetchrow("SELECT * FROM room_types WHERE id = $1", room_id)
            if not existing_room:
                raise HTTPException(status_code=404, detail="房間類型不存在")
            
            # 檢查是否有相關的庫存數據
            inventory_count = await conn.fetchval(
                "SELECT COUNT(*) FROM inventory_data WHERE inv_type_code = $1 AND hotel_id = $2",
                existing_room['inv_type_code'], existing_room['hotel_id']
            )
            
            if inventory_count > 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"無法刪除房間類型，存在 {inventory_count} 筆相關庫存數據。請先清理庫存數據。"
                )
            
            # 檢查是否有相關的週統計數據
            stats_count = await conn.fetchval(
                "SELECT COUNT(*) FROM weekly_statistics WHERE inv_type_code = $1 AND hotel_id = $2",
                existing_room['inv_type_code'], existing_room['hotel_id']
            )
            
            if stats_count > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"無法刪除房間類型，存在 {stats_count} 筆相關統計數據。請先清理統計數據。"
                )
            
            # 刪除房間類型
            await conn.execute("DELETE FROM room_types WHERE id = $1", room_id)
            
            logger.info(f"房間類型已刪除: ID={room_id}, 代碼={existing_room['inv_type_code']}")
            return {"success": True, "message": "房間類型已成功刪除"}
            
    except Exception as e:
        logger.error(f"刪除房間類型失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"刪除房間類型失敗: {str(e)}")

@app.post("/fetch-inventory/{inv_type_code}")
async def fetch_inventory_for_room_type(inv_type_code: str, start_date: str, end_date: str, hotel_id: str = Query(..., description="酒店ID")):
    pool = await db_manager.get_connection()
    
    try:
        logger.info(f"Fetching inventory data for {inv_type_code} (Hotel {hotel_id}) from {start_date} to {end_date}")
        data = await hotel_api.fetch_inventory_data(inv_type_code, start_date, end_date, hotel_id)
        
        logger.info(f"API response type: {type(data)}, data: {data}")
        
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO api_calls (start_date, end_date, inv_type_code, success) VALUES ($1, $2, $3, $4)",
                datetime.strptime(start_date, "%Y-%m-%d").date(),
                datetime.strptime(end_date, "%Y-%m-%d").date(),
                f"{hotel_id}-{inv_type_code}",
                data is not None
            )
            
            if data and isinstance(data, dict) and "data" in data:
                logger.info(f"Processing data: {data}")
                
                if data["data"] and len(data["data"]) > 0 and "availability" in data["data"][0]:
                    inventory_data = data["data"][0]["availability"]
                    logger.info(f"Found {len(inventory_data)} inventory items")
                    
                    for item in inventory_data:
                        await conn.execute("""
                            INSERT INTO inventory_data (inv_type_code, date, quantity, status, hotel_id)
                            VALUES ($1, $2, $3, $4, $5)
                            ON CONFLICT (inv_type_code, date, hotel_id) 
                            DO UPDATE SET quantity = $3, status = $4
                        """, inv_type_code, datetime.strptime(item["date"], "%Y-%m-%d").date(), 
                            item["quantity"], item["status"], hotel_id)
                    
                    return {"success": True, "message": f"Data fetched and stored for {inv_type_code}"}
                else:
                    logger.warning("No availability data found in API response")
                    return {"success": False, "message": "No availability data found in API response"}
            else:
                logger.warning(f"Invalid or empty API response: {data}")
                return {"success": False, "message": "Invalid or empty API response"}
                
    except Exception as e:
        logger.error(f"Error in fetch_inventory_for_room_type: {str(e)}")
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "INSERT INTO api_calls (start_date, end_date, inv_type_code, success, error_message) VALUES ($1, $2, $3, $4, $5)",
                    datetime.strptime(start_date, "%Y-%m-%d").date(),
                    datetime.strptime(end_date, "%Y-%m-%d").date(),
                    f"{hotel_id}-{inv_type_code}",
                    False,
                    str(e)
                )
        except Exception as db_error:
            logger.error(f"Database error while logging API call: {str(db_error)}")
        
        raise HTTPException(status_code=500, detail=f"API Error: {str(e)}")

async def _fetch_all_inventory_internal(start_date: str, end_date: str, hotel_id: Optional[str] = None):
    """內部函數：抽取所有酒店或特定酒店的庫存數據"""
    pool = await db_manager.get_connection()
    
    async with pool.acquire() as conn:
        if hotel_id:
            room_types = await conn.fetch("SELECT inv_type_code, hotel_id FROM room_types WHERE hotel_id = $1", hotel_id)
        else:
            room_types = await conn.fetch("SELECT inv_type_code, hotel_id FROM room_types")
    
    results = []
    for room_type in room_types:
        inv_type_code = room_type["inv_type_code"]
        room_hotel_id = room_type["hotel_id"]
        try:
            result = await fetch_inventory_for_room_type(inv_type_code, start_date, end_date, room_hotel_id)
            results.append({"inv_type_code": inv_type_code, "hotel_id": room_hotel_id, "result": result})
        except Exception as e:
            results.append({"inv_type_code": inv_type_code, "hotel_id": room_hotel_id, "error": str(e)})
    
    return results

@app.post("/fetch-all-inventory")
async def fetch_all_inventory(start_date: str, end_date: str, hotel_id: Optional[str] = Query(None, description="酒店ID，不指定則抽取所有酒店的庫存")):
    """公共API端點：抽取所有酒店或特定酒店的庫存數據"""
    results = await _fetch_all_inventory_internal(start_date, end_date, hotel_id)
    return {"results": results}

@app.post("/calculate-weekly-statistics/{inv_type_code}")
async def calculate_weekly_statistics(inv_type_code: str, week_start_date: str, hotel_id: str):
    pool = await db_manager.get_connection()
    
    try:
        week_start = datetime.strptime(week_start_date, "%Y-%m-%d").date()
        week_end = week_start + timedelta(days=6)
        
        async with pool.acquire() as conn:
            room_type_info = await conn.fetchrow(
                "SELECT total_rooms FROM room_types WHERE inv_type_code = $1 AND hotel_id = $2", 
                inv_type_code, hotel_id
            )
            
            if not room_type_info:
                raise HTTPException(status_code=404, detail="Room type not found")
            
            total_rooms = room_type_info["total_rooms"]
            
            inventory_data = await conn.fetch("""
                SELECT date, quantity, status 
                FROM inventory_data 
                WHERE inv_type_code = $1 AND hotel_id = $2 AND date BETWEEN $3 AND $4
                ORDER BY date
            """, inv_type_code, hotel_id, week_start, week_end)
            
            if not inventory_data:
                raise HTTPException(status_code=404, detail=f"No inventory data found for {inv_type_code} (Hotel {hotel_id}) in period {week_start} to {week_end}")
            
            total_available_rooms = 0
            total_occupied_rooms = 0
            available_days = 0
            total_rooms_all_days = 0
            
            for day_data in inventory_data:
                remaining_rooms = day_data["quantity"]
                status = day_data["status"]
                
                occupied_rooms = total_rooms - remaining_rooms
                total_occupied_rooms += occupied_rooms
                total_rooms_all_days += total_rooms
                
                if status == "OPEN":
                    total_available_rooms += total_rooms
                    available_days += 1
            
            actual_occupancy_rate = (total_occupied_rooms / total_available_rooms * 100) if total_available_rooms > 0 else 0
            actual_vacancy_rate = 100 - actual_occupancy_rate
            
            total_occupancy_rate = (total_occupied_rooms / total_rooms_all_days * 100) if total_rooms_all_days > 0 else 0
            total_vacancy_rate = 100 - total_occupancy_rate
            
            await conn.execute("""
                INSERT INTO weekly_statistics 
                (inv_type_code, week_start_date, week_end_date, actual_occupancy_rate, 
                 actual_vacancy_rate, total_occupancy_rate, total_vacancy_rate, 
                 total_rooms, total_available_days, total_days, hotel_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (inv_type_code, week_start_date, hotel_id)
                DO UPDATE SET 
                    week_end_date = $3,
                    actual_occupancy_rate = $4,
                    actual_vacancy_rate = $5,
                    total_occupancy_rate = $6,
                    total_vacancy_rate = $7,
                    total_rooms = $8,
                    total_available_days = $9,
                    total_days = $10
            """, inv_type_code, week_start, week_end,
                round(actual_occupancy_rate, 2), round(actual_vacancy_rate, 2),
                round(total_occupancy_rate, 2), round(total_vacancy_rate, 2),
                total_rooms, available_days, 7, hotel_id)
            
            return {
                "inv_type_code": inv_type_code,
                "hotel_id": hotel_id,
                "week_start_date": week_start,
                "week_end_date": week_end,
                "actual_occupancy_rate": round(actual_occupancy_rate, 2),
                "actual_vacancy_rate": round(actual_vacancy_rate, 2),
                "total_occupancy_rate": round(total_occupancy_rate, 2),
                "total_vacancy_rate": round(total_vacancy_rate, 2),
                "total_rooms": total_rooms,
                "total_available_days": available_days
            }
            
    except Exception as e:
        logger.error(f"Error calculating weekly statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/weekly-statistics", 
         summary="獲取週統計數據",
         description="""
獲取房型的週統計數據，包含以下統計指標：
- **實際入住率**: 已訂房數 / 總房間數（扣除壓房、公休日）
- **實際空房率**: (總房間數 - 已訂房數) / 總房間數（扣除壓房、公休日）  
- **入住率（含壓房＆公休）**: 已訂房數 / 總房間數（包含壓房、公休日）
- **空房率（含壓房＆公休）**: (總房間數 - 已訂房數) / 總房間數（包含壓房、公休日）

**使用方式:**
- 不指定參數: 返回所有房型的最新週統計
- 只指定房型: 返回特定房型的最新週統計  
- 只指定週數: 返回所有房型最近幾週的統計
- 指定房型+週數: 返回特定房型最近幾週的統計

結果按週開始日期降序排列（最新在前）
         """,
         response_description="週統計數據列表，包含房型資訊和各項統計指標")
async def get_weekly_statistics(
    inv_type_code: Optional[str] = Query(
        None, 
        description="房型代碼 (例如: A, B, C)，不指定則返回所有房型數據",
        examples={"example": {"value": "A"}}
    ),
    weeks: Optional[int] = Query(
        None, 
        description="查詢最近幾週的統計數據，不指定則返回所有數據",
        examples={"example": {"value": 4}},
        ge=1,
        le=52
    ),
    hotel_id: Optional[str] = Query(
        None,
        description="酒店ID，不指定則返回所有酒店的數據",
        examples={"example": {"value": "2436"}}
    )
):
    pool = await db_manager.get_connection()
    
    async with pool.acquire() as conn:
        if inv_type_code and weeks and hotel_id:
            # 特定房型 + 週數限制 + 特定酒店
            rows = await conn.fetch("""
                SELECT * FROM weekly_statistics 
                WHERE inv_type_code = $1 AND hotel_id = $2
                ORDER BY week_start_date DESC
                LIMIT $3
            """, inv_type_code, hotel_id, weeks)
        elif inv_type_code and weeks:
            # 特定房型 + 週數限制
            rows = await conn.fetch("""
                SELECT * FROM weekly_statistics 
                WHERE inv_type_code = $1 
                ORDER BY week_start_date DESC
                LIMIT $2
            """, inv_type_code, weeks)
        elif inv_type_code and hotel_id:
            # 特定房型 + 特定酒店
            rows = await conn.fetch("""
                SELECT * FROM weekly_statistics 
                WHERE inv_type_code = $1 AND hotel_id = $2
                ORDER BY week_start_date DESC
            """, inv_type_code, hotel_id)
        elif inv_type_code:
            # 只有特定房型 - 返回該房型的所有週統計
            rows = await conn.fetch("""
                SELECT * FROM weekly_statistics 
                WHERE inv_type_code = $1 
                ORDER BY week_start_date DESC
            """, inv_type_code)
        elif hotel_id and weeks:
            # 特定酒店 + 週數限制
            rows = await conn.fetch("""
                SELECT ws.*, rt.name as room_type_name
                FROM weekly_statistics ws
                JOIN room_types rt ON ws.inv_type_code = rt.inv_type_code AND ws.hotel_id = rt.hotel_id
                WHERE ws.hotel_id = $1
                ORDER BY ws.week_start_date DESC
                LIMIT $2
            """, hotel_id, weeks)
        elif hotel_id:
            # 只有特定酒店
            rows = await conn.fetch("""
                SELECT ws.*, rt.name as room_type_name
                FROM weekly_statistics ws
                JOIN room_types rt ON ws.inv_type_code = rt.inv_type_code AND ws.hotel_id = rt.hotel_id
                WHERE ws.hotel_id = $1
                ORDER BY ws.week_start_date DESC
            """, hotel_id)
        elif weeks:
            # 只有週數限制 - 返回所有房型最近幾週的統計
            rows = await conn.fetch("""
                SELECT ws.*, rt.name as room_type_name
                FROM weekly_statistics ws
                JOIN room_types rt ON ws.inv_type_code = rt.inv_type_code AND ws.hotel_id = rt.hotel_id
                WHERE ws.week_start_date >= (
                    SELECT week_start_date 
                    FROM weekly_statistics 
                    ORDER BY week_start_date DESC 
                    OFFSET $1 - 1 
                    LIMIT 1
                )
                ORDER BY ws.week_start_date DESC
            """, weeks)
        else:
            # 沒有篩選條件 - 返回所有房型的最新週統計
            rows = await conn.fetch("""
                SELECT * FROM latest_weekly_statistics 
                ORDER BY week_start_date DESC
            """)
        
        # 添加酒店名稱
        result = []
        for row in rows:
            data = dict(row)
            data['hotel_name'] = get_hotel_name(data['hotel_id'])
            result.append(data)
        return result

@app.post("/weekly-update")
async def weekly_update(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_weekly_update)
    return {"message": "Weekly update started in background"}

# ================================
# 快照管理 API 端點
# ================================

@app.post("/create-snapshot")
async def create_snapshot_endpoint(description: str = Query(None, description="快照描述")):
    """手動創建數據快照"""
    try:
        snapshot_id = await create_data_snapshot(description)
        return {
            "success": True,
            "message": "快照創建成功",
            "snapshot_id": snapshot_id
        }
    except Exception as e:
        logger.error(f"創建快照失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"創建快照失敗: {str(e)}")

@app.get("/snapshots")
async def get_snapshots_endpoint(limit: int = Query(10, description="返回快照數量", ge=1, le=100)):
    """獲取快照列表"""
    try:
        snapshots = await get_snapshots(limit)
        return {
            "success": True,
            "count": len(snapshots),
            "snapshots": snapshots
        }
    except Exception as e:
        logger.error(f"獲取快照列表失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取快照列表失敗: {str(e)}")

@app.get("/snapshots/{snapshot_id}")
async def get_snapshot_detail(snapshot_id: int):
    """獲取快照詳情"""
    try:
        snapshot = await get_snapshot_by_id(snapshot_id)
        if not snapshot:
            raise HTTPException(status_code=404, detail="找不到指定的快照")
        
        return {
            "success": True,
            "snapshot": snapshot
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取快照詳情失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取快照詳情失敗: {str(e)}")

@app.delete("/snapshots/{snapshot_id}")
async def delete_snapshot_endpoint(snapshot_id: int):
    """刪除快照"""
    try:
        success = await delete_snapshot(snapshot_id)
        if not success:
            raise HTTPException(status_code=404, detail="找不到指定的快照或快照已被刪除")
        
        return {
            "success": True,
            "message": f"快照 {snapshot_id} 已成功刪除"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"刪除快照失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"刪除快照失敗: {str(e)}")

# ================================
# 比較分析 API 端點
# ================================

@app.get("/compare-snapshots")
async def compare_snapshots_endpoint(
    from_date: str = Query(..., description="起始日期 (YYYY-MM-DD)"),
    to_date: str = Query(..., description="結束日期 (YYYY-MM-DD)")
):
    """比較兩個快照之間的變化"""
    try:
        # 驗證日期格式
        datetime.strptime(from_date, "%Y-%m-%d")
        datetime.strptime(to_date, "%Y-%m-%d")
        
        comparison = await compare_snapshots(from_date, to_date)
        return {
            "success": True,
            **comparison
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式不正確，請使用 YYYY-MM-DD 格式")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"比較快照失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"比較快照失敗: {str(e)}")

@app.get("/weekly-changes")
async def get_weekly_changes(
    weeks: int = Query(4, description="查看最近幾週的變化", ge=1, le=12),
    hotel_id: Optional[str] = Query(None, description="酒店ID，不指定則返回所有酒店")
):
    """獲取最近N週的變化趨勢"""
    try:
        snapshots = await get_snapshots(weeks + 1)  # 需要 n+1 個快照來比較 n 個週期
        
        if len(snapshots) < 2:
            return {
                "success": True,
                "message": "快照數據不足，無法進行比較分析",
                "available_snapshots": len(snapshots)
            }
        
        changes = []
        for i in range(len(snapshots) - 1):
            from_snapshot = snapshots[i + 1]  # 較舊的快照
            to_snapshot = snapshots[i]        # 較新的快照
            
            try:
                comparison = await compare_snapshots(
                    from_snapshot['snapshot_date'].strftime('%Y-%m-%d'),
                    to_snapshot['snapshot_date'].strftime('%Y-%m-%d')
                )
                changes.append({
                    "period": f"{from_snapshot['snapshot_date']} → {to_snapshot['snapshot_date']}",
                    "summary": comparison['comparison']['summary'],
                    "key_changes": comparison['comparison']['changes'][:5]  # 前5個變化
                })
            except Exception as e:
                logger.warning(f"跳過比較週期 {from_snapshot['snapshot_date']} → {to_snapshot['snapshot_date']}: {str(e)}")
                continue
        
        return {
            "success": True,
            "weeks_analyzed": len(changes),
            "period": f"過去 {weeks} 週",
            "changes": changes
        }
    except Exception as e:
        logger.error(f"獲取週變化失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取週變化失敗: {str(e)}")

# ================================
# Dashboard 專用 API 端點
# ================================

@app.get("/dashboard-summary")
async def get_dashboard_summary(hotel_id: Optional[str] = Query(None, description="酒店ID，不指定則返回所有酒店摘要")):
    """獲取Dashboard主頁摘要數據"""
    try:
        pool = await db_manager.get_connection()
        async with pool.acquire() as conn:
            # 基本統計
            hotel_filter = "WHERE hotel_id = $1" if hotel_id else ""
            params = [hotel_id] if hotel_id else []
            
            # 房型總數
            room_types_count = await conn.fetchval(f"""
                SELECT COUNT(*) FROM room_types {hotel_filter}
            """, *params)
            
            # 酒店總數（如果不指定hotel_id）
            hotels_count = 1 if hotel_id else await conn.fetchval("SELECT COUNT(DISTINCT hotel_id) FROM room_types")
            
            # 最新快照資訊
            latest_snapshot = await conn.fetchrow("""
                SELECT * FROM data_snapshots 
                WHERE status = 'completed' 
                ORDER BY snapshot_date DESC 
                LIMIT 1
            """)
            
            # 本週統計概覽
            today = datetime.now().date()
            current_monday = today - timedelta(days=today.weekday())
            
            weekly_stats = await conn.fetch(f"""
                SELECT 
                    inv_type_code,
                    hotel_id,
                    AVG(actual_occupancy_rate) as avg_occupancy,
                    COUNT(*) as weeks_count
                FROM weekly_statistics 
                WHERE week_start_date >= $1
                {" AND hotel_id = $2" if hotel_id else ""}
                GROUP BY inv_type_code, hotel_id
                ORDER BY avg_occupancy DESC
            """, current_monday, *(params if hotel_id else []))
            
            # 計算平均入住率
            avg_occupancy = 0
            if weekly_stats:
                avg_occupancy = sum(row['avg_occupancy'] or 0 for row in weekly_stats) / len(weekly_stats)
            
            # 找出表現最好和最差的房型
            best_performer = weekly_stats[0] if weekly_stats else None
            worst_performer = weekly_stats[-1] if weekly_stats else None
            
            return {
                "success": True,
                "summary": {
                    "total_hotels": hotels_count,
                    "total_room_types": room_types_count,
                    "avg_occupancy_rate": round(avg_occupancy, 2),
                    "data_period": f"本週起 ({current_monday})",
                    "best_performer": {
                        "room_type": best_performer['inv_type_code'] if best_performer else None,
                        "hotel_id": best_performer['hotel_id'] if best_performer else None,
                        "hotel_name": get_hotel_name(best_performer['hotel_id']) if best_performer else None,
                        "occupancy_rate": round(best_performer['avg_occupancy'] or 0, 2) if best_performer else 0
                    } if best_performer else None,
                    "worst_performer": {
                        "room_type": worst_performer['inv_type_code'] if worst_performer else None,
                        "hotel_id": worst_performer['hotel_id'] if worst_performer else None,
                        "hotel_name": get_hotel_name(worst_performer['hotel_id']) if worst_performer else None,
                        "occupancy_rate": round(worst_performer['avg_occupancy'] or 0, 2) if worst_performer else 0
                    } if worst_performer else None,
                },
                "latest_snapshot": dict(latest_snapshot) if latest_snapshot else None,
                "room_types_overview": [
                    {**dict(row), "hotel_name": get_hotel_name(row['hotel_id'])} 
                    for row in weekly_stats[:10]
                ]  # 前10個房型
            }
    except Exception as e:
        logger.error(f"獲取Dashboard摘要失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取Dashboard摘要失敗: {str(e)}")

@app.get("/room-type-trends/{inv_type_code}")
async def get_room_type_trends(
    inv_type_code: str, 
    hotel_id: str = Query(..., description="酒店ID"),
    weeks: int = Query(12, description="查看週數", ge=4, le=26)
):
    """獲取特定房型的趨勢分析"""
    try:
        pool = await db_manager.get_connection()
        async with pool.acquire() as conn:
            # 檢查房型是否存在
            room_type = await conn.fetchrow("""
                SELECT * FROM room_types 
                WHERE inv_type_code = $1 AND hotel_id = $2
            """, inv_type_code, hotel_id)
            
            if not room_type:
                raise HTTPException(status_code=404, detail="找不到指定的房型")
            
            # 獲取趨勢數據
            trends = await conn.fetch("""
                SELECT 
                    week_start_date,
                    week_end_date,
                    actual_occupancy_rate,
                    actual_vacancy_rate,
                    total_occupancy_rate,
                    total_vacancy_rate,
                    total_rooms,
                    total_available_days
                FROM weekly_statistics 
                WHERE inv_type_code = $1 AND hotel_id = $2
                ORDER BY week_start_date DESC
                LIMIT $3
            """, inv_type_code, hotel_id, weeks)
            
            trends_data = [dict(row) for row in trends]
            
            # 計算趨勢洞察
            if len(trends_data) >= 2:
                latest = trends_data[0]
                previous = trends_data[1]
                
                occupancy_change = (latest['actual_occupancy_rate'] or 0) - (previous['actual_occupancy_rate'] or 0)
                trend_direction = "上升" if occupancy_change > 0 else "下降" if occupancy_change < 0 else "穩定"
                
                # 找出最高和最低週
                occupancy_rates = [(t['actual_occupancy_rate'] or 0, t['week_start_date']) for t in trends_data]
                peak_week = max(occupancy_rates, key=lambda x: x[0]) if occupancy_rates else (0, None)
                lowest_week = min(occupancy_rates, key=lambda x: x[0]) if occupancy_rates else (0, None)
                
                insights = {
                    "trend_direction": trend_direction,
                    "occupancy_change": round(occupancy_change, 2),
                    "peak_week": {
                        "date": peak_week[1],
                        "occupancy_rate": round(peak_week[0], 2)
                    },
                    "lowest_week": {
                        "date": lowest_week[1],
                        "occupancy_rate": round(lowest_week[0], 2)
                    },
                    "average_occupancy": round(sum(t['actual_occupancy_rate'] or 0 for t in trends_data) / len(trends_data), 2)
                }
            else:
                insights = {
                    "trend_direction": "數據不足",
                    "occupancy_change": 0,
                    "peak_week": None,
                    "lowest_week": None,
                    "average_occupancy": trends_data[0]['actual_occupancy_rate'] if trends_data else 0
                }
            
            return {
                "success": True,
                "room_type": {**dict(room_type), "hotel_name": get_hotel_name(room_type['hotel_id'])},
                "period": f"過去 {weeks} 週",
                "data_points": trends_data,
                "insights": insights
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取房型趨勢失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取房型趨勢失敗: {str(e)}")

@app.get("/sales-status")
async def get_sales_status(
    hotel_id: Optional[str] = Query(None, description="露營區ID"),
    inv_type_code: Optional[str] = Query(None, description="房型代碼"),
    start_date: str = Query(..., description="開始日期 (YYYY-MM-DD)"),
    end_date: str = Query(..., description="結束日期 (YYYY-MM-DD)")
):
    """獲取房間銷售狀況詳細數據"""
    try:
        pool = await db_manager.get_connection()
        async with pool.acquire() as conn:
            # 構建查詢條件
            where_conditions = ["id.date BETWEEN $1 AND $2"]
            params = [start_date, end_date]
            param_count = 2
            
            if hotel_id:
                param_count += 1
                where_conditions.append(f"id.hotel_id = ${param_count}")
                params.append(hotel_id)
            
            if inv_type_code:
                param_count += 1
                where_conditions.append(f"id.inv_type_code = ${param_count}")
                params.append(inv_type_code)
            
            where_clause = " AND ".join(where_conditions)
            
            # 轉換日期字符串為日期對象
            from datetime import datetime
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
            
            # 更新參數列表，使用日期對象
            params[0] = start_date_obj
            params[1] = end_date_obj
            
            # 獲取詳細銷售數據
            sales_data = await conn.fetch(f"""
                SELECT 
                    id.date,
                    id.inv_type_code,
                    id.hotel_id,
                    rt.name as room_type_name,
                    rt.total_rooms,
                    id.quantity as available_rooms,
                    id.status,
                    (rt.total_rooms - id.quantity) as sold_rooms,
                    CASE 
                        WHEN rt.total_rooms > 0 THEN 
                            ROUND(((rt.total_rooms - id.quantity)::decimal / rt.total_rooms * 100), 2)
                        ELSE 0 
                    END as occupancy_rate
                FROM inventory_data id
                JOIN room_types rt ON id.inv_type_code = rt.inv_type_code AND id.hotel_id = rt.hotel_id
                WHERE {where_clause}
                ORDER BY id.date DESC, id.hotel_id, id.inv_type_code
            """, *params)
            
            # 計算統計摘要
            total_rooms = 0
            total_sold = 0
            total_available = 0
            daily_stats = {}
            
            for row in sales_data:
                date_key = row['date'].strftime('%Y-%m-%d')
                if date_key not in daily_stats:
                    daily_stats[date_key] = {
                        'date': date_key,
                        'total_rooms': 0,
                        'sold_rooms': 0,
                        'available_rooms': 0,
                        'occupancy_rate': 0
                    }
                
                daily_stats[date_key]['total_rooms'] += row['total_rooms']
                daily_stats[date_key]['sold_rooms'] += row['sold_rooms']
                daily_stats[date_key]['available_rooms'] += row['available_rooms']
                
                total_rooms += row['total_rooms']
                total_sold += row['sold_rooms']
                total_available += row['available_rooms']
            
            # 計算每日入住率
            for date_key in daily_stats:
                if daily_stats[date_key]['total_rooms'] > 0:
                    daily_stats[date_key]['occupancy_rate'] = round(
                        (daily_stats[date_key]['sold_rooms'] / daily_stats[date_key]['total_rooms']) * 100, 2
                    )
            
            # 整體統計
            avg_occupancy_rate = round((total_sold / total_rooms * 100), 2) if total_rooms > 0 else 0
            
            # 獲取房型表現排名
            room_type_performance = await conn.fetch(f"""
                SELECT 
                    id.inv_type_code,
                    id.hotel_id,
                    rt.name as room_type_name,
                    AVG(rt.total_rooms - id.quantity) as avg_sold_rooms,
                    AVG(rt.total_rooms) as avg_total_rooms,
                    ROUND(AVG((rt.total_rooms - id.quantity)::decimal / rt.total_rooms * 100), 2) as avg_occupancy_rate
                FROM inventory_data id
                JOIN room_types rt ON id.inv_type_code = rt.inv_type_code AND id.hotel_id = rt.hotel_id
                WHERE {where_clause}
                GROUP BY id.inv_type_code, id.hotel_id, rt.name
                ORDER BY avg_occupancy_rate DESC
            """, *params)
            
            return {
                "success": True,
                "period": {
                    "start_date": start_date,
                    "end_date": end_date
                },
                "summary": {
                    "total_rooms": total_rooms,
                    "total_sold": total_sold,
                    "total_available": total_available,
                    "avg_occupancy_rate": avg_occupancy_rate,
                    "total_days": len(daily_stats)
                },
                "daily_data": sorted(daily_stats.values(), key=lambda x: x['date']),
                "detailed_data": [
                    {**dict(row), "hotel_name": get_hotel_name(row['hotel_id'])} 
                    for row in sales_data
                ],
                "room_type_performance": [
                    {**dict(row), "hotel_name": get_hotel_name(row['hotel_id'])} 
                    for row in room_type_performance
                ]
            }
    except Exception as e:
        logger.error(f"獲取銷售狀況失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取銷售狀況失敗: {str(e)}")

@app.get("/dashboard-charts")
async def get_dashboard_charts(
    hotel_id: Optional[str] = Query(None, description="酒店ID"),
    weeks: int = Query(8, description="查看週數", ge=4, le=26)
):
    """獲取Dashboard圖表數據"""
    try:
        pool = await db_manager.get_connection()
        async with pool.acquire() as conn:
            hotel_filter = "AND hotel_id = $2" if hotel_id else ""
            params = [weeks] + ([hotel_id] if hotel_id else [])
            
            # 週入住率趨勢圖數據
            if hotel_id:
                occupancy_trends = await conn.fetch("""
                    SELECT 
                        week_start_date,
                        AVG(actual_occupancy_rate) as avg_occupancy,
                        COUNT(*) as room_types_count
                    FROM weekly_statistics 
                    WHERE week_start_date >= CURRENT_DATE - INTERVAL '1 week' * $1
                    AND hotel_id = $2
                    GROUP BY week_start_date
                    ORDER BY week_start_date
                """, weeks, hotel_id)
            else:
                occupancy_trends = await conn.fetch("""
                    SELECT 
                        week_start_date,
                        AVG(actual_occupancy_rate) as avg_occupancy,
                        COUNT(*) as room_types_count
                    FROM weekly_statistics 
                    WHERE week_start_date >= CURRENT_DATE - INTERVAL '1 week' * $1
                    GROUP BY week_start_date
                    ORDER BY week_start_date
                """, weeks)
            
            # 房型表現熱力圖數據
            if hotel_id:
                room_performance = await conn.fetch("""
                    SELECT 
                        inv_type_code,
                        hotel_id,
                        week_start_date,
                        actual_occupancy_rate
                    FROM weekly_statistics 
                    WHERE week_start_date >= CURRENT_DATE - INTERVAL '1 week' * $1
                    AND hotel_id = $2
                    ORDER BY inv_type_code, week_start_date
                """, weeks, hotel_id)
            else:
                room_performance = await conn.fetch("""
                    SELECT 
                        inv_type_code,
                        hotel_id,
                        week_start_date,
                        actual_occupancy_rate
                    FROM weekly_statistics 
                    WHERE week_start_date >= CURRENT_DATE - INTERVAL '1 week' * $1
                    ORDER BY inv_type_code, week_start_date
                """, weeks)
            
            # 酒店對比數據（如果沒有指定hotel_id）
            hotel_comparison = []
            if not hotel_id:
                hotel_comparison = await conn.fetch("""
                    SELECT 
                        hotel_id,
                        AVG(actual_occupancy_rate) as avg_occupancy,
                        COUNT(*) as total_weeks,
                        COUNT(DISTINCT inv_type_code) as room_types_count
                    FROM weekly_statistics 
                    WHERE week_start_date >= CURRENT_DATE - INTERVAL '1 week' * $1
                    GROUP BY hotel_id
                    ORDER BY avg_occupancy DESC
                """, weeks)
            
            return {
                "success": True,
                "charts": {
                    "occupancy_trends": [dict(row) for row in occupancy_trends],
                    "room_performance_heatmap": [
                        {**dict(row), "hotel_name": get_hotel_name(row['hotel_id'])} 
                        for row in room_performance
                    ],
                    "hotel_comparison": [
                        {**dict(row), "hotel_name": get_hotel_name(row['hotel_id'])} 
                        for row in hotel_comparison
                    ] if not hotel_id else [],
                },
                "metadata": {
                    "period": f"過去 {weeks} 週",
                    "hotel_id": hotel_id,
                    "data_points": len(occupancy_trends)
                }
            }
    except Exception as e:
        logger.error(f"獲取Dashboard圖表數據失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取Dashboard圖表數據失敗: {str(e)}")

async def run_weekly_update():
    today = datetime.now().date()
    start_date = today
    end_date = today + timedelta(days=180)  # 6個月
    
    logger.info(f"Starting weekly update for period: {start_date} to {end_date}")
    
    # 🎯 第一步：創建數據快照（在更新前保存當前狀態）
    try:
        snapshot_id = await create_data_snapshot(f"週更新前快照 - {today}")
        logger.info(f"📸 自動快照創建成功 ID: {snapshot_id}")
    except Exception as e:
        logger.error(f"⚠️ 快照創建失敗: {str(e)}, 繼續執行更新...")
    
    # 第二步：先抽取所有酒店的庫存數據
    await _fetch_all_inventory_internal(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
    
    pool = await db_manager.get_connection()
    async with pool.acquire() as conn:
        # 只取有庫存數據的酒店和房型
        room_types_with_data = await conn.fetch("""
            SELECT DISTINCT rt.inv_type_code, rt.hotel_id 
            FROM room_types rt
            JOIN inventory_data id ON rt.inv_type_code = id.inv_type_code AND rt.hotel_id = id.hotel_id
            ORDER BY rt.hotel_id, rt.inv_type_code
        """)
        
        if not room_types_with_data:
            logger.warning("No room types with inventory data found, skipping weekly statistics calculation")
            return
        
        logger.info(f"Found {len(room_types_with_data)} room types with inventory data for statistics calculation")
    
    current_monday = today - timedelta(days=today.weekday())
    success_count = 0
    error_count = 0
    
    # 計算過去12週 + 未來14週，以當前週為中心
    for i in range(-12, 14):  # 過去12週到未來14週
        week_start = current_monday + timedelta(weeks=i)
        
        for room_type in room_types_with_data:
            inv_type_code = room_type["inv_type_code"]
            hotel_id = room_type["hotel_id"]
            try:
                await calculate_weekly_statistics(inv_type_code, week_start.strftime("%Y-%m-%d"), hotel_id)
                logger.info(f"✅ Calculated statistics for {inv_type_code} (Hotel {hotel_id}), week {week_start}")
                success_count += 1
            except Exception as e:
                logger.error(f"❌ Error calculating statistics for {inv_type_code} (Hotel {hotel_id}), week {week_start}: {str(e)}")
                error_count += 1
    
    logger.info(f"Weekly update completed: {success_count} successful, {error_count} errors")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)