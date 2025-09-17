#!/bin/bash

# 🏕️ 蟬說露營區管理系統 - GitHub推送腳本

echo "🚀 **推送蟬說露營區管理系統到GitHub**"
echo ""

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📊 **檢查當前狀態：**${NC}"
echo "✅ 本地倉庫: $(pwd)"
echo "✅ 遠程倉庫: $(git remote get-url origin)"
echo "✅ 當前分支: $(git branch --show-current)"
echo ""

echo -e "${BLUE}📦 **檢查待推送內容：**${NC}"
echo "📁 總文件數: $(find . -type f ! -path './.git/*' | wc -l | xargs)"
echo "📝 提交數: $(git rev-list --count HEAD)"
echo ""

echo -e "${BLUE}📤 **開始推送到GitHub...**${NC}"
echo ""

if git push -u origin main; then
    echo ""
    echo -e "${GREEN}🎉 **推送成功！** 🎉${NC}"
    echo ""
    echo -e "${GREEN}✅ **您的蟬說露營區管理系統已上傳到GitHub！**${NC}"
    echo ""
    echo -e "${BLUE}🔗 **倉庫地址：**${NC}"
    echo "   https://github.com/WuWunKai/chanshuo"
    echo ""
    echo -e "${BLUE}📋 **包含的功能：**${NC}"
    echo "   🏠 房間管理系統"
    echo "   📊 庫存數據Dashboard"
    echo "   📈 銷售狀況分析"
    echo "   📸 數據快照管理"
    echo "   🎨 響應式設計"
    echo "   🐳 Docker部署配置"
    echo ""
    echo -e "${YELLOW}🔥 **下一步：設置Zeabur自動部署**${NC}"
    echo ""
    echo "1. 🌐 登錄: https://dash.zeabur.com"
    echo "2. ➕ 創建新項目或選擇現有項目"
    echo "3. 🔗 Add Service → Deploy from GitHub"
    echo "4. 📁 選擇倉庫: WuWunKai/chanshuo"
    echo "5. 🌿 設置分支: main"
    echo "6. 🐳 Dockerfile: Dockerfile.zeabur"
    echo "7. ⚙️ 配置環境變量:"
    echo "     DATABASE_URL=your_database_url"
    echo "     API_HOTEL_CODE=your_hotel_code"
    echo "     API_USERNAME=your_username"
    echo "     API_PASSWORD=your_password"
    echo "8. 🚀 點擊 Deploy"
    echo ""
    echo -e "${GREEN}🎯 **完成後您就能實現：**${NC}"
    echo "   本地修改 → git push → Zeabur自動部署！"
    echo ""
    echo -e "${BLUE}📚 **詳細指南：**${NC}"
    echo "   cat GITHUB_SETUP_GUIDE.md"
    
else
    echo ""
    echo -e "${RED}❌ **推送失敗**${NC}"
    echo ""
    echo -e "${YELLOW}🔧 **可能的解決方案：**${NC}"
    echo ""
    echo "1. **倉庫不存在**："
    echo "   - 確認已在GitHub創建倉庫: WuWunKai/chanshuo"
    echo "   - 訪問: https://github.com/WuWunKai/chanshuo"
    echo ""
    echo "2. **認證問題**："
    echo "   - 使用Personal Access Token代替密碼"
    echo "   - GitHub Settings → Developer settings → Personal access tokens"
    echo "   - 範圍選擇: repo (完整控制)"
    echo ""
    echo "3. **網絡問題**："
    echo "   - 檢查網絡連接"
    echo "   - 稍後重試: git push -u origin main"
    echo ""
    echo -e "${BLUE}🆘 **如需幫助：**${NC}"
    echo "   - 檢查倉庫: https://github.com/WuWunKai/chanshuo"
    echo "   - 重新運行: ./push-to-github.sh"
fi

echo ""
echo -e "${BLUE}📊 **檢查最終狀態：**${NC}"
echo "遠程連接: $(git remote -v | head -1)"
echo "本地分支: $(git branch --show-current)"
echo "最新提交: $(git log --oneline -1)"
