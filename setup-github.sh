#!/bin/bash

# 🏕️ 蟬說露營區管理系統 - GitHub連動設置腳本

echo "🚀 **蟬說露營區管理系統 - GitHub連動設置**"
echo ""

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查是否已有遠程倉庫
if git remote get-url origin > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  已存在GitHub連接${NC}"
    echo "當前連接: $(git remote get-url origin)"
    echo ""
    read -p "是否要更換GitHub倉庫？(y/N): " change_repo
    if [[ $change_repo =~ ^[Yy]$ ]]; then
        git remote remove origin
        echo -e "${GREEN}✅ 已移除舊的GitHub連接${NC}"
    else
        echo "保持現有連接，跳過設置。"
        exit 0
    fi
fi

# 獲取GitHub用戶名
echo -e "${BLUE}📝 請輸入您的GitHub信息：${NC}"
read -p "GitHub用戶名: " github_username

if [ -z "$github_username" ]; then
    echo -e "${RED}❌ GitHub用戶名不能為空${NC}"
    exit 1
fi

# 獲取倉庫名稱
echo ""
echo -e "${BLUE}📦 倉庫設置：${NC}"
read -p "倉庫名稱 (預設: chanshuo-camping-management): " repo_name
repo_name=${repo_name:-chanshuo-camping-management}

# 構建GitHub URL
github_url="https://github.com/${github_username}/${repo_name}.git"

echo ""
echo -e "${BLUE}🔗 準備連接到: ${NC}${github_url}"
echo ""

# 添加遠程倉庫
echo -e "${BLUE}📡 添加GitHub遠程倉庫...${NC}"
if git remote add origin "$github_url"; then
    echo -e "${GREEN}✅ GitHub遠程倉庫添加成功${NC}"
else
    echo -e "${RED}❌ 添加GitHub遠程倉庫失敗${NC}"
    exit 1
fi

# 詢問是否立即推送
echo ""
read -p "是否立即推送代碼到GitHub？(Y/n): " push_now
push_now=${push_now:-Y}

if [[ $push_now =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}📤 推送代碼到GitHub...${NC}"
    echo "這可能需要您輸入GitHub密碼或Token"
    
    if git push -u origin main; then
        echo ""
        echo -e "${GREEN}🎉 **GitHub連動設置完成！**${NC}"
        echo ""
        echo -e "${GREEN}✅ 代碼已成功推送到GitHub${NC}"
        echo -e "${GREEN}✅ 倉庫地址: https://github.com/${github_username}/${repo_name}${NC}"
        echo ""
        echo -e "${BLUE}🔗 **下一步：設置Zeabur自動部署**${NC}"
        echo "1. 訪問 https://dash.zeabur.com"
        echo "2. 選擇您的項目"
        echo "3. 連接到GitHub倉庫: ${repo_name}"
        echo "4. 設置自動部署分支: main"
        echo "5. 配置環境變量"
        echo ""
        echo -e "${YELLOW}📖 詳細指南: cat GITHUB_SETUP_GUIDE.md${NC}"
        
    else
        echo ""
        echo -e "${YELLOW}⚠️  推送失敗，可能需要：${NC}"
        echo "1. 先在GitHub創建倉庫: https://github.com/new"
        echo "2. 設置GitHub認證 (Personal Access Token)"
        echo "3. 手動執行: git push -u origin main"
    fi
else
    echo ""
    echo -e "${YELLOW}📋 **GitHub連接已設置，但未推送代碼**${NC}"
    echo ""
    echo "手動推送命令："
    echo -e "${BLUE}git push -u origin main${NC}"
    echo ""
    echo "記得先在GitHub創建倉庫："
    echo -e "${BLUE}https://github.com/new${NC}"
fi

echo ""
echo -e "${GREEN}🎯 **工作流程預覽：**${NC}"
echo "1. 本地修改代碼"
echo "2. git add . && git commit -m \"更新描述\""
echo "3. git push origin main"
echo "4. Zeabur自動部署"
echo "5. 線上服務更新完成"

echo ""
echo -e "${BLUE}📚 **有用的Git命令：**${NC}"
echo "查看狀態: git status"
echo "查看歷史: git log --oneline"
echo "檢查遠程: git remote -v"
