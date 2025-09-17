#!/bin/bash

# 🏕️ 蟬說露營區管理系統 - 全棧部署驗證腳本

set -e

echo "🔍 **全棧Docker部署配置驗證**"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 函數定義
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✅]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[⚠️]${NC} $1"; }
print_error() { echo -e "${RED}[❌]${NC} $1"; }

# 驗證結果統計
total_checks=0
passed_checks=0
failed_checks=0

# 檢查函數
check_file() {
    total_checks=$((total_checks + 1))
    if [ -f "$1" ]; then
        print_success "$1 - 存在"
        passed_checks=$((passed_checks + 1))
        return 0
    else
        print_error "$1 - 缺失"
        failed_checks=$((failed_checks + 1))
        return 1
    fi
}

check_dir() {
    total_checks=$((total_checks + 1))
    if [ -d "$1" ]; then
        print_success "$1/ - 目錄存在"
        passed_checks=$((passed_checks + 1))
        return 0
    else
        print_error "$1/ - 目錄缺失"
        failed_checks=$((failed_checks + 1))
        return 1
    fi
}

echo "📁 **檢查必要文件和目錄...**"
echo ""

# 檢查Docker配置文件
print_status "Docker配置文件:"
check_file "Dockerfile.zeabur"
check_file "Dockerfile.fullstack"
check_file "nginx.zeabur.conf"
check_file "nginx.conf"
check_file "supervisord.conf"

echo ""

# 檢查構建和部署腳本
print_status "構建和部署腳本:"
check_file "build-fullstack.sh"
check_file "verify-fullstack.sh"
check_file "FULLSTACK_DEPLOY.md"
check_file "env.fullstack.template"

echo ""

# 檢查前端結構
print_status "前端結構:"
check_dir "front-end"
check_dir "front-end/hotel-dashboard"
check_file "front-end/hotel-dashboard/package.json"
check_file "front-end/hotel-dashboard/src/services/api.ts"
check_dir "front-end/hotel-dashboard/src/pages"

echo ""

# 檢查後端結構
print_status "後端結構:"
check_dir "backend"
check_dir "backend/app"
check_file "backend/app/main.py"
check_file "backend/requirements.txt"
check_dir "backend/database"
check_file "backend/database/schema.sql"

echo ""

# 檢查Docker Compose配置
print_status "Docker Compose配置:"
check_file "docker-compose.fullstack.yml"

echo ""

# 檢查前端API配置
print_status "檢查前端API配置..."
total_checks=$((total_checks + 1))
if grep -q "process.env.NODE_ENV === 'production' ? '/api'" front-end/hotel-dashboard/src/services/api.ts; then
    print_success "前端API配置 - 支持生產環境相對路徑"
    passed_checks=$((passed_checks + 1))
else
    print_warning "前端API配置 - 可能需要更新"
    failed_checks=$((failed_checks + 1))
fi

echo ""

# 檢查Nginx配置
print_status "檢查Nginx配置..."
total_checks=$((total_checks + 1))
if grep -q "location /api/" nginx.zeabur.conf; then
    print_success "Nginx配置 - API代理路由正確"
    passed_checks=$((passed_checks + 1))
else
    print_error "Nginx配置 - 缺少API代理配置"
    failed_checks=$((failed_checks + 1))
fi

total_checks=$((total_checks + 1))
if grep -q "proxy_pass http://127.0.0.1:8000" nginx.zeabur.conf; then
    print_success "Nginx配置 - 後端代理地址正確"
    passed_checks=$((passed_checks + 1))
else
    print_error "Nginx配置 - 後端代理地址錯誤"
    failed_checks=$((failed_checks + 1))
fi

echo ""

# 檢查Supervisor配置
print_status "檢查Supervisor配置..."
total_checks=$((total_checks + 1))
if grep -q "program:nginx" supervisord.conf && grep -q "program:api" supervisord.conf; then
    print_success "Supervisor配置 - 包含nginx和api程序"
    passed_checks=$((passed_checks + 1))
else
    print_error "Supervisor配置 - 缺少必要程序配置"
    failed_checks=$((failed_checks + 1))
fi

echo ""

# 檢查Docker環境
print_status "檢查Docker環境..."
total_checks=$((total_checks + 1))
if command -v docker &> /dev/null; then
    print_success "Docker - 已安裝"
    passed_checks=$((passed_checks + 1))
    
    # 檢查Docker是否運行
    if docker info &> /dev/null; then
        print_success "Docker - 服務正在運行"
    else
        print_warning "Docker - 服務未運行，請啟動Docker"
    fi
else
    print_error "Docker - 未安裝"
    failed_checks=$((failed_checks + 1))
fi

echo ""

# 生成驗證報告
echo "📊 **驗證報告**"
echo "=========================="
echo "總檢查項目: $total_checks"
echo -e "通過項目: ${GREEN}$passed_checks${NC}"
echo -e "失敗項目: ${RED}$failed_checks${NC}"
echo ""

# 計算通過率
pass_rate=$((passed_checks * 100 / total_checks))
echo "通過率: $pass_rate%"

echo ""

if [ $failed_checks -eq 0 ]; then
    echo "🎉 **驗證通過！準備部署**"
    echo ""
    echo "📋 **下一步操作:**"
    echo "1. 本地構建測試: ./build-fullstack.sh"
    echo "2. 推送到GitHub: git add . && git commit -m 'Add fullstack config' && git push"
    echo "3. 在Zeabur中導入項目並配置環境變量"
    echo "4. 等待自動部署完成"
    echo ""
    echo "📖 詳細部署指南: cat FULLSTACK_DEPLOY.md"
    
elif [ $pass_rate -ge 80 ]; then
    echo "⚠️ **大部分檢查通過，建議修復警告項目後部署**"
    echo ""
    echo "🔧 **需要注意的問題:**"
    if [ $failed_checks -gt 0 ]; then
        echo "- 有 $failed_checks 個項目需要修復"
        echo "- 建議檢查上述錯誤信息並修復"
    fi
    
else
    echo "❌ **驗證失敗，請修復錯誤後重新檢查**"
    echo ""
    echo "🔧 **需要修復的問題:**"
    echo "- 通過率僅 $pass_rate%，需要修復關鍵問題"
    echo "- 請檢查上述所有錯誤項目"
    echo ""
    exit 1
fi

echo ""
echo "🔍 **重新運行驗證:** ./verify-fullstack.sh"
echo "🚀 **開始構建:** ./build-fullstack.sh"
