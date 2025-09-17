import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def init_database():
    """初始化資料庫表格和數據"""
    
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
        
        # 讀取SQL檔案
        with open('schema.sql', 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # 分割SQL命令（排除註解和空行）
        commands = []
        current_command = []
        
        for line in sql_content.split('\n'):
            line = line.strip()
            
            # 跳過註解和空行
            if not line or line.startswith('--'):
                continue
                
            # 跳過資料庫創建和使用命令（雲端資料庫不需要）
            if line.startswith('CREATE DATABASE') or line.startswith('\\c'):
                continue
            
            current_command.append(line)
            
            # 如果行以分號結尾，表示一個完整的命令
            if line.endswith(';'):
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
                
            except asyncpg.exceptions.DuplicateTableError:
                print(f"⚠️  命令 {i}/{len(commands)} - 表格已存在，跳過")
                continue
            except asyncpg.exceptions.DuplicateObjectError:
                print(f"⚠️  命令 {i}/{len(commands)} - 物件已存在，跳過")
                continue
            except Exception as e:
                print(f"❌ 命令 {i}/{len(commands)} 執行失敗: {str(e)}")
                print(f"失敗的命令: {command[:100]}...")
                continue
        
        # 檢查表格是否創建成功
        print("\n🔍 檢查表格創建狀況...")
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        print(f"✅ 成功創建 {len(tables)} 個表格:")
        for table in tables:
            print(f"   📋 {table['table_name']}")
        
        # 檢查房型數據
        room_count = await conn.fetchval("SELECT COUNT(*) FROM room_types")
        print(f"✅ 房型數據: {room_count} 筆")
        
        await conn.close()
        print("\n🎉 資料庫初始化完成！")
        
    except asyncpg.exceptions.InvalidCatalogNameError:
        print(f"❌ 資料庫 '{connection_params['database']}' 不存在")
        return False
    except asyncpg.exceptions.InvalidPasswordError:
        print("❌ 資料庫密碼錯誤")
        return False
    except Exception as e:
        print(f"❌ 資料庫連接失敗: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 開始初始化資料庫...")
    success = asyncio.run(init_database())
    if success:
        print("✅ 初始化完成，可以啟動API服務了")
    else:
        print("❌ 初始化失敗，請檢查資料庫連線設定")