import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ApiResponse,
  RoomType,
  WeeklyStatistics,
  DataSnapshot,
  DashboardSummary,
  RoomTypeTrends,
  DashboardCharts,
  SnapshotComparison,
  WeeklyChanges,
  InventoryData,
  SalesStatus
} from '../types/api';

// API 基礎配置
// 生產環境使用相對路徑 /api，開發環境使用完整URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000');

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 請求攔截器
    this.api.interceptors.request.use(
      (config) => {
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // 響應攔截器
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // ===================
  // 基礎健康檢查
  // ===================
  async healthCheck(): Promise<{ status: string; database: string }> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // ===================
  // 房型管理 API
  // ===================
  async getRoomTypes(hotelId?: string): Promise<RoomType[]> {
    const params = hotelId ? { hotel_id: hotelId } : {};
    const response = await this.api.get('/room-types', { params });
    return response.data;
  }

  // ===================
  // 庫存管理 API
  // ===================
  async fetchInventory(
    invTypeCode: string,
    startDate: string,
    endDate: string,
    hotelId: string
  ): Promise<ApiResponse> {
    const response = await this.api.post(
      `/fetch-inventory/${invTypeCode}?hotel_id=${hotelId}&start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  }

  async fetchAllInventory(
    startDate: string,
    endDate: string,
    hotelId?: string
  ): Promise<ApiResponse> {
    const params = { start_date: startDate, end_date: endDate };
    if (hotelId) {
      (params as any).hotel_id = hotelId;
    }
    const response = await this.api.post('/fetch-all-inventory', null, { params });
    return response.data;
  }

  // ===================
  // 週統計 API
  // ===================
  async calculateWeeklyStatistics(
    invTypeCode: string,
    weekStartDate: string,
    hotelId: string
  ): Promise<ApiResponse> {
    const response = await this.api.post(
      `/calculate-weekly-statistics/${invTypeCode}?hotel_id=${hotelId}&week_start_date=${weekStartDate}`
    );
    return response.data;
  }

  async getWeeklyStatistics(
    invTypeCode?: string,
    weeks?: number,
    hotelId?: string
  ): Promise<WeeklyStatistics[]> {
    const params: any = {};
    if (invTypeCode) params.inv_type_code = invTypeCode;
    if (weeks) params.weeks = weeks;
    if (hotelId) params.hotel_id = hotelId;

    const response = await this.api.get('/weekly-statistics', { params });
    return response.data;
  }

  // ===================
  // 週更新 API
  // ===================
  async runWeeklyUpdate(): Promise<ApiResponse> {
    const response = await this.api.post('/weekly-update');
    return response.data;
  }

  // ===================
  // 快照管理 API
  // ===================
  async createSnapshot(description?: string): Promise<ApiResponse<{ snapshot_id: number }>> {
    const params = description ? { description } : {};
    const response = await this.api.post('/create-snapshot', null, { params });
    return response.data;
  }

  async getSnapshots(limit: number = 10): Promise<ApiResponse<{ count: number; snapshots: DataSnapshot[] }>> {
    const response = await this.api.get('/snapshots', { params: { limit } });
    return response.data;
  }

  async getSnapshotDetail(snapshotId: number): Promise<ApiResponse<{ snapshot: DataSnapshot }>> {
    const response = await this.api.get(`/snapshots/${snapshotId}`);
    return response.data;
  }

  async deleteSnapshot(snapshotId: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/snapshots/${snapshotId}`);
    return response.data;
  }

  // ===================
  // 比較分析 API
  // ===================
  async compareSnapshots(fromDate: string, toDate: string): Promise<SnapshotComparison> {
    const response = await this.api.get('/compare-snapshots', {
      params: { from_date: fromDate, to_date: toDate },
    });
    return response.data;
  }

  async getWeeklyChanges(weeks: number = 4, hotelId?: string): Promise<WeeklyChanges> {
    const params: any = { weeks };
    if (hotelId) params.hotel_id = hotelId;

    const response = await this.api.get('/weekly-changes', { params });
    return response.data;
  }

  // ===================
  // Dashboard 專用 API
  // ===================
  async getDashboardSummary(hotelId?: string): Promise<DashboardSummary> {
    const params = hotelId ? { hotel_id: hotelId } : {};
    const response = await this.api.get('/dashboard-summary', { params });
    return response.data;
  }

  async getRoomTypeTrends(
    invTypeCode: string,
    hotelId: string,
    weeks: number = 12
  ): Promise<RoomTypeTrends> {
    const response = await this.api.get(`/room-type-trends/${invTypeCode}`, {
      params: { hotel_id: hotelId, weeks },
    });
    return response.data;
  }

  async getDashboardCharts(hotelId?: string, weeks: number = 8): Promise<DashboardCharts> {
    const params: any = { weeks };
    if (hotelId) params.hotel_id = hotelId;

    const response = await this.api.get('/dashboard-charts', { params });
    return response.data;
  }

  // ===================
  // 銷售狀況 API
  // ===================
  async getSalesStatus(params: {
    start_date: string;
    end_date: string;
    hotel_id?: string;
    inv_type_code?: string;
  }): Promise<SalesStatus> {
    const searchParams = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
    });
    
    if (params.hotel_id) {
      searchParams.append('hotel_id', params.hotel_id);
    }
    
    if (params.inv_type_code) {
      searchParams.append('inv_type_code', params.inv_type_code);
    }
    
    const response = await this.api.get(`/sales-status?${searchParams}`);
    return response.data;
  }

  // ===================
  // 房間管理 API
  // ===================
  
  // 更新房間類型
  async updateRoomType(roomId: number, data: {
    name: string;
    total_rooms: number;
  }): Promise<RoomType> {
    const response = await this.api.put(`/room-types/${roomId}`, data);
    return response.data;
  }

  // 創建房間類型
  async createRoomType(data: {
    inv_type_code: string;
    name: string;
    total_rooms: number;
    hotel_id: string;
  }): Promise<RoomType> {
    const response = await this.api.post('/room-types', data);
    return response.data;
  }

  // 刪除房間類型
  async deleteRoomType(roomId: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/room-types/${roomId}`);
    return response.data;
  }
}

// 創建單例實例
const apiService = new ApiService();

export default apiService;
export { ApiService };
