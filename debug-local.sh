#!/bin/bash

# 🐛 蟬說露營區管理系統 - 本地調試啟動腳本

set -e

echo "🏕️ 蟬說露營區管理系統 - 本地調試環境"
echo "============================================"
echo ""

# 檢查Docker是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未運行，請先啟動 Docker"
    exit 1
fi

# 檢查docker-compose是否可用
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose 未安裝"
    exit 1
fi

# 創建環境變量文件
if [ ! -f ".env.debug" ]; then
    echo "🔧 創建調試環境變量文件..."
    cp env.debug.template .env.debug
    echo "✅ 已創建 .env.debug (可根據需要編輯)"
else
    echo "✅ 使用現有的 .env.debug 文件"
fi

# 創建日誌目錄
echo "📁 創建日誌目錄..."
mkdir -p debug_logs debug_app_logs
echo "✅ 日誌目錄已創建"

# 詢問用戶操作
echo ""
echo "請選擇操作："
echo "1) 啟動調試環境 (前台運行，可看日誌)"
echo "2) 啟動調試環境 (後台運行)"
echo "3) 停止調試環境"
echo "4) 重建並啟動 (清除舊數據)"
echo "5) 查看服務狀態"
echo "6) 查看日誌"
echo "7) 進入應用容器"
echo "8) 進入資料庫容器"
echo "9) 清理所有 (停止並刪除所有相關容器和數據)"
echo ""

read -p "請輸入選項 (1-9): " choice

case $choice in
    1)
        echo "🚀 啟動調試環境 (前台)..."
        docker-compose -f docker-compose.debug.yml --env-file .env.debug up --build
        ;;
    2)
        echo "🚀 啟動調試環境 (後台)..."
        docker-compose -f docker-compose.debug.yml --env-file .env.debug up --build -d
        echo ""
        echo "✅ 服務已在後台啟動"
        echo "🌐 前端: http://localhost:8080"
        echo "📊 API文檔: http://localhost:8080/docs"
        echo "🔍 系統調試: http://localhost:8080/api/debug-system"
        echo ""
        echo "查看日誌: docker-compose -f docker-compose.debug.yml logs -f"
        ;;
    3)
        echo "🛑 停止調試環境..."
        docker-compose -f docker-compose.debug.yml down
        echo "✅ 服務已停止"
        ;;
    4)
        echo "🔄 重建並啟動 (清除舊數據)..."
        docker-compose -f docker-compose.debug.yml down -v
        docker-compose -f docker-compose.debug.yml --env-file .env.debug up --build -d
        echo ""
        echo "✅ 服務已重建並啟動"
        echo "🌐 前端: http://localhost:8080"
        echo "📊 API文檔: http://localhost:8080/docs"
        ;;
    5)
        echo "📊 服務狀態:"
        docker-compose -f docker-compose.debug.yml ps
        ;;
    6)
        echo "📋 查看日誌 (Ctrl+C 退出):"
        docker-compose -f docker-compose.debug.yml logs -f
        ;;
    7)
        echo "🔧 進入應用容器..."
        docker exec -it chanshuo-debug bash
        ;;
    8)
        echo "🗄️ 進入資料庫容器..."
        docker exec -it chanshuo-postgres-debug psql -U chanshuo -d chanshuo_debug
        ;;
    9)
        echo "🧹 清理所有相關資源..."
        docker-compose -f docker-compose.debug.yml down -v --remove-orphans
        docker system prune -f
        echo "✅ 清理完成"
        ;;
    *)
        echo "❌ 無效選項"
        exit 1
        ;;
esac

echo ""
echo "📞 如需幫助，請查看 LOCAL_DEBUG_GUIDE.md"
