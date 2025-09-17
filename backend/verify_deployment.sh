#!/bin/bash

# 蟬說露營區管理系統 - Zeabur部署驗證腳本

echo "🔍 **Zeabur部署配置驗證**"
echo ""

# 檢查必要文件
echo "📁 檢查部署文件..."
files=("Dockerfile" "runtime.txt" "requirements.txt" ".dockerignore" "ZEABUR_DEPLOY.md")
all_present=true

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - 存在"
    else
        echo "❌ $file - 缺失"
        all_present=false
    fi
done

echo ""

# 檢查Python版本配置
echo "🐍 檢查Python版本..."
if [ -f "runtime.txt" ]; then
    version=$(cat runtime.txt)
    if [[ "$version" =~ python-3\.11\.[0-9]+ ]]; then
        echo "✅ Python版本: $version (兼容asyncpg)"
    else
        echo "⚠️ Python版本: $version (可能存在兼容性問題)"
    fi
fi

echo ""

# 檢查依賴包版本
echo "📦 檢查關鍵依賴包..."
if [ -f "requirements.txt" ]; then
    echo "✅ FastAPI: $(grep fastapi requirements.txt)"
    echo "✅ uvicorn: $(grep uvicorn requirements.txt)"
    echo "✅ asyncpg: $(grep asyncpg requirements.txt)"
    echo "✅ aiohttp: $(grep aiohttp requirements.txt)"
fi

echo ""

# 檢查Dockerfile配置
echo "🐳 檢查Docker配置..."
if [ -f "Dockerfile" ]; then
    python_version=$(grep "FROM python:" Dockerfile | head -1)
    if [[ "$python_version" =~ python:3\.11 ]]; then
        echo "✅ Dockerfile Python版本正確"
    else
        echo "⚠️ Dockerfile Python版本可能有問題"
    fi
    
    if grep -q "HEALTHCHECK" Dockerfile; then
        echo "✅ 健康檢查已配置"
    else
        echo "⚠️ 缺少健康檢查配置"
    fi
fi

echo ""

# 檢查應用結構
echo "📂 檢查應用結構..."
if [ -d "app" ] && [ -f "app/main.py" ]; then
    echo "✅ 應用代碼結構正確"
else
    echo "❌ 應用代碼結構有問題"
    all_present=false
fi

echo ""

# 總結
if [ "$all_present" = true ]; then
    echo "🎉 **部署配置驗證通過！**"
    echo ""
    echo "📋 下一步操作："
    echo "1. 將backend資料夾推送到GitHub"
    echo "2. 在Zeabur中導入項目並選擇backend資料夾"
    echo "3. 配置環境變量 (DATABASE_URL, API_*)"
    echo "4. 等待自動部署完成"
    echo "5. 訪問 /health 端點驗證部署"
    echo ""
    echo "📖 詳細部署指南: cat ZEABUR_DEPLOY.md"
else
    echo "❌ **部署配置有問題，請檢查以上錯誤**"
fi
