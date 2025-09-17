import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def fix_database():
    """修復資料庫中缺少的表格和索引"""
    
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
        
        # 讀取修復SQL檔案
        with open('fix_weekly_statistics.sql', 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # 分割SQL命令
        commands = []
        current_command = []
        in_function = False
        
        for line in sql_content.split('\n'):
            line = line.strip()
            
            # 跳過註解和空行
            if not line or line.startswith('--'):
                continue
            
            # 檢測函數開始
            if 'RETURNS TRIGGER AS $$' in line:
                in_function = True
            
            current_command.append(line)
            
            # 函數結束標記
            if in_function and line == "$$ language 'plpgsql';":
                in_function = False
                command = ' '.join(current_command)
                commands.append(command)
                current_command = []
            # 普通命令以分號結尾
            elif not in_function and line.endswith(';'):
                command = ' '.join(current_command)
                if command.strip():
                    commands.append(command)
                current_command = []
        
        # 如果還有未完成的命令
        if current_command:
            command = ' '.join(current_command)
            if command.strip():
                commands.append(command)
        
        print(f"📋 準備執行 {len(commands)} 個SQL命令...")
        
        # 執行每個SQL命令
        for i, command in enumerate(commands, 1):
            try:
                # 跳過空命令
                if not command.strip():
                    continue
                    
                await conn.execute(command)
                print(f"✅ 命令 {i}/{len(commands)} 執行成功")
                
            except Exception as e:
                print(f"⚠️  命令 {i}/{len(commands)} 執行失敗: {str(e)}")
                print(f"命令內容: {command[:100]}...")
                continue
        
        # 檢查表格是否創建成功
        print("\n🔍 檢查表格創建狀況...")
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        print(f"✅ 資料庫中共有 {len(tables)} 個表格:")
        for table in tables:
            print(f"   📋 {table['table_name']}")
        
        # 檢查 weekly_statistics 表格
        weekly_stats_exists = any(t['table_name'] == 'weekly_statistics' for t in tables)
        if weekly_stats_exists:
            print("✅ weekly_statistics 表格已成功創建!")
        else:
            print("❌ weekly_statistics 表格仍然缺失")
        
        await conn.close()
        print("\n🎉 資料庫修復完成！")
        
    except Exception as e:
        print(f"❌ 資料庫連接失敗: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 開始修復資料庫...")
    success = asyncio.run(fix_database())
    if success:
        print("✅ 修復完成，可以重新啟動API服務了")
    else:
        print("❌ 修復失敗，請檢查資料庫連線設定")