# 🚀 Zeabur部署指南 - 蟬說露營區管理系統後端

## 🔧 **解決Python兼容性問題**

### ❌ **問題分析**
原錯誤是因為Zeabur預設使用Python 3.13，而`asyncpg`包尚未完全支援，導致編譯失敗。

### ✅ **解決方案**
我們已經配置使用**Python 3.11.9**版本，確保所有依賴包的完美兼容性。

---

## 🛠️ **部署前準備**

### **1. 環境變量配置**
在Zeabur控制台中設置以下環境變量：

```bash
# 資料庫配置 (必填)
DATABASE_URL=postgresql://username:password@host:port/database

# API認證 (必填)  
API_HOTEL_CODE=2436
API_USERNAME=your_username
API_PASSWORD=your_password

# 服務配置 (可選)
PORT=8000
DEBUG=False
LOG_LEVEL=INFO

# 跨域配置 (根據前端域名設置)
CORS_ORIGINS=https://your-frontend-domain.zeabur.app
```

### **2. PostgreSQL資料庫**
在Zeabur中添加PostgreSQL服務：
- 創建新的PostgreSQL實例
- 記錄連接信息用於環境變量配置
- 確保網路連接正常

---

## 📦 **部署方式選擇**

### **方式1: GitHub自動部署（推薦）**

1. **推送代碼到GitHub**
   ```bash
   git add .
   git commit -m "Add Zeabur deployment config"
   git push origin main
   ```

2. **在Zeabur中導入**
   - 連接GitHub倉庫
   - 選擇backend資料夾作為根目錄
   - Zeabur會自動檢測Dockerfile

### **方式2: 手動ZIP上傳**

1. **準備部署包**
   ```bash
   cd backend
   zip -r backend.zip . -x "scripts/*" "*.md" ".env*"
   ```

2. **上傳到Zeabur**
   - 選擇「從ZIP上傳」
   - 上傳backend.zip
   - 設置根目錄為「/」

---

## ⚙️ **Zeabur配置設定**

### **服務配置**
```json
{
  "name": "chanshuo-camping-api",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "environment": {
    "PORT": "8000",
    "PYTHON_VERSION": "3.11.9"
  },
  "health_check": {
    "path": "/health",
    "port": 8000
  }
}
```

### **域名配置**
- 獲取Zeabur分配的域名
- 或綁定自定義域名
- 更新前端API配置指向新域名

---

## 🔍 **部署驗證**

### **健康檢查**
部署完成後訪問：
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

### **API文檔**
訪問Swagger文檔：
```
https://your-app.zeabur.app/docs
```

### **功能測試**
測試關鍵端點：
- `GET /room-types` - 房型列表
- `GET /dashboard-summary` - 儀表板數據
- `POST /weekly-update` - 週更新功能

---

## 🐛 **常見問題解決**

### **1. 資料庫連接失敗**
```bash
# 檢查環境變量
DATABASE_URL格式: postgresql://user:pass@host:port/dbname

# 確認資料庫服務狀態
ping database-host
```

### **2. 依賴安裝失敗**
```bash
# 確認Python版本
runtime.txt: python-3.11.9

# 清理並重新部署
重新觸發部署流程
```

### **3. 啟動失敗**
```bash
# 檢查日誌
在Zeabur控制台查看詳細錯誤

# 檢查端口配置
PORT環境變量設置為8000
```

### **4. CORS錯誤**
```bash
# 配置允許的域名
CORS_ORIGINS=https://frontend-domain.com

# 開發環境設置
CORS_ORIGINS=*
```

---

## 📊 **監控和維護**

### **日誌監控**
- 在Zeabur控制台查看實時日誌
- 設置錯誤警報通知
- 定期檢查應用性能

### **自動重啟**
- 配置健康檢查失敗時自動重啟
- 設置資源使用限制
- 定期檢查服務狀態

### **備份策略**
- 定期備份PostgreSQL資料庫
- 保存重要配置文件
- 建立災難恢復計劃

---

## ✅ **部署檢查清單**

- [ ] 環境變量正確配置
- [ ] PostgreSQL資料庫就緒
- [ ] Dockerfile存在於backend目錄
- [ ] runtime.txt指定Python 3.11.9
- [ ] .dockerignore優化構建
- [ ] 健康檢查端點正常
- [ ] API文檔可訪問
- [ ] 前端CORS配置更新
- [ ] 監控和警報設置

---

## 🎯 **部署成功指標**

✅ **API服務正常**: HTTP 200響應  
✅ **資料庫連接**: 健康檢查通過  
✅ **功能完整**: 所有端點可用  
✅ **性能穩定**: 響應時間< 2秒  
✅ **前端整合**: 跨域請求成功  

---

**🎉 按照此指南，您的蟬說露營區管理系統後端將在Zeabur上穩定運行！**
