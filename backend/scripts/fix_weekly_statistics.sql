-- 創建週統計表
CREATE TABLE IF NOT EXISTS weekly_statistics (
    id SERIAL PRIMARY KEY,
    inv_type_code VARCHAR(10) NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    actual_occupancy_rate DECIMAL(5,2),
    actual_vacancy_rate DECIMAL(5,2),
    total_occupancy_rate DECIMAL(5,2),
    total_vacancy_rate DECIMAL(5,2),
    total_rooms INTEGER NOT NULL,
    total_available_days INTEGER NOT NULL,
    total_days INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inv_type_code) REFERENCES room_types(inv_type_code),
    UNIQUE(inv_type_code, week_start_date)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_weekly_statistics_week_start ON weekly_statistics(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_statistics_inv_type ON weekly_statistics(inv_type_code);

-- 創建更新時間觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為房型表添加更新時間觸發器
DROP TRIGGER IF EXISTS update_room_types_updated_at ON room_types;
CREATE TRIGGER update_room_types_updated_at 
    BEFORE UPDATE ON room_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 創建視圖：最新週統計
DROP VIEW IF EXISTS latest_weekly_statistics;
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