#!/bin/bash

# 🏕️ 蟬說露營區管理系統 - 全棧構建腳本

set -e  # 遇到錯誤立即退出

echo "🚀 **蟬說露營區全棧Docker構建開始**"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數：打印彩色輸出
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查Docker是否安裝
if ! command -v docker &> /dev/null; then
    print_error "Docker未安裝，請先安裝Docker"
    exit 1
fi

print_success "Docker已安裝"

# 檢查必要文件
required_files=("Dockerfile.zeabur" "nginx.zeabur.conf" "supervisord.conf" "front-end/hotel-dashboard/package.json" "backend/requirements.txt")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "缺少必要文件: $file"
        exit 1
    fi
done

print_success "所有必要文件檢查通過"

# 設置構建參數
IMAGE_NAME="${1:-chanshuo-fullstack}"
IMAGE_TAG="${2:-latest}"
FULL_IMAGE_NAME="$IMAGE_NAME:$IMAGE_TAG"

print_status "構建映像: $FULL_IMAGE_NAME"

# 清理舊映像（可選）
if [ "$3" = "--clean" ]; then
    print_warning "清理舊映像..."
    docker rmi "$FULL_IMAGE_NAME" 2>/dev/null || echo "沒有找到舊映像"
fi

# 構建Docker映像
print_status "開始構建Docker映像..."
echo ""

# 顯示構建進度
docker build \
    -f Dockerfile.zeabur \
    -t "$FULL_IMAGE_NAME" \
    --progress=plain \
    --no-cache \
    .

if [ $? -eq 0 ]; then
    print_success "Docker映像構建成功: $FULL_IMAGE_NAME"
else
    print_error "Docker映像構建失敗"
    exit 1
fi

# 顯示映像信息
echo ""
print_status "映像信息:"
docker images | grep "$IMAGE_NAME" | head -1

# 映像大小優化建議
IMAGE_SIZE=$(docker images --format "table {{.Size}}" "$FULL_IMAGE_NAME" | tail -1)
print_status "映像大小: $IMAGE_SIZE"

if [[ "$IMAGE_SIZE" =~ "GB" ]]; then
    print_warning "映像較大，建議優化Dockerfile以減小體積"
fi

echo ""
print_status "🎯 **後續操作選項:**"
echo ""
echo "📋 **本地測試:**"
echo "   docker run -p 3000:80 --env-file .env.docker $FULL_IMAGE_NAME"
echo ""
echo "🌐 **推送到容器倉庫:**"
echo "   docker tag $FULL_IMAGE_NAME your-registry/$FULL_IMAGE_NAME"
echo "   docker push your-registry/$FULL_IMAGE_NAME"
echo ""
echo "☁️ **Zeabur部署:**"
echo "   1. 推送代碼到GitHub"
echo "   2. 在Zeabur中導入項目"
echo "   3. 選擇 Dockerfile.zeabur"
echo "   4. 配置環境變量"
echo ""

# 生成部署配置文件
if [ ! -f ".env.docker" ]; then
    print_status "生成環境變量模板..."
    cat > .env.docker << EOF
# 🏕️ 蟬說露營區 - Docker環境變量
DATABASE_URL=postgresql://user:password@postgres:5432/chanshuo_camping
API_HOTEL_CODE=2436
API_USERNAME=your_username
API_PASSWORD=your_password
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=*
EOF
    print_success "已生成 .env.docker 模板，請編輯後使用"
fi

echo ""
print_success "🎉 全棧Docker映像構建完成！"
print_status "映像名稱: $FULL_IMAGE_NAME"
print_status "Ready for deployment! 🚀"
