// API 響應基礎類型
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// 房型類型
export interface RoomType {
  id: number;
  inv_type_code: string;
  name: string;
  total_rooms: number;
  hotel_id: string;
  hotel_name?: string;
  created_at: string;
  updated_at: string;
}

// 庫存數據類型
export interface InventoryData {
  date: string;
  quantity: number;
  status: 'OPEN' | 'CLOSE';
}

// 週統計類型
export interface WeeklyStatistics {
  id?: number;
  inv_type_code: string;
  hotel_id: string;
  hotel_name?: string;
  week_start_date: string;
  week_end_date: string;
  actual_occupancy_rate: number;
  actual_vacancy_rate: number;
  total_occupancy_rate: number;
  total_vacancy_rate: number;
  total_rooms: number;
  total_available_days: number;
  total_days: number;
  created_at?: string;
}

// 快照類型
export interface DataSnapshot {
  id: number;
  snapshot_date: string;
  snapshot_time: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_records: number;
  created_by: string;
  room_types_count?: number;
  hotels_count?: number;
  earliest_week?: string;
  latest_week?: string;
}

// Dashboard 摘要類型
export interface DashboardSummary {
  success: boolean;
  summary: {
    total_hotels: number;
    total_room_types: number;
    avg_occupancy_rate: number;
    data_period: string;
    best_performer: {
      room_type: string;
      hotel_id: string;
      hotel_name?: string;
      occupancy_rate: number;
    } | null;
    worst_performer: {
      room_type: string;
      hotel_id: string;
      hotel_name?: string;
      occupancy_rate: number;
    } | null;
  };
  latest_snapshot: DataSnapshot | null;
  room_types_overview: Array<{
    inv_type_code: string;
    hotel_id: string;
    hotel_name?: string;
    avg_occupancy: number;
    weeks_count: number;
  }>;
}

// 房型趨勢類型
export interface RoomTypeTrends {
  success: boolean;
  room_type: RoomType;
  period: string;
  data_points: WeeklyStatistics[];
  insights: {
    trend_direction: '上升' | '下降' | '穩定' | '數據不足';
    occupancy_change: number;
    peak_week: {
      date: string;
      occupancy_rate: number;
    } | null;
    lowest_week: {
      date: string;
      occupancy_rate: number;
    } | null;
    average_occupancy: number;
  };
}

// Dashboard 圖表數據類型
export interface DashboardCharts {
  success: boolean;
  charts: {
    occupancy_trends: Array<{
      week_start_date: string;
      avg_occupancy: number;
      room_types_count: number;
    }>;
    room_performance_heatmap: Array<{
      inv_type_code: string;
      hotel_id: string;
      hotel_name?: string;
      week_start_date: string;
      actual_occupancy_rate: number;
    }>;
    hotel_comparison: Array<{
      hotel_id: string;
      hotel_name?: string;
      avg_occupancy: number;
      total_weeks: number;
      room_types_count: number;
    }>;
  };
  metadata: {
    period: string;
    hotel_id: string | null;
    data_points: number;
  };
}

// 快照比較類型
export interface SnapshotComparison {
  success: boolean;
  comparison: {
    period: {
      from: string;
      to: string;
    };
    from_snapshot: DataSnapshot;
    to_snapshot: DataSnapshot;
    summary: {
      total_changes: number;
      new_records: number;
      removed_records: number;
      modified_records: number;
      biggest_increase: any | null;
      biggest_decrease: any | null;
    };
    changes: Array<{
      inv_type_code: string;
      hotel_id: string;
      hotel_name?: string;
      week_start_date: string;
      from_occupancy: number | null;
      to_occupancy: number | null;
      change_type: 'new' | 'removed' | 'changed' | 'unchanged';
      occupancy_diff: number | null;
    }>;
  };
}

// 週變化趨勢類型
export interface WeeklyChanges {
  success: boolean;
  weeks_analyzed: number;
  period: string;
  changes: Array<{
    period: string;
    summary: {
      total_changes: number;
      new_records: number;
      removed_records: number;
      modified_records: number;
    };
    key_changes: Array<{
      inv_type_code: string;
      hotel_id: string;
      hotel_name?: string;
      week_start_date: string;
      change_type: string;
      occupancy_diff: number | null;
    }>;
  }>;
}

// 銷售狀況類型
export interface SalesStatus {
  success: boolean;
  period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_rooms: number;
    total_sold: number;
    total_available: number;
    avg_occupancy_rate: number;
    total_days: number;
  };
  daily_data: Array<{
    date: string;
    total_rooms: number;
    sold_rooms: number;
    available_rooms: number;
    occupancy_rate: number;
  }>;
  detailed_data: Array<{
    date: string;
    inv_type_code: string;
    hotel_id: string;
    hotel_name?: string;
    room_type_name: string;
    total_rooms: number;
    available_rooms: number;
    status: 'OPEN' | 'CLOSE';
    sold_rooms: number;
    occupancy_rate: number;
  }>;
  room_type_performance: Array<{
    inv_type_code: string;
    hotel_id: string;
    hotel_name?: string;
    room_type_name: string;
    avg_sold_rooms: number;
    avg_total_rooms: number;
    avg_occupancy_rate: number;
  }>;
}
