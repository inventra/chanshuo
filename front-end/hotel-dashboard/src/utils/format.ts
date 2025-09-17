import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-tw';

// 載入插件
dayjs.extend(relativeTime);

// 設置中文本地化
dayjs.locale('zh-tw');

/**
 * 格式化日期
 */
export const formatDate = (date: string | Date, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

/**
 * 格式化日期時間
 */
export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * 格式化百分比
 */
export const formatPercent = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * 格式化數字（千分位）
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('zh-TW').format(value);
};

/**
 * 獲取相對時間
 */
export const getRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow();
};

/**
 * 獲取週日期範圍
 */
export const getWeekRange = (weekStart: string): string => {
  const start = dayjs(weekStart);
  const end = start.add(6, 'day');
  return `${start.format('MM/DD')} - ${end.format('MM/DD')}`;
};

/**
 * 獲取趨勢方向圖標
 */
export const getTrendIcon = (direction: '上升' | '下降' | '穩定' | '數據不足'): string => {
  switch (direction) {
    case '上升':
      return '📈';
    case '下降':
      return '📉';
    case '穩定':
      return '➡️';
    case '數據不足':
      return '❓';
    default:
      return '➡️';
  }
};

/**
 * 獲取入住率顏色
 */
export const getOccupancyColor = (rate: number): string => {
  if (rate >= 80) return '#52c41a'; // 綠色 - 高入住率
  if (rate >= 60) return '#faad14'; // 橙色 - 中等入住率
  if (rate >= 40) return '#fa8c16'; // 橙紅色 - 低入住率
  return '#f5222d'; // 紅色 - 很低入住率
};

/**
 * 獲取狀態標籤
 */
export const getStatusTag = (status: string): { color: string; text: string } => {
  switch (status) {
    case 'completed':
      return { color: 'success', text: '完成' };
    case 'processing':
      return { color: 'processing', text: '處理中' };
    case 'pending':
      return { color: 'warning', text: '等待中' };
    case 'failed':
      return { color: 'error', text: '失敗' };
    default:
      return { color: 'default', text: status };
  }
};

// 露營區名稱映射
const HOTEL_NAMES: { [key: string]: string } = {
  "2436": "霧繞",
  "2799": "霧語",
  "2155": "山中靜靜", 
  "2656": "暖硫"
};

/**
 * 格式化蟬說露營區ID顯示 - 優先顯示中文名稱
 */
export const formatHotelId = (hotelId: string, hotelName?: string): string => {
  if (hotelName) {
    return hotelName;
  }
  return HOTEL_NAMES[hotelId] || `蟬說露營區 ${hotelId}`;
};

/**
 * 計算變化百分比
 */
export const calculateChangePercent = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * 獲取變化顯示
 */
export const getChangeDisplay = (change: number): { color: string; prefix: string } => {
  if (change > 0) {
    return { color: '#52c41a', prefix: '+' };
  } else if (change < 0) {
    return { color: '#f5222d', prefix: '' };
  } else {
    return { color: '#8c8c8c', prefix: '' };
  }
};
