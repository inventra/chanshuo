# 🐛 本地 Docker 調試指南

## 🎯 快速開始

### 1. 準備環境變量
```bash
# 複製調試環境變量模板
cp env.debug.template .env.debug

# 根據需要編輯環境變量 (可選)
# nano .env.debug
```

### 2. 啟動調試環境
```bash
# 啟動所有服務 (資料庫 + 應用)
docker-compose -f docker-compose.debug.yml --env-file .env.debug up --build

# 或者後台運行
docker-compose -f docker-compose.debug.yml --env-file .env.debug up --build -d
```

### 3. 訪問服務
- **前端**: http://localhost:8080
- **API文檔**: http://localhost:8080/docs
- **系統調試**: http://localhost:8080/api/debug-system
- **前端調試**: http://localhost:8080/debug-frontend
- **直接API**: http://localhost:8000 (繞過nginx)

## 🔍 調試 403 錯誤

### 檢查步驟
1. **訪問前端**: http://localhost:8080
   - 如果出現403，查看瀏覽器網絡面板的錯誤信息
   
2. **檢查系統狀態**: http://localhost:8080/api/debug-system
   - 查看前端文件權限
   - 檢查文件存在性
   - 查看目錄內容

3. **檢查容器日誌**:
   ```bash
   # 查看應用日誌
   docker-compose -f docker-compose.debug.yml logs chanshuo-debug
   
   # 實時查看日誌
   docker-compose -f docker-compose.debug.yml logs -f chanshuo-debug
   
   # 進入容器檢查
   docker exec -it chanshuo-debug bash
   ```

### 容器內部檢查
```bash
# 進入容器
docker exec -it chanshuo-debug bash

# 檢查前端文件
ls -la /var/www/html/
cat /var/www/html/index.html

# 檢查nginx配置
nginx -t
cat /etc/nginx/sites-available/default

# 檢查nginx進程
ps aux | grep nginx

# 檢查權限
stat /var/www/html/index.html
```

## 📊 調試API

### 基礎API測試
```bash
# 測試API連通性
curl http://localhost:8080/api/ping

# 健康檢查
curl http://localhost:8080/api/health

# 系統調試信息
curl http://localhost:8080/api/debug-system | jq

# 前端調試信息
curl http://localhost:8080/debug-frontend | jq
```

### 資料庫操作
```bash
# 初始化資料庫
curl -X POST http://localhost:8080/api/init-database

# 檢查房間類型
curl http://localhost:8080/api/room-types | jq
```

## 🔧 常見問題排除

### 問題1: 403 Forbidden
**檢查**: 
- 前端文件是否存在
- 文件權限是否正確
- nginx配置是否正確

**解決**:
```bash
# 進入容器修復權限
docker exec -it chanshuo-debug bash
chmod -R 755 /var/www/html
chown -R www-data:www-data /var/www/html
```

### 問題2: 資料庫連接失敗
**檢查**:
```bash
# 檢查資料庫狀態
docker-compose -f docker-compose.debug.yml ps postgres-debug

# 測試資料庫連接
docker exec -it chanshuo-postgres-debug psql -U chanshuo -d chanshuo_debug -c "SELECT 1;"
```

### 問題3: API無法訪問
**檢查**:
```bash
# 檢查API進程
docker exec -it chanshuo-debug ps aux | grep uvicorn

# 檢查端口監聽
docker exec -it chanshuo-debug netstat -tlnp
```

## 📁 日誌檔案

本地掛載的日誌目錄：
- `./debug_logs/` - nginx 和系統日誌
- `./debug_app_logs/` - 應用程式日誌

## 🛑 停止服務

```bash
# 停止所有服務
docker-compose -f docker-compose.debug.yml down

# 停止並刪除資料 (重新開始)
docker-compose -f docker-compose.debug.yml down -v

# 清理所有相關容器和網路
docker-compose -f docker-compose.debug.yml down --remove-orphans
```

## 🎯 針對性調試

### 調試前端建置
```bash
# 檢查前端建置過程
docker-compose -f docker-compose.debug.yml build chanshuo-debug

# 只建置不啟動
docker build -f Dockerfile.zeabur -t chanshuo-debug-test .
```

### 調試nginx配置
```bash
# 測試nginx配置
docker exec -it chanshuo-debug nginx -t

# 重載nginx配置
docker exec -it chanshuo-debug nginx -s reload
```

### 調試權限問題
```bash
# 檢查所有相關文件權限
docker exec -it chanshuo-debug find /var/www/html -type f -exec ls -la {} \;

# 檢查nginx用戶
docker exec -it chanshuo-debug id www-data
```

## 💡 提示

1. **保持日誌開啟**: 使用 `docker-compose logs -f` 實時查看日誌
2. **分步測試**: 先測試API，再測試前端
3. **對比Zeabur**: 本地成功後，對比與Zeabur的差異
4. **快速迭代**: 本地修改後快速重建測試

## 📞 支援

如果遇到問題，請提供：
1. 錯誤訊息截圖
2. `docker-compose logs chanshuo-debug` 輸出
3. `/api/debug-system` API 回應
4. 具體的重現步驟
