#!/bin/bash

# 蟬說露營區管理系統 - 後端啟動腳本

echo "🏕️ 蟬說露營區管理系統 - 後端啟動中..."
echo ""

# 檢查Python環境
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安裝，請先安裝Python3"
    exit 1
fi

# 檢查是否在backend目錄
if [ ! -f "requirements.txt" ]; then
    echo "❌ 請在backend目錄下執行此腳本"
    exit 1
fi

# 檢查並安裝依賴
echo "📦 檢查Python依賴..."
if [ ! -d "venv" ]; then
    echo "🔧 創建虛擬環境..."
    python3 -m venv venv
fi

echo "🔗 激活虛擬環境..."
source venv/bin/activate

echo "📥 安裝/更新依賴包..."
pip install -r requirements.txt

# 檢查環境變量文件
if [ ! -f ".env" ]; then
    echo "⚠️ 未找到.env文件，創建示例配置..."
    cat > .env << EOL
# 資料庫配置
DATABASE_URL=postgresql://username:password@localhost/database_name

# API配置
API_HOTEL_CODE=2436
API_USERNAME=your_username
API_PASSWORD=your_password

# 調試模式
DEBUG=True
EOL
    echo "📝 已創建.env檔案，請編輯配置後重新運行"
    exit 1
fi

# 檢查資料庫連接
echo "🔍 檢查資料庫連接..."
cd app

# 啟動FastAPI服務
echo ""
echo "🚀 啟動FastAPI服務..."
echo "📊 API文檔: http://localhost:8000/docs"
echo "🌐 服務地址: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止服務"
echo ""

python main.py
