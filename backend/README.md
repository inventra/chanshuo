# 蟬說露營區管理系統 - 後端 API

## 📁 目錄結構

```
backend/
├── app/                    # 主要應用代碼
│   └── main.py            # FastAPI 主應用
├── database/              # 資料庫相關文件
│   ├── schema.sql         # 主要資料庫結構
│   ├── snapshot_schema.sql # 快照系統結構
│   └── init_database.py   # 資料庫初始化腳本
├── scripts/               # 工具和修復腳本
│   ├── fix_database.py    # 資料庫修復工具
│   ├── fix_dates.py       # 日期修復工具
│   ├── fix_weekly_statistics.sql # 週統計修復SQL
│   ├── update_database_final.py # 資料庫更新腳本
│   └── main_backup.py     # 主程序備份
├── data/                  # 數據文件
│   └── 房間資訊.xlsx       # 房間類型數據
├── requirements.txt       # Python 依賴包
└── README.md             # 本文件
```

## 🚀 快速開始

### 1. 安裝依賴
```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置環境變量
```bash
# 創建 .env 文件
echo "DATABASE_URL=postgresql://username:password@localhost/database_name" > .env
echo "API_HOTEL_CODE=2436" >> .env
echo "API_USERNAME=your_username" >> .env
echo "API_PASSWORD=your_password" >> .env
```

### 3. 初始化資料庫
```bash
# 執行資料庫結構創建
python database/init_database.py
```

### 4. 啟動API服務
```bash
cd app
python main.py
```

API 將在 http://localhost:8000 上運行

## 📊 API 端點

### 健康檢查
- `GET /health` - 系統健康狀態

### 房型管理
- `GET /room-types` - 獲取房型列表
- `GET /room-types?hotel_id=2436` - 獲取特定露營區房型

### 庫存管理
- `POST /fetch-inventory/{inv_type_code}` - 獲取特定房型庫存
- `POST /fetch-all-inventory` - 獲取所有庫存數據

### 統計分析
- `GET /weekly-statistics` - 獲取週統計數據
- `POST /calculate-weekly-statistics/{inv_type_code}` - 計算週統計
- `POST /weekly-update` - 執行週更新任務

### Dashboard API
- `GET /dashboard-summary` - 總覽數據
- `GET /dashboard-charts` - 圖表數據
- `GET /room-type-trends/{inv_type_code}` - 房型趨勢
- `GET /sales-status` - 銷售狀況

### 快照管理
- `POST /create-snapshot` - 創建數據快照
- `GET /snapshots` - 獲取快照列表
- `GET /snapshots/{snapshot_id}` - 獲取快照詳情
- `DELETE /snapshots/{snapshot_id}` - 刪除快照
- `GET /compare-snapshots` - 比較快照
- `GET /weekly-changes` - 週變化分析

## 🔧 開發工具

### 資料庫管理
```bash
# 修復資料庫問題
python scripts/fix_database.py

# 修復日期問題  
python scripts/fix_dates.py

# 更新資料庫結構
python scripts/update_database_final.py
```

### 監控和調試
- FastAPI 自動文檔：http://localhost:8000/docs
- Redoc 文檔：http://localhost:8000/redoc

## 🗃️ 資料庫

本系統使用 PostgreSQL 資料庫，主要表結構：

- `room_types` - 房型基本信息
- `inventory_data` - 庫存數據
- `weekly_statistics` - 週統計數據
- `data_snapshots` - 數據快照元數據
- `inventory_snapshots` - 庫存快照數據
- `weekly_statistics_snapshots` - 週統計快照數據

## 🚀 生產環境部署

### Zeabur部署
```bash
# 查看詳細部署指南
cat ZEABUR_DEPLOY.md

# 快速部署檢查
1. 確認Python版本: runtime.txt (3.11.9)
2. 依賴包更新: requirements.txt
3. Docker配置: Dockerfile
4. 環境變量: DATABASE_URL, API_*
```

### Docker本地測試
```bash
# 構建鏡像
docker build -t chanshuo-backend .

# 運行容器
docker run -p 8000:8000 --env-file .env chanshuo-backend
```

## 📝 注意事項

1. 確保PostgreSQL服務正在運行
2. 配置正確的環境變量
3. 定期執行週更新任務 (`/weekly-update`)
4. 建議定期創建數據快照用於備份和分析
5. 生產部署使用Python 3.11.9避免兼容性問題
