-- ================================
-- 快照系統資料庫結構
-- ================================

-- 1. 快照元數據表
CREATE TABLE IF NOT EXISTS data_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    snapshot_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_records INTEGER DEFAULT 0,
    created_by VARCHAR(50) DEFAULT 'system',
    UNIQUE(snapshot_date)
);

-- 2. 庫存快照表  
CREATE TABLE IF NOT EXISTS inventory_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_id INTEGER REFERENCES data_snapshots(id) ON DELETE CASCADE,
    inv_type_code VARCHAR(10) NOT NULL,
    hotel_id VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(10) NOT NULL CHECK (status IN ('OPEN', 'CLOSE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 週統計快照表
CREATE TABLE IF NOT EXISTS weekly_statistics_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_id INTEGER REFERENCES data_snapshots(id) ON DELETE CASCADE,
    inv_type_code VARCHAR(10) NOT NULL,
    hotel_id VARCHAR(10) NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    actual_occupancy_rate DECIMAL(5,2),
    actual_vacancy_rate DECIMAL(5,2),
    total_occupancy_rate DECIMAL(5,2),
    total_vacancy_rate DECIMAL(5,2),
    total_rooms INTEGER NOT NULL,
    total_available_days INTEGER NOT NULL,
    total_days INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 創建視圖：最新快照摘要
CREATE OR REPLACE VIEW latest_snapshot_summary AS
SELECT 
    ds.id,
    ds.snapshot_date,
    ds.snapshot_time,
    ds.description,
    ds.status,
    ds.total_records,
    COUNT(DISTINCT CONCAT(ws.inv_type_code, ws.hotel_id)) as room_types_count,
    COUNT(DISTINCT ws.hotel_id) as hotels_count,
    MIN(ws.week_start_date) as earliest_week,
    MAX(ws.week_start_date) as latest_week
FROM data_snapshots ds
LEFT JOIN weekly_statistics_snapshots ws ON ds.id = ws.snapshot_id
WHERE ds.status = 'completed'
GROUP BY ds.id, ds.snapshot_date, ds.snapshot_time, ds.description, ds.status, ds.total_records
ORDER BY ds.snapshot_date DESC;

-- 5. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_lookup 
ON inventory_snapshots(snapshot_id, inv_type_code, hotel_id, date);

CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_lookup 
ON weekly_statistics_snapshots(snapshot_id, inv_type_code, hotel_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_snapshots_date 
ON data_snapshots(snapshot_date DESC);

-- 6. 創建清理舊快照的函數（可選）
CREATE OR REPLACE FUNCTION cleanup_old_snapshots(keep_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM data_snapshots 
    WHERE snapshot_date < CURRENT_DATE - INTERVAL '1 day' * keep_days
    AND status = 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
