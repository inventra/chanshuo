# 🔧 Zeabur部署修復指南 - 蟬說露營區管理系統

## ❌ **問題診斷**

根據您的日誌分析：
```
WARN exited: api (exit status 3; not expected)
INFO gave up: api entered FATAL state, too many start retries too quickly
```

**問題根源**：
1. ❌ **API服務無法啟動** (exit status 3)
2. ❌ **環境變量未正確傳遞**
3. ❌ **端口配置錯誤** (域名指向8000端口)

---

## ✅ **解決方案**

### **1. 正確的Zeabur環境變量配置**

在Zeabur控制台的環境變量頁面設置：

#### **🔴 必填環境變量**
```bash
DATABASE_URL=postgresql://username:password@hostname:port/database_name
API_HOTEL_CODE=2436
API_USERNAME=your_api_username
API_PASSWORD=your_api_password
```

#### **🟡 可選環境變量**
```bash
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=*
TZ=Asia/Taipei
```

#### **⚠️ 重要提醒**
- **DATABASE_URL**: 必須是有效的PostgreSQL連接字符串
- **API認證信息**: 必須填入真實的API用戶名和密碼
- **不要設置PORT**: Zeabur會自動管理端口

### **2. 正確的域名配置**

#### **❌ 錯誤配置**
```
域名指向8000端口 → 502錯誤
```

#### **✅ 正確配置**
```
域名指向容器默認端口（Zeabur自動分配）
不需要手動指定端口號
```

**Zeabur域名配置步驟**：
1. 在Zeabur項目中點擊「Domains」
2. 添加自定義域名或使用提供的域名
3. **不要**在域名後添加`:8000`
4. 讓Zeabur自動處理端口映射

### **3. 資料庫配置選項**

#### **選項A: 使用Zeabur PostgreSQL**
1. 在Zeabur項目中添加PostgreSQL服務
2. 複製生成的DATABASE_URL
3. 添加到環境變量中

#### **選項B: 使用外部資料庫**
```bash
# PlanetScale (推薦)
DATABASE_URL=mysql://username:password@aws.connect.psdb.cloud/dbname?sslaccept=strict

# Supabase
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# Railway
DATABASE_URL=postgresql://postgres:password@roundhouse.proxy.rlwy.net:port/railway
```

---

## 🚀 **重新部署步驟**

### **步驟1: 更新代碼**
```bash
# 在本地項目根目錄
git add .
git commit -m "Fix Zeabur deployment issues - API startup and port config"
git push origin main
```

### **步驟2: 配置Zeabur環境變量**
1. 進入Zeabur項目控制台
2. 點擊「Variables」頁籤
3. 添加上述必填環境變量
4. **確保DATABASE_URL有效**

### **步驟3: 重新構建**
1. 在Zeabur控制台點擊「Redeploy」
2. 等待構建完成
3. 檢查部署日誌

### **步驟4: 驗證部署**
```bash
# 檢查健康狀態
curl https://your-domain.zeabur.app/health

# 預期響應
{"status": "healthy", "database": "connected"}
```

---

## 🔍 **故障排除**

### **問題1: API服務仍然失敗**
**檢查項目**：
- [ ] DATABASE_URL格式正確
- [ ] 資料庫服務可訪問
- [ ] API認證信息正確
- [ ] 網路連接正常

**解決方案**：
```bash
# 測試資料庫連接
psql "postgresql://username:password@hostname:port/database_name"
```

### **問題2: 502 Bad Gateway**
**可能原因**：
- API服務未啟動
- Nginx配置問題
- 端口配置錯誤

**解決方案**：
1. 檢查Zeabur部署日誌
2. 確認API服務狀態
3. 驗證域名配置

### **問題3: 環境變量未生效**
**檢查項目**：
- [ ] 變量名稱正確
- [ ] 變量值格式正確
- [ ] 重新部署後生效

**解決方案**：
1. 重新設置環境變量
2. 觸發重新部署
3. 檢查容器日誌

---

## 📊 **成功部署檢查清單**

### **部署前檢查**
- [ ] 代碼已推送到GitHub
- [ ] Dockerfile.zeabur存在
- [ ] 環境變量已配置
- [ ] 資料庫連接已測試

### **部署後檢查**
- [ ] 容器啟動成功
- [ ] Nginx服務運行
- [ ] API服務運行
- [ ] 健康檢查通過
- [ ] 前端頁面載入
- [ ] API功能正常

---

## 🎯 **快速修復命令**

### **本地更新並部署**
```bash
# 1. 更新修復後的配置
git add .
git commit -m "Fix Zeabur API startup issues"
git push origin main

# 2. 在Zeabur控制台設置環境變量：
# DATABASE_URL=postgresql://...
# API_HOTEL_CODE=2436
# API_USERNAME=your_username
# API_PASSWORD=your_password

# 3. 在Zeabur控制台點擊 "Redeploy"

# 4. 等待部署完成，然後測試：
# curl https://your-domain.zeabur.app/health
```

---

## 🌟 **部署成功標準**

✅ **容器啟動**: 所有服務正常運行  
✅ **API響應**: `/health`端點返回正常  
✅ **前端載入**: 網站可正常訪問  
✅ **功能完整**: 房間管理等功能正常  
✅ **性能穩定**: 響應時間< 3秒  

---

## 🆘 **如果問題仍然存在**

1. **檢查Zeabur日誌**: 查看詳細錯誤信息
2. **驗證資料庫**: 確認資料庫服務可訪問
3. **測試本地**: 確保本地環境正常運行
4. **聯繫支持**: 提供完整的錯誤日誌

---

**🎉 按照此指南操作，您的蟬說露營區管理系統將在Zeabur上穩定運行！**
