#!/bin/bash

# 🔑 GitHub Classic Personal Access Token 測試腳本

echo "🔑 **GitHub Classic Token 測試腳本**"
echo ""

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📋 **Classic Token 創建指南：**${NC}"
echo ""
echo "1. 🌐 訪問: https://github.com/settings/tokens"
echo "2. ➕ Generate new token → Generate new token (classic)"
echo "3. 📝 Note: 蟬說露營區管理系統-$(date +%Y%m%d)"
echo "4. ⏰ Expiration: 90 days (或 No expiration)"
echo "5. ✅ Select scopes: ☑️ repo (完整倉庫控制)"
echo "6. ✅ Generate token"
echo "7. 📋 複製 Token (格式: ghp_xxxxxxxxxxxxxxxxxxxx)"
echo ""

read -p "已創建 Classic Token 了嗎？(Y/n): " created
created=${created:-Y}

if [[ ! $created =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}請先創建 Classic Token，然後重新運行此腳本${NC}"
    exit 0
fi

echo ""
read -p "請輸入您的 Classic Token (ghp_...): " classic_token

if [ -z "$classic_token" ]; then
    echo -e "${RED}❌ Token 不能為空${NC}"
    exit 1
fi

# 檢查 Token 格式
if [[ ! $classic_token =~ ^ghp_ ]]; then
    echo -e "${YELLOW}⚠️ 注意：Classic Token 應該以 'ghp_' 開頭${NC}"
    echo "如果您使用的是 Fine-grained Token (github_pat_...)，請先創建 Classic Token"
    echo ""
    read -p "確定要繼續嗎？(y/N): " continue_anyway
    continue_anyway=${continue_anyway:-N}
    if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

echo ""
echo -e "${BLUE}🧪 **驗證 Token 有效性...**${NC}"

# 測試 Token
token_check=$(curl -s -H "Authorization: token $classic_token" "https://api.github.com/user" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'login' in data:
        print(f'✅ Token有效! 用戶: {data.get(\"login\")}')
        print(f'📧 Email: {data.get(\"email\", \"未設置\")}')
    else:
        print(f'❌ Token無效: {data.get(\"message\", \"未知錯誤\")}')
        exit(1)
except Exception as e:
    print(f'❌ 檢查失敗: {e}')
    exit(1)
")

echo "$token_check"

if [[ $token_check == *"❌"* ]]; then
    echo -e "${RED}Token 驗證失敗，請檢查 Token 是否正確${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔄 **清除舊憑證並設置新 Token...**${NC}"

# 清除舊憑證
rm -f ~/.git-credentials

# 設置新的遠程 URL
git remote set-url origin "https://inventra:${classic_token}@github.com/inventra/chanshuo.git"

echo "✅ 已設置新的 Classic Token"

echo ""
echo -e "${BLUE}🚀 **推送代碼到 GitHub...**${NC}"

if git push -u origin main; then
    echo ""
    echo -e "${GREEN}🎉 **成功！代碼已推送到 GitHub！**${NC}"
    echo ""
    echo -e "${GREEN}✅ **您的蟬說露營區管理系統已上傳！**${NC}"
    echo ""
    echo -e "${BLUE}🔗 **查看倉庫：**${NC}"
    echo "   https://github.com/inventra/chanshuo"
    echo ""
    echo -e "${BLUE}📋 **包含的完整功能：**${NC}"
    echo "   🏠 房間管理系統 (CRUD)"
    echo "   📊 庫存數據 Dashboard"
    echo "   📈 銷售狀況分析"
    echo "   📸 數據快照管理"
    echo "   🎨 響應式 RWD 設計"
    echo "   🐳 Docker 全棧部署"
    echo "   🔧 GitHub 連動腳本"
    echo ""
    echo -e "${YELLOW}🚀 **下一步：設置 Zeabur 自動部署**${NC}"
    echo "   詳細指南: cat GITHUB_SETUP_GUIDE.md"
    echo ""
    echo -e "${GREEN}🎯 **以後推送代碼只需：**${NC}"
    echo "   git add ."
    echo "   git commit -m \"更新功能\""
    echo "   git push origin main"
    echo "   (會自動部署到 Zeabur！)"
    
else
    echo ""
    echo -e "${RED}❌ **推送失敗**${NC}"
    echo ""
    echo -e "${YELLOW}🔧 **可能的解決方案：**${NC}"
    echo ""
    echo "1. **Token 權限問題**："
    echo "   - 確認勾選了 'repo' 權限"
    echo "   - 重新創建 Token 並確保是 Classic Token"
    echo ""
    echo "2. **倉庫問題**："
    echo "   - 確認 inventra/chanshuo 倉庫存在"
    echo "   - 訪問: https://github.com/inventra/chanshuo"
    echo ""
    echo "3. **重新嘗試**："
    echo "   ./test-classic-token.sh"
fi

echo ""
echo -e "${BLUE}📊 **最終狀態檢查：**${NC}"
echo "遠程連接: $(git remote get-url origin | sed 's/:.*@/:TOKEN@/')"
echo "本地分支: $(git branch --show-current)"
echo "最新提交: $(git log --oneline -1)"
