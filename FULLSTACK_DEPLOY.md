# 🚀 全棧Docker部署指南 - 蟬說露營區管理系統

## 🎯 **部署概述**

這個指南將幫助您將**前端React應用**和**後端FastAPI服務**打包成**單一Docker容器**，並在Zeabur上成功部署。

---

## 🏗️ **架構說明**

### **容器內部結構**
```
🐳 Docker容器
├── 🌐 Nginx (端口80) - 前端服務器 + API代理
│   ├── 📱 React靜態文件 (/var/www/html)
│   └── 🔄 API代理 (/api/* → 127.0.0.1:8000)
├── 🐍 Python FastAPI (端口8000) - 後端API
└── 👮 Supervisor - 進程管理
```

### **請求流程**
```
用戶請求 → Nginx(80) → 
├── 靜態文件 (/, /dashboard, /sales-status)
└── API請求 (/api/*) → Python FastAPI(8000)
```

---

## 📋 **部署前準備**

### **1. 文件檢查清單**
確保以下文件存在：
- ✅ `Dockerfile.zeabur` - Zeabur專用Dockerfile
- ✅ `nginx.zeabur.conf` - Nginx配置
- ✅ `supervisord.conf` - 進程管理配置
- ✅ `front-end/hotel-dashboard/` - 前端代碼
- ✅ `backend/` - 後端代碼
- ✅ `env.fullstack.template` - 環境變量模板

### **2. 環境變量準備**
複製環境變量模板並填入實際值：
```bash
cp env.fullstack.template .env.zeabur
# 編輯.env.zeabur文件，填入真實的API認證信息
```

---

## 🛠️ **本地構建測試**

### **方法1: 使用構建腳本（推薦）**
```bash
# 賦予執行權限
chmod +x build-fullstack.sh

# 構建映像
./build-fullstack.sh chanshuo-fullstack latest

# 本地測試
docker run -p 3000:80 --env-file env.fullstack.template chanshuo-fullstack:latest
```

### **方法2: 手動構建**
```bash
# 構建Docker映像
docker build -f Dockerfile.zeabur -t chanshuo-fullstack .

# 本地運行測試
docker run -p 3000:80 \
  -e DATABASE_URL="your_database_url" \
  -e API_USERNAME="your_username" \
  -e API_PASSWORD="your_password" \
  chanshuo-fullstack
```

### **測試驗證**
```bash
# 檢查健康狀態
curl http://localhost:3000/health

# 訪問前端
open http://localhost:3000

# 檢查API文檔
open http://localhost:3000/docs
```

---

## ☁️ **Zeabur部署**

### **步驟1: 推送代碼到GitHub**
```bash
# 添加所有文件
git add .

# 提交變更
git commit -m "Add fullstack Docker configuration for Zeabur"

# 推送到GitHub
git push origin main
```

### **步驟2: 在Zeabur中創建項目**
1. 登錄 [Zeabur控制台](https://zeabur.com)
2. 點擊 "New Project"
3. 選擇 "Deploy from GitHub"
4. 選擇您的倉庫

### **步驟3: 配置部署設置**
在Zeabur項目設置中：

**Dockerfile設置:**
- **Dockerfile路徑**: `Dockerfile.zeabur`
- **構建上下文**: `/` (根目錄)

**端口設置:**
- Zeabur會自動檢測並分配端口
- 容器內部使用端口80

### **步驟4: 配置環境變量**
在Zeabur環境變量頁面添加：

**必填變量:**
```bash
DATABASE_URL=postgresql://user:password@host:port/database
API_HOTEL_CODE=2436
API_USERNAME=your_api_username
API_PASSWORD=your_api_password
```

**可選變量:**
```bash
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=https://your-domain.zeabur.app
TZ=Asia/Taipei
```

### **步驟5: 資料庫配置**
**選項1: 使用Zeabur PostgreSQL**
1. 在項目中添加PostgreSQL服務
2. 複製連接URL到`DATABASE_URL`環境變量

**選項2: 使用外部資料庫**
- PlanetScale
- Supabase
- AWS RDS
- Google Cloud SQL

---

## 🔍 **部署驗證**

### **健康檢查**
部署完成後，訪問：
```
https://your-app.zeabur.app/health
```
應該返回：
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### **功能測試**
1. **前端界面**: `https://your-app.zeabur.app`
2. **API文檔**: `https://your-app.zeabur.app/docs`
3. **總覽頁面**: `https://your-app.zeabur.app/`
4. **銷售狀況**: `https://your-app.zeabur.app/sales-status`

---

## 🐛 **常見問題排除**

### **1. 構建失敗**
```bash
# 錯誤: 前端構建失敗
原因: Node.js版本或依賴問題
解決: 檢查front-end/hotel-dashboard/package.json

# 錯誤: Python依賴安裝失敗
原因: requirements.txt問題
解決: 檢查backend/requirements.txt
```

### **2. 啟動失敗**
```bash
# 錯誤: Nginx無法啟動
原因: 配置文件錯誤
解決: 檢查nginx.zeabur.conf語法

# 錯誤: Python API無法啟動
原因: 環境變量或資料庫連接問題
解決: 檢查DATABASE_URL是否正確
```

### **3. API無法訪問**
```bash
# 錯誤: /api/* 404錯誤
原因: Nginx代理配置問題
解決: 檢查nginx.zeabur.conf中的proxy_pass設置

# 錯誤: CORS錯誤
原因: 跨域配置問題  
解決: 設置正確的CORS_ORIGINS環境變量
```

### **4. 資料庫連接失敗**
```bash
# 錯誤: 無法連接到資料庫
原因: DATABASE_URL錯誤或網路問題
解決: 
1. 檢查DATABASE_URL格式
2. 確認資料庫服務正在運行
3. 檢查防火牆設置
```

---

## 📊 **性能優化**

### **映像大小優化**
- 使用多階段構建
- 清理不必要的文件
- 使用alpine基礎映像

### **運行時優化**
```bash
# Nginx設置
- 啟用Gzip壓縮
- 設置適當的緩存策略
- 優化靜態資源處理

# Python設置  
- 使用單一worker進程
- 設置適當的超時時間
- 啟用適當的日誌級別
```

---

## 📈 **監控和維護**

### **日誌查看**
在Zeabur控制台中查看：
- 應用啟動日誌
- 錯誤日誌
- 訪問日誌

### **性能監控**
- CPU使用率
- 內存使用率
- 響應時間
- 錯誤率

### **定期維護**
- 定期更新依賴包
- 監控資料庫性能
- 備份重要數據

---

## 🎯 **部署檢查清單**

### **部署前**
- [ ] 本地構建測試通過
- [ ] 環境變量配置完整
- [ ] 資料庫連接測試成功
- [ ] API功能測試通過

### **部署後**
- [ ] 健康檢查端點正常
- [ ] 前端頁面載入正常
- [ ] API調用功能正常
- [ ] 資料庫連接穩定
- [ ] 監控和日誌配置完成

---

## 🎉 **成功部署標準**

✅ **前端**: React應用載入快速，響應式設計正常  
✅ **後端**: API響應時間< 2秒，錯誤率< 1%  
✅ **資料庫**: 連接穩定，查詢性能良好  
✅ **整體**: 7×24小時穩定運行，用戶體驗流暢  

---

**🌟 恭喜！您的蟬說露營區管理系統現已成功部署在雲端！**

如有問題，請參考上述故障排除指南或聯繫技術支持。
