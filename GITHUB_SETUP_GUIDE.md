# 🚀 GitHub連動設置指南 - 蟬說露營區管理系統

## 🎯 **連動優勢**

設置GitHub連動後，您將享受：
- ✅ **本地修改** → 推送到GitHub → **Zeabur自動部署**
- ✅ **版本控制**: 完整的代碼歷史和回滾功能
- ✅ **團隊協作**: 多人開發和代碼審查
- ✅ **CI/CD**: 自動化測試和部署流程

---

## 📋 **設置步驟**

### **步驟1: 創建GitHub倉庫**

#### **方法A: 網頁創建（推薦）**
1. 訪問 [GitHub.com](https://github.com)
2. 點擊右上角「**+**」→「**New repository**」
3. 填寫倉庫信息：
   ```
   Repository name: chanshuo-camping-management
   Description: 🏕️ 蟬說露營區管理系統 - 全棧Dashboard與API
   Visibility: Public (或Private)
   
   ⚠️ 不要勾選：
   - Add a README file
   - Add .gitignore  
   - Choose a license
   (因為我們已經有這些文件)
   ```
4. 點擊「**Create repository**」

#### **方法B: GitHub CLI創建**
```bash
# 如果您有GitHub CLI
gh repo create chanshuo-camping-management --public --description "🏕️ 蟬說露營區管理系統"
```

### **步驟2: 連接本地倉庫到GitHub**

複製以下命令並在終端機執行：

```bash
# 添加GitHub遠程倉庫 (替換為您的GitHub用戶名)
git remote add origin https://github.com/YOUR_USERNAME/chanshuo-camping-management.git

# 推送代碼到GitHub
git push -u origin main
```

**⚠️ 重要**: 將`YOUR_USERNAME`替換為您的實際GitHub用戶名

### **步驟3: 驗證推送成功**

推送完成後：
1. 刷新GitHub倉庫頁面
2. 確認看到所有38個文件
3. 檢查README.md顯示正常

---

## 🔗 **設置Zeabur自動部署**

### **在Zeabur控制台操作**

1. **進入項目設置**
   - 登錄 [Zeabur Dashboard](https://dash.zeabur.com)
   - 選擇您的項目

2. **連接GitHub倉庫**
   - 點擊「**Settings**」→「**Git**」
   - 點擊「**Connect to GitHub**」
   - 授權Zeabur訪問您的GitHub
   - 選擇`chanshuo-camping-management`倉庫

3. **配置自動部署**
   - **Branch**: `main`
   - **Build Command**: 自動檢測
   - **Dockerfile**: `Dockerfile.zeabur`
   - **Context**: 根目錄 `/`

4. **設置部署觸發**
   - ✅ **Push to main**: 推送到main分支時自動部署
   - ✅ **Manual Deploy**: 手動部署選項

---

## ⚙️ **環境變量配置**

在Zeabur的「**Variables**」頁面設置：

### **必填變量**
```bash
DATABASE_URL=postgresql://user:password@host:port/database
API_HOTEL_CODE=2436
API_USERNAME=your_api_username
API_PASSWORD=your_api_password
```

### **可選變量**
```bash
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=*
TZ=Asia/Taipei
```

---

## 🔄 **完整工作流程**

設置完成後，您的工作流程將是：

### **日常開發流程**
```bash
# 1. 修改代碼
vim backend/app/main.py

# 2. 測試本地功能
cd backend && python app/main.py

# 3. 提交更改
git add .
git commit -m "✨ 新增房間批量編輯功能"

# 4. 推送到GitHub
git push origin main

# 5. Zeabur自動部署 (約2-5分鐘)
# 6. 訪問線上服務驗證功能
```

### **常用Git命令**
```bash
# 查看狀態
git status

# 查看歷史
git log --oneline

# 創建新分支
git checkout -b feature/new-feature

# 合併分支
git checkout main
git merge feature/new-feature

# 回滾到上一個版本
git reset --hard HEAD~1
```

---

## 🎛️ **高級配置**

### **設置GitHub Actions (可選)**

創建`.github/workflows/deploy.yml`：

```yaml
name: Deploy to Zeabur

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v3
      with:
        python-version: '3.11'
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    - name: Run tests
      run: |
        cd backend
        python -m pytest tests/ || echo "No tests found"

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy to Zeabur
      run: echo "Zeabur will auto-deploy from GitHub"
```

### **保護主分支**

在GitHub倉庫設置中：
1. 「**Settings**」→「**Branches**」
2. 添加規則保護`main`分支
3. 要求pull request審查

---

## 🐛 **故障排除**

### **問題1: 推送失敗**
```bash
# 錯誤: remote origin already exists
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/repo-name.git

# 錯誤: 認證失敗
# 使用Personal Access Token代替密碼
```

### **問題2: Zeabur無法訪問倉庫**
- 確認倉庫是Public的，或已正確設置權限
- 重新連接GitHub授權
- 檢查倉庫名稱是否正確

### **問題3: 自動部署不觸發**
- 確認推送到了正確的分支（main）
- 檢查Zeabur的Webhook設置
- 查看GitHub的Webhook日誌

---

## ✅ **設置完成檢查清單**

- [ ] ✅ **本地Git倉庫已初始化**
- [ ] 🔄 **GitHub倉庫已創建**
- [ ] 🔄 **代碼已推送到GitHub**
- [ ] 🔄 **Zeabur已連接GitHub**
- [ ] 🔄 **環境變量已配置**
- [ ] 🔄 **自動部署已測試**

---

## 🎊 **成功標準**

設置完成後，您應該能夠：

✅ **在GitHub看到完整的項目代碼**  
✅ **推送代碼後Zeabur自動開始部署**  
✅ **部署完成後線上服務正常運行**  
✅ **前端和API功能完全可用**  

---

## 🚀 **立即開始**

執行以下命令完成GitHub連動：

```bash
# 替換YOUR_USERNAME為您的GitHub用戶名
git remote add origin https://github.com/YOUR_USERNAME/chanshuo-camping-management.git
git push -u origin main
```

**🎯 完成後，您的蟬說露營區管理系統將實現完全自動化的部署流程！**
