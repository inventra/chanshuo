# 🏕️ 蟬說露營區管理系統

一個完整的露營區庫存管理與數據分析系統，包含後端API服務和前端Dashboard。

## 📁 項目結構

```
蟬說露營區管理系統/
├── backend/                    # 後端API服務
│   ├── app/                    # FastAPI應用
│   │   └── main.py            # 主應用文件
│   ├── database/              # 資料庫文件
│   │   ├── schema.sql         # 主要資料庫結構
│   │   ├── snapshot_schema.sql # 快照系統結構
│   │   └── init_database.py   # 資料庫初始化
│   ├── scripts/               # 工具腳本
│   │   ├── fix_database.py    # 資料庫修復
│   │   ├── fix_dates.py       # 日期修復
│   │   └── update_database_final.py # 資料庫更新
│   ├── data/                  # 數據文件
│   │   └── 房間資訊.xlsx       # 房間基礎數據
│   ├── requirements.txt       # Python依賴
│   ├── start.sh              # 啟動腳本
│   ├── env_template.txt      # 環境變量模板
│   └── README.md             # 後端說明文檔
├── front-end/                 # 前端Dashboard
│   └── hotel-dashboard/       # React應用
│       ├── src/               # 源代碼
│       │   ├── pages/         # 頁面組件
│       │   ├── components/    # 共用組件
│       │   ├── services/      # API服務
│       │   ├── types/         # 類型定義
│       │   └── utils/         # 工具函數
│       ├── package.json       # Node.js依賴
│       └── tsconfig.json      # TypeScript配置
├── .env                       # 環境變量配置
└── README.md                  # 本文件
```

## 🚀 快速開始

### 1. 後端API服務

```bash
# 進入後端目錄
cd backend

# 使用啟動腳本（推薦）
./start.sh

# 或手動啟動
pip install -r requirements.txt
cd app
python main.py
```

**API文檔**: http://localhost:8000/docs

### 2. 前端Dashboard

```bash
# 進入前端目錄
cd front-end/hotel-dashboard

# 安裝依賴
npm install

# 啟動開發服務器
npm start
```

**前端界面**: http://localhost:3000

## 🎯 系統功能

### 📊 數據管理
- **房型管理**: 多露營區房型信息管理
- **庫存追蹤**: 實時庫存數據獲取與分析
- **統計計算**: 自動週統計數據計算

### 📈 分析功能
- **總覽儀表板**: 關鍵指標2x2網格展示
- **趨勢分析**: 房型入住率趨勢圖表
- **銷售狀況**: 多維度銷售數據分析
- **快照管理**: 歷史數據快照與比較

### 🎨 設計特色
- **響應式設計**: 完美支持手機、平板、桌面
- **2x2網格布局**: 統一的數據卡片展示
- **漸變色彩**: 美觀的視覺設計
- **智能色彩**: 數據狀態智能色彩映射

## 🏕️ 支持的露營區

- **霧繞** (ID: 2436)
- **霧語** (ID: 2799)  
- **山中靜靜** (ID: 2155)
- **暖硫** (ID: 2656)

## 💾 資料庫

使用PostgreSQL資料庫，主要表結構：
- `room_types` - 房型基本信息
- `inventory_data` - 庫存數據
- `weekly_statistics` - 週統計數據  
- `data_snapshots` - 數據快照系統

## 🔧 開發環境

### 後端技術棧
- **Python 3.8+**
- **FastAPI** - 現代web框架
- **PostgreSQL** - 資料庫
- **asyncpg** - 異步資料庫驅動
- **uvicorn** - ASGI服務器

### 前端技術棧
- **React 18** - UI框架
- **TypeScript** - 類型安全
- **Ant Design** - UI組件庫
- **Recharts** - 圖表庫
- **React Router** - 路由管理

## 📝 配置說明

### 環境變量
複製 `backend/env_template.txt` 為 `backend/.env` 並配置：
```bash
DATABASE_URL=postgresql://user:password@localhost/db_name
API_HOTEL_CODE=2436
API_USERNAME=your_username
API_PASSWORD=your_password
```

### 資料庫初始化
```bash
cd backend/database
python init_database.py
```

## 🎊 特色功能

### 2x2網格布局
所有數據卡片採用統一的2x2網格設計：
- 統一的卡片高度和字體大小
- 漸變背景色彩
- 懸停動畫效果
- 完整響應式適配

### 智能數據快照
- 自動數據快照創建
- 歷史數據比較分析
- 週變化趨勢追蹤
- 可視化差異展示

### 多維度銷售分析
- 露營區篩選
- 房型篩選  
- 時間範圍分析
- 入住率趨勢圖表

## 📖 使用指南

1. **總覽儀表板** - 查看關鍵經營指標
2. **趨勢分析** - 分析特定房型表現趨勢
3. **銷售狀況** - 詳細銷售數據查詢
4. **快照管理** - 歷史數據管理與比較

## 🔮 開發路線圖

- [ ] 用戶權限管理系統
- [ ] 更多數據可視化圖表
- [ ] 自動報告生成
- [ ] 移動端App開發
- [ ] 第三方系統集成

## 📞 技術支持

如有問題或建議，請聯繫開發團隊。

---

**蟬說露營區管理系統** - 讓數據驅動您的露營區經營決策 🌟
