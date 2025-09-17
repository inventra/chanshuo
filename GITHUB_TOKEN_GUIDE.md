# 🔑 GitHub Personal Access Token 完整指南

## 📋 快速設置步驟

### 1. 創建 GitHub Personal Access Token
```
🌐 訪問: https://github.com/settings/tokens
➕ Generate new token → Generate new token (classic)
📝 Note: 蟬說露營區管理系統-20250917
⏰ Expiration: 90 days
✅ Scopes: ☑️ repo (完整倉庫控制)
📋 複製 Token (ghp_xxxxxxxxxxxxxxxxxxxx)
```

### 2. 創建 GitHub 倉庫
```
🌐 訪問: https://github.com/new
📝 Repository name: chanshuo
💬 Description: 🏕️ 蟬說露營區管理系統 - 全棧Dashboard與API
🔓 Visibility: Public
❌ 不勾選任何額外選項
✅ Create repository
```

### 3. 測試並推送代碼
```bash
./test-github-token.sh
```

**推送時輸入：**
- Username: `inventra`
- Password: `[貼上您的 Classic Personal Access Token]`

---

## ⚠️ Token 類型重要說明

### Classic Token vs Fine-grained Token
- ✅ **Classic Token**: `ghp_xxxxxxxxxxxx` (推薦)
  - 簡單易用，適用於所有倉庫
  - 權限管理較簡單
- ❌ **Fine-grained Token**: `github_pat_xxxxxxx` (需特殊設置)
  - 需要明確授權特定倉庫
  - 權限管理更複雜

### 如果您有 Fine-grained Token
```bash
# 建議：創建新的 Classic Token
🌐 https://github.com/settings/tokens
➕ Generate new token (classic)
✅ 勾選: repo
📋 格式: ghp_xxxxxxxxxxxx

# 或者：授權 Fine-grained Token
🌐 https://github.com/settings/personal-access-tokens/fine-grained
🔧 編輯您的 Token
➕ 添加目標倉庫
✅ 設置權限: Contents (Read and write)
```

---

## 🔧 本地 Git 配置

### 檢查當前配置
```bash
git config --global user.name
git config --global user.email
git config --global credential.helper
```

### 更新用戶信息（可選）
```bash
git config --global user.name "inventra"
git config --global user.email "kevin@inventra.com.tw"
```

### 設置憑證助手
```bash
git config --global credential.helper store
```

---

## 🔐 Token 安全管理

### Token 格式
- ✅ **正確**: `ghp_xxxxxxxxxxxxxxxxxxxx`
- ❌ **錯誤**: 您的 GitHub 密碼

### 權限設置
- 📦 **repo** - 完整倉庫控制 (必需)
- 📝 **write:packages** - 套件發布 (可選)
- 🔍 **read:user** - 用戶信息 (可選)

### 生命週期管理
- 🔄 **建議**: 90天自動過期
- 🔒 **安全**: 每季度更新一次
- ⚠️ **注意**: "No expiration" 需要手動管理

---

## 🛠️ 故障排除

### 清除舊憑證
```bash
git config --global --unset credential.helper
rm ~/.git-credentials  # macOS/Linux
git config --global credential.helper store
```

### 重新連接倉庫
```bash
git remote set-url origin https://github.com/WuWunKai/chanshuo.git
```

### 測試連接
```bash
git push -u origin main
```

---

## 🎯 成功後的工作流程

```bash
# 1. 修改代碼
git add .
git commit -m "更新功能"

# 2. 推送到 GitHub
git push origin main

# 3. Zeabur 自動部署
# (需要先設置 Zeabur GitHub 連動)
```

---

## 🔗 相關文件

- 📚 **部署指南**: `GITHUB_SETUP_GUIDE.md`
- 🚀 **推送腳本**: `push-to-github.sh`
- 🔧 **修復腳本**: `fix-github.sh`
- 🧪 **測試腳本**: `test-github-token.sh`
- ⭐ **Classic Token 測試**: `test-classic-token.sh` (推薦)

---

## 🆘 常見問題

### Q: Token 提示無效？
A: 確認 Token 以 `ghp_` 開頭，權限包含 `repo`

### Q: 推送被拒絕？
A: 確認倉庫存在，用戶名正確 (`inventra`)

### Q: Permission denied to inventra?
A: 可能是 Fine-grained Token 問題，建議創建 Classic Token

### Q: 每次都要輸入 Token？
A: 確認已設置 `credential.helper store`

### Q: 想更換 Token？
A: 刪除 `~/.git-credentials`，重新推送時輸入新 Token

---

**🎊 設置完成後，您就擁有專業級的 Git 工作流程了！**
