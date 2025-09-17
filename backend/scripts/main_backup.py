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
        if self.pool is None:
            await self.create_pool()
        return self.pool

db_manager = DatabaseManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db_manager.create_pool()
    yield
    # Shutdown
    await db_manager.close_pool()

class HotelAPI:
    def __init__(self):
        self.base_url = "https://pms.shalom.com.tw/api/cm/channel/inventory/"
        self.echo_token = os.getenv("API_ECHO_TOKEN", "GD837Fjk3")
        self.hotel_code = os.getenv("API_HOTEL_CODE", "2436")
        self.password = os.getenv("API_PASSWORD", "mz9k8czQHqnFt8Q")
        self.username = os.getenv("API_USERNAME", "woorao")
    
    async def fetch_inventory_data(self, inv_type_code: str, start_date: str, end_date: str):
        params = {
            "echo_token": self.echo_token,
            "end_date": end_date,
            "hotel_code": self.hotel_code,
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

@app.get("/health")
async def health_check():
    try:
        pool = await db_manager.get_connection()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.get("/room-types")
async def get_room_types():
    pool = await db_manager.get_connection()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM room_types ORDER BY inv_type_code")
        return [dict(row) for row in rows]

@app.post("/fetch-inventory/{inv_type_code}")
async def fetch_inventory_for_room_type(inv_type_code: str, start_date: str, end_date: str):
    pool = await db_manager.get_connection()
    
    try:
        logger.info(f"Fetching inventory data for {inv_type_code} from {start_date} to {end_date}")
        data = await hotel_api.fetch_inventory_data(inv_type_code, start_date, end_date)
        
        logger.info(f"API response type: {type(data)}, data: {data}")
        
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO api_calls (start_date, end_date, inv_type_code, success) VALUES ($1, $2, $3, $4)",
                datetime.strptime(start_date, "%Y-%m-%d").date(),
                datetime.strptime(end_date, "%Y-%m-%d").date(),
                inv_type_code,
                data is not None
            )
            
            if data and isinstance(data, dict) and "data" in data:
                logger.info(f"Processing data: {data}")
                
                if data["data"] and len(data["data"]) > 0 and "availability" in data["data"][0]:
                    inventory_data = data["data"][0]["availability"]
                    logger.info(f"Found {len(inventory_data)} inventory items")
                    
                    for item in inventory_data:
                        await conn.execute("""
                            INSERT INTO inventory_data (inv_type_code, date, quantity, status)
                            VALUES ($1, $2, $3, $4)
                            ON CONFLICT (inv_type_code, date) 
                            DO UPDATE SET quantity = $3, status = $4
                        """, inv_type_code, datetime.strptime(item["date"], "%Y-%m-%d").date(), 
                            item["quantity"], item["status"])
                    
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
                    inv_type_code,
                    False,
                    str(e)
                )
        except Exception as db_error:
            logger.error(f"Database error while logging API call: {str(db_error)}")
        
        raise HTTPException(status_code=500, detail=f"API Error: {str(e)}")

@app.post("/fetch-all-inventory")
async def fetch_all_inventory(start_date: str, end_date: str):
    pool = await db_manager.get_connection()
    
    async with pool.acquire() as conn:
        room_types = await conn.fetch("SELECT inv_type_code FROM room_types")
    
    results = []
    for room_type in room_types:
        inv_type_code = room_type["inv_type_code"]
        try:
            result = await fetch_inventory_for_room_type(inv_type_code, start_date, end_date)
            results.append({"inv_type_code": inv_type_code, "result": result})
        except Exception as e:
            results.append({"inv_type_code": inv_type_code, "error": str(e)})
    
    return {"results": results}

@app.post("/calculate-weekly-statistics/{inv_type_code}")
async def calculate_weekly_statistics(inv_type_code: str, week_start_date: str):
    pool = await db_manager.get_connection()
    
    try:
        week_start = datetime.strptime(week_start_date, "%Y-%m-%d").date()
        week_end = week_start + timedelta(days=6)
        
        async with pool.acquire() as conn:
            room_type_info = await conn.fetchrow(
                "SELECT total_rooms FROM room_types WHERE inv_type_code = $1", 
                inv_type_code
            )
            
            if not room_type_info:
                raise HTTPException(status_code=404, detail="Room type not found")
            
            total_rooms = room_type_info["total_rooms"]
            
            inventory_data = await conn.fetch("""
                SELECT date, quantity, status 
                FROM inventory_data 
                WHERE inv_type_code = $1 AND date BETWEEN $2 AND $3
                ORDER BY date
            """, inv_type_code, week_start, week_end)
            
            if not inventory_data:
                raise HTTPException(status_code=404, detail="No inventory data found for this period")
            
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
                 total_rooms, total_available_days, total_days)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (inv_type_code, week_start_date)
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
                total_rooms, available_days, 7)
            
            return {
                "inv_type_code": inv_type_code,
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
    )
):
    pool = await db_manager.get_connection()
    
    async with pool.acquire() as conn:
        if inv_type_code and weeks:
            # 特定房型 + 週數限制
            rows = await conn.fetch("""
                SELECT * FROM weekly_statistics 
                WHERE inv_type_code = $1 
                ORDER BY week_start_date DESC
                LIMIT $2
            """, inv_type_code, weeks)
        elif inv_type_code:
            # 只有特定房型 - 返回該房型的所有週統計
            rows = await conn.fetch("""
                SELECT * FROM weekly_statistics 
                WHERE inv_type_code = $1 
                ORDER BY week_start_date DESC
            """, inv_type_code)
        elif weeks:
            # 只有週數限制 - 返回所有房型最近幾週的統計
            rows = await conn.fetch("""
                SELECT ws.*, rt.name as room_type_name
                FROM weekly_statistics ws
                JOIN room_types rt ON ws.inv_type_code = rt.inv_type_code
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
        
        return [dict(row) for row in rows]

@app.post("/weekly-update")
async def weekly_update(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_weekly_update)
    return {"message": "Weekly update started in background"}

async def run_weekly_update():
    today = datetime.now().date()
    start_date = today
    end_date = today + timedelta(days=180)  # 6個月
    
    logger.info(f"Starting weekly update for period: {start_date} to {end_date}")
    
    await fetch_all_inventory(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
    
    pool = await db_manager.get_connection()
    async with pool.acquire() as conn:
        room_types = await conn.fetch("SELECT inv_type_code FROM room_types")
    
    current_monday = today - timedelta(days=today.weekday())
    
    for i in range(26):  # 26週 = 6個月
        week_start = current_monday + timedelta(weeks=i)
        
        for room_type in room_types:
            inv_type_code = room_type["inv_type_code"]
            try:
                await calculate_weekly_statistics(inv_type_code, week_start.strftime("%Y-%m-%d"))
                logger.info(f"Calculated statistics for {inv_type_code}, week {week_start}")
            except Exception as e:
                logger.error(f"Error calculating statistics for {inv_type_code}, week {week_start}: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)