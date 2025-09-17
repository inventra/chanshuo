#!/bin/bash

# 🏕️ 蟬說露營區管理系統 - GitHub連接修復腳本

echo "🔧 **GitHub連接修復腳本**"
echo ""

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📋 **請先在GitHub創建您自己的倉庫：**${NC}"
echo ""
echo "1. 訪問: https://github.com/new"
echo "2. Repository name: chanshuo-camping-management"
echo "3. Description: 🏕️ 蟬說露營區管理系統 - 全棧Dashboard與API"
echo "4. 設為 Public (或Private)"
echo "5. ❌ 不要勾選 Add a README file"
echo "6. ❌ 不要勾選 Add .gitignore"
echo "7. ❌ 不要勾選 Choose a license"
echo "8. 點擊 'Create repository'"
echo ""

read -p "已創建GitHub倉庫了嗎？(Y/n): " created
created=${created:-Y}

if [[ ! $created =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}請先創建GitHub倉庫，然後重新運行此腳本${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🔗 **設置GitHub連接：**${NC}"
read -p "您的GitHub用戶名: " username

if [ -z "$username" ]; then
    echo -e "${RED}❌ 用戶名不能為空${NC}"
    exit 1
fi

read -p "倉庫名稱 (預設: chanshuo-camping-management): " repo_name
repo_name=${repo_name:-chanshuo-camping-management}

github_url="https://github.com/${username}/${repo_name}.git"

echo ""
echo -e "${BLUE}📡 **添加GitHub遠程倉庫...**${NC}"
if git remote add origin "$github_url"; then
    echo -e "${GREEN}✅ GitHub遠程倉庫添加成功${NC}"
else
    echo -e "${RED}❌ 添加失敗，可能已存在${NC}"
    echo "嘗試更新連接..."
    git remote set-url origin "$github_url"
fi

echo ""
echo -e "${BLUE}📤 **推送代碼到GitHub...**${NC}"
echo "如果提示輸入密碼，請使用GitHub Personal Access Token"
echo ""

if git push -u origin main; then
    echo ""
    echo -e "${GREEN}🎉 **GitHub連接修復成功！**${NC}"
    echo ""
    echo -e "${GREEN}✅ 代碼已推送到: https://github.com/${username}/${repo_name}${NC}"
    echo ""
    echo -e "${BLUE}🔗 **下一步：設置Zeabur自動部署**${NC}"
    echo "1. 登錄 https://dash.zeabur.com"
    echo "2. 選擇您的項目"
    echo "3. Settings → Git → Connect to GitHub"
    echo "4. 選擇倉庫: ${repo_name}"
    echo "5. 設置分支: main"
    echo "6. 設置Dockerfile: Dockerfile.zeabur"
    echo "7. 配置環境變量"
    echo ""
    echo -e "${YELLOW}📖 詳細指南: cat GITHUB_SETUP_GUIDE.md${NC}"
    echo ""
    echo -e "${GREEN}🎯 **完成後您就可以：**${NC}"
    echo "   本地修改 → git push → Zeabur自動部署 ✨"
    
else
    echo ""
    echo -e "${YELLOW}⚠️  推送可能失敗，常見解決方案：${NC}"
    echo ""
    echo "1. **認證問題**："
    echo "   - 使用Personal Access Token代替密碼"
    echo "   - 設置方法: GitHub Settings → Developer settings → Personal access tokens"
    echo ""
    echo "2. **倉庫不存在**："
    echo "   - 確認已在GitHub創建倉庫"
    echo "   - 確認倉庫名稱正確"
    echo ""
    echo "3. **手動重試**："
    echo "   git push -u origin main"
    echo ""
    echo "🔗 倉庫地址: https://github.com/${username}/${repo_name}"
fi

echo ""
echo -e "${BLUE}📊 **檢查連接狀態：**${NC}"
git remote -v
