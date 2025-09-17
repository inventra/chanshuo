#!/usr/bin/env python3
"""
修復日期問題的腳本：
1. 清除未來日期的錯誤數據
2. 重新運行 weekly-update 生成正確的數據
"""

import asyncio
import asyncpg
import os
from datetime import datetime, date
from dotenv import load_dotenv

async def fix_date_issues():
    load_dotenv()
    
    # 資料庫連接參數
    DATABASE_URL = f"postgresql://{os.getenv('DB_USER', 'postgres')}:{os.getenv('DB_PASSWORD', '1234')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'hotel_inventory')}"
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print('🔗 數據庫連接成功')
        
        today = datetime.now().date()
        print(f"📅 今天的日期: {today}")
        
        # 1. 檢查現有的錯誤數據
        future_data = await conn.fetchval("""
            SELECT COUNT(*) FROM weekly_statistics 
            WHERE week_start_date > CURRENT_DATE
        """)
        print(f"🔍 發現 {future_data} 筆未來日期的錯誤數據")
        
        # 2. 刪除所有週統計數據（重新開始）
        deleted_stats = await conn.execute("DELETE FROM weekly_statistics")
        print(f"🗑️ 已清除所有週統計數據")
        
        # 3. 刪除所有庫存數據（因為日期範圍也可能有問題）
        deleted_inventory = await conn.execute("DELETE FROM inventory_data")
        print(f"🗑️ 已清除所有庫存數據")
        
        # 4. 也清除快照數據（因為包含錯誤數據）
        deleted_snapshots = await conn.execute("DELETE FROM inventory_snapshots")
        deleted_stats_snapshots = await conn.execute("DELETE FROM weekly_statistics_snapshots")
        deleted_data_snapshots = await conn.execute("DELETE FROM data_snapshots")
        print(f"🗑️ 已清除所有快照數據")
        
        print("✅ 數據清理完成！")
        print("📋 下一步請手動執行：")
        print("   1. 訪問: http://localhost:8000/weekly-update")
        print("   2. 等待數據重新生成完成")
        print("   3. 重新整理前端頁面查看修復結果")
        
    except Exception as e:
        print(f'❌ 錯誤: {e}')
    finally:
        if 'conn' in locals():
            await conn.close()

if __name__ == "__main__":
    asyncio.run(fix_date_issues())
