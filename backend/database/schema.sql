-- 創建房型數據庫
CREATE DATABASE hotel_management;

-- 使用數據庫
\c hotel_management;

-- 創建房型表
CREATE TABLE room_types (
    id SERIAL PRIMARY KEY,
    inv_type_code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    total_rooms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 創建庫存數據表
CREATE TABLE inventory_data (
    id SERIAL PRIMARY KEY,
    inv_type_code VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(10) NOT NULL CHECK (status IN ('OPEN', 'CLOSE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inv_type_code) REFERENCES room_types(inv_type_code),
    UNIQUE(inv_type_code, date)
);

-- 創建週統計表
CREATE TABLE weekly_statistics (
    id SERIAL PRIMARY KEY,
    inv_type_code VARCHAR(10) NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    actual_occupancy_rate DECIMAL(5,2), -- 實際入住率
    actual_vacancy_rate DECIMAL(5,2),   -- 實際空房率
    total_occupancy_rate DECIMAL(5,2),  -- 入住率（含壓房＆公休）
    total_vacancy_rate DECIMAL(5,2),    -- 空房率（含壓房＆公休）
    total_rooms INTEGER NOT NULL,
    total_available_days INTEGER NOT NULL, -- 營運天數
    total_days INTEGER NOT NULL DEFAULT 7, -- 總天數
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inv_type_code) REFERENCES room_types(inv_type_code),
    UNIQUE(inv_type_code, week_start_date)
);

-- 創建API調用記錄表
CREATE TABLE api_calls (
    id SERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    inv_type_code VARCHAR(10),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入17個房型的示例數據
INSERT INTO room_types (inv_type_code, name, total_rooms) VALUES
('A', '標準單人房', 5),
('B', '標準雙人房', 8),
('C', '豪華雙人房', 6),
('D', '家庭房', 4),
('E', '套房', 3),
('F', '行政套房', 2),
('G', '總統套房', 1),
('H', '景觀房', 7),
('I', '無障礙房', 2),
('J', '連通房', 4),
('K', '商務房', 6),
('L', '蜜月套房', 2),
('M', '閣樓房', 3),
('N', '園景房', 5),
('O', '海景房', 8),
('P', '山景房', 4),
('Q', '特色主題房', 3);

-- 創建索引以提升查詢效能
CREATE INDEX idx_inventory_data_date ON inventory_data(date);
CREATE INDEX idx_inventory_data_inv_type ON inventory_data(inv_type_code);
CREATE INDEX idx_weekly_statistics_week_start ON weekly_statistics(week_start_date);
CREATE INDEX idx_weekly_statistics_inv_type ON weekly_statistics(inv_type_code);
CREATE INDEX idx_api_calls_created_at ON api_calls(created_at);

-- 創建更新時間觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為房型表添加更新時間觸發器
CREATE TRIGGER update_room_types_updated_at 
    BEFORE UPDATE ON room_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 創建視圖：最新週統計
CREATE VIEW latest_weekly_statistics AS
SELECT 
    ws.*,
    rt.name as room_type_name
FROM weekly_statistics ws
JOIN room_types rt ON ws.inv_type_code = rt.inv_type_code
WHERE ws.week_start_date = (
    SELECT MAX(week_start_date) 
    FROM weekly_statistics ws2 
    WHERE ws2.inv_type_code = ws.inv_type_code
);