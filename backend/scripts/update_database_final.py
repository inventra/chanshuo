import asyncio
import asyncpg
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

async def update_database_final():
    """最終版本：更新資料庫結構，支援多酒店相同房型代碼"""
    
    connection_params = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', '5432')),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'password'),
        'database': os.getenv('DB_NAME', 'zeabur')
    }
    
    try:
        # 連接到資料庫
        conn = await asyncpg.connect(**connection_params)
        print(f"✅ 成功連接到資料庫: {connection_params['host']}:{connection_params['port']}")
        
        # 步驟1: 移除所有約束
        print("🔗 移除所有約束...")
        await conn.execute("ALTER TABLE inventory_data DROP CONSTRAINT IF EXISTS inventory_data_inv_type_code_fkey")
        await conn.execute("ALTER TABLE weekly_statistics DROP CONSTRAINT IF EXISTS weekly_statistics_inv_type_code_fkey")
        await conn.execute("ALTER TABLE room_types DROP CONSTRAINT IF EXISTS room_types_inv_type_code_key")
        await conn.execute("ALTER TABLE inventory_data DROP CONSTRAINT IF EXISTS inventory_data_inv_type_code_date_key")
        await conn.execute("ALTER TABLE weekly_statistics DROP CONSTRAINT IF EXISTS weekly_statistics_inv_type_code_week_start_date_key")
        print("✅ 約束已移除")
        
        # 步驟2: 清空所有相關資料
        print("🗑️  清空資料...")
        await conn.execute("DELETE FROM weekly_statistics")
        await conn.execute("DELETE FROM inventory_data") 
        await conn.execute("DELETE FROM room_types")
        print("✅ 資料清空完成")
        
        # 步驟3: 重設序列號
        await conn.execute("ALTER SEQUENCE room_types_id_seq RESTART WITH 1")
        
        # 步驟4: 添加新的複合唯一約束
        print("🔧 添加新的約束條件...")
        await conn.execute("""
            ALTER TABLE room_types 
            ADD CONSTRAINT room_types_inv_type_code_hotel_id_key 
            UNIQUE(inv_type_code, hotel_id)
        """)
        
        # 步驟5: 讀取 Excel 資料並插入新的房型資料
        print("📖 讀取 Excel 房型資料...")
        df = pd.read_excel('房間資訊.xlsx')
        
        print(f"📝 插入 {len(df)} 筆房型資料...")
        for _, row in df.iterrows():
            await conn.execute("""
                INSERT INTO room_types (inv_type_code, name, total_rooms, hotel_id)
                VALUES ($1, $2, $3, $4)
            """, row['inv_type_c'], row['name'], row['total_room'], str(row['hotel_id']))
            
            print(f"   ✅ Hotel {row['hotel_id']}: {row['inv_type_c']} - {row['name']} ({row['total_room']}間)")
        
        # 步驟6: 為其他表格添加約束
        print("🔧 添加其他表格約束...")
        
        # 6.1 inventory_data 約束
        await conn.execute("""
            ALTER TABLE inventory_data 
            ADD CONSTRAINT inventory_data_inv_type_code_date_hotel_id_key 
            UNIQUE(inv_type_code, date, hotel_id)
        """)
        
        # 6.2 weekly_statistics 約束
        await conn.execute("""
            ALTER TABLE weekly_statistics 
            ADD CONSTRAINT weekly_statistics_inv_type_code_week_start_date_hotel_id_key 
            UNIQUE(inv_type_code, week_start_date, hotel_id)
        """)
        
        # 步驟7: 更新視圖
        print("🔄 更新視圖...")
        await conn.execute("DROP VIEW IF EXISTS latest_weekly_statistics")
        await conn.execute("""
            CREATE VIEW latest_weekly_statistics AS
            SELECT 
                ws.*,
                rt.name as room_type_name
            FROM weekly_statistics ws
            JOIN room_types rt ON ws.inv_type_code = rt.inv_type_code 
                               AND ws.hotel_id = rt.hotel_id
            WHERE ws.week_start_date = (
                SELECT MAX(week_start_date) 
                FROM weekly_statistics ws2 
                WHERE ws2.inv_type_code = ws.inv_type_code 
                  AND ws2.hotel_id = ws.hotel_id
            )
        """)
        print("✅ 視圖更新完成")
        
        # 步驟8: 檢查更新結果
        print("\n🔍 檢查更新結果...")
        room_types = await conn.fetch("SELECT * FROM room_types ORDER BY hotel_id, inv_type_code")
        
        print(f"✅ 總共 {len(room_types)} 筆房型資料:")
        current_hotel = None
        for room in room_types:
            if current_hotel != room['hotel_id']:
                current_hotel = room['hotel_id']
                print(f"\n🏨 Hotel {room['hotel_id']}:")
            print(f"   {room['inv_type_code']}: {room['name']} ({room['total_rooms']}間)")
        
        # 步驟9: 顯示每個酒店的房型統計
        hotels = await conn.fetch("""
            SELECT hotel_id, COUNT(*) as room_type_count, SUM(total_rooms) as total_rooms
            FROM room_types 
            GROUP BY hotel_id 
            ORDER BY hotel_id
        """)
        
        print(f"\n📊 酒店統計:")
        for hotel in hotels:
            print(f"   🏨 Hotel {hotel['hotel_id']}: {hotel['room_type_count']} 種房型, 共 {hotel['total_rooms']} 間房")
        
        await conn.close()
        print("\n🎉 資料庫更新完成！")
        
    except Exception as e:
        print(f"❌ 資料庫更新失敗: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 開始最終資料庫更新...")
    success = asyncio.run(update_database_final())
    if success:
        print("✅ 資料庫更新完成，可以開始修改 API 代碼")
    else:
        print("❌ 更新失敗，請檢查錯誤訊息")
