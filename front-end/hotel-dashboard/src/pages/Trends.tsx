import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Typography,
  Space,
  Spin,
  Alert,
  Statistic,
  Tag,
  Table,
  DatePicker,
  InputNumber,
} from 'antd';
import {
  LineChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import dayjs from 'dayjs';
import apiService from '../services/api';
import { RoomType, RoomTypeTrends, DashboardCharts } from '../types/api';
import {
  formatPercent,
  formatDate,
  getTrendIcon,
  getOccupancyColor,
  formatHotelId,
  getWeekRange,
} from '../utils/format';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Trends: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<string | undefined>(undefined);
  const [selectedHotel, setSelectedHotel] = useState<string | undefined>(undefined);
  const [weeks, setWeeks] = useState<number>(12);
  const [trends, setTrends] = useState<RoomTypeTrends | null>(null);
  const [heatmapData, setHeatmapData] = useState<DashboardCharts | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 載入基礎數據
  const loadBaseData = async () => {
    try {
      setLoading(true);
      const roomTypesData = await apiService.getRoomTypes();
      setRoomTypes(roomTypesData);
      
      if (roomTypesData.length > 0) {
        setSelectedHotel(roomTypesData[0].hotel_id);
        setSelectedRoomType(roomTypesData[0].inv_type_code);
      }
    } catch (err: any) {
      setError(err.message || '載入基礎數據失敗');
    } finally {
      setLoading(false);
    }
  };

  // 載入趨勢數據
  const loadTrendData = async () => {
    if (!selectedRoomType || !selectedHotel) return;
    
    try {
      setTrendLoading(true);
      setError(null);

      const [trendData, heatmapData] = await Promise.all([
        apiService.getRoomTypeTrends(selectedRoomType, selectedHotel, weeks),
        apiService.getDashboardCharts(selectedHotel, weeks),
      ]);

      setTrends(trendData);
      setHeatmapData(heatmapData);
    } catch (err: any) {
      setError(err.message || '載入趨勢數據失敗');
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (selectedRoomType && selectedHotel) {
      loadTrendData();
    }
  }, [selectedRoomType, selectedHotel, weeks]);

  // 獲取當前蟬說露營區的房型
  const getCurrentHotelRoomTypes = () => {
    return roomTypes.filter(rt => rt.hotel_id === selectedHotel);
  };

  // 獲取唯一的蟬說露營區ID列表
  const getUniqueHotels = () => {
    const hotelIds = roomTypes.map(rt => rt.hotel_id);
    return [...new Set(hotelIds)];
  };

  // 準備趨勢圖表數據
  const prepareTrendData = () => {
    if (!trends?.data_points) return [];
    return trends.data_points
      .sort((a, b) => new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime())
      .map(item => ({
        week: getWeekRange(item.week_start_date),
        occupancy: item.actual_occupancy_rate,
        vacancy: item.actual_vacancy_rate,
        date: item.week_start_date,
      }));
  };

  // 準備熱力圖數據
  const prepareHeatmapData = () => {
    if (!heatmapData?.charts.room_performance_heatmap) return [];
    
    return heatmapData.charts.room_performance_heatmap.map(item => ({
      roomType: item.inv_type_code,
      week: getWeekRange(item.week_start_date),
      occupancy: item.actual_occupancy_rate,
      date: item.week_start_date,
    }));
  };

  // 準備表格數據
  const prepareTableData = () => {
    if (!trends?.data_points) return [];
    return trends.data_points
      .sort((a, b) => new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime())
      .map((item, index) => ({
        key: index,
        week: getWeekRange(item.week_start_date),
        week_start_date: item.week_start_date,
        actual_occupancy_rate: item.actual_occupancy_rate,
        actual_vacancy_rate: item.actual_vacancy_rate,
        total_rooms: item.total_rooms,
        total_available_days: item.total_available_days,
      }));
  };

  const tableColumns = [
    {
      title: '週期',
      dataIndex: 'week',
      key: 'week',
    },
    {
      title: '入住率',
      dataIndex: 'actual_occupancy_rate',
      key: 'actual_occupancy_rate',
      render: (value: number) => (
        <Tag color={value > 70 ? 'green' : value > 40 ? 'orange' : 'red'}>
          {formatPercent(value)}
        </Tag>
      ),
      sorter: (a: any, b: any) => a.actual_occupancy_rate - b.actual_occupancy_rate,
    },
    {
      title: '空房率',
      dataIndex: 'actual_vacancy_rate',
      key: 'actual_vacancy_rate',
      render: (value: number) => formatPercent(value),
    },
    {
      title: '總房間數',
      dataIndex: 'total_rooms',
      key: 'total_rooms',
    },
    {
      title: '可用天數',
      dataIndex: 'total_available_days',
      key: 'total_available_days',
    },
  ];

  const getTrendDirectionIcon = (direction: string) => {
    switch (direction) {
      case '上升':
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
      case '下降':
        return <ArrowDownOutlined style={{ color: '#f5222d' }} />;
      case '穩定':
        return <MinusOutlined style={{ color: '#faad14' }} />;
      default:
        return <LineChartOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  if (error) {
    return (
      <Alert
        message="載入失敗"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => window.location.reload()}>
            重試
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {/* 頁面標題和控制項 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            趨勢分析
          </Title>
          <Text type="secondary">房型入住率趨勢與表現分析</Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={loadTrendData}>
            重新整理
          </Button>
        </Col>
      </Row>

      {/* 篩選控制項 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Text strong>蟬說露營區：</Text>
            <Select
              style={{ width: 150, marginLeft: 8 }}
              value={selectedHotel}
              onChange={(value) => {
                setSelectedHotel(value);
                // 重置房型選擇
                const hotelRoomTypes = roomTypes.filter(rt => rt.hotel_id === value);
                if (hotelRoomTypes.length > 0) {
                  setSelectedRoomType(hotelRoomTypes[0].inv_type_code);
                }
              }}
              loading={loading}
            >
              {getUniqueHotels().map(hotelId => (
                <Option key={hotelId} value={hotelId}>
                  {formatHotelId(hotelId)}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Text strong>房型：</Text>
            <Select
              style={{ width: 150, marginLeft: 8 }}
              value={selectedRoomType}
              onChange={setSelectedRoomType}
              loading={loading}
            >
              {getCurrentHotelRoomTypes().map(rt => (
                <Option key={rt.inv_type_code} value={rt.inv_type_code}>
                  {rt.inv_type_code} - {rt.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Text strong>分析週數：</Text>
            <InputNumber
              style={{ width: 100, marginLeft: 8 }}
              min={4}
              max={26}
              value={weeks}
              onChange={(value) => setWeeks(value || 12)}
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading || trendLoading}>
        {trends && (
          <>
            {/* 關鍵洞察卡片 - 2x2 統一網格佈局 */}
            <Row gutter={[24, 24]} style={{ marginBottom: 32 }} className="grid-2x2-container">
              <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: trends.insights.trend_direction === '上升' 
                      ? 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
                      : trends.insights.trend_direction === '下降'
                      ? 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)'
                      : 'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(82, 196, 26, 0.15)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified">趨勢方向</div>}
                    value={trends.insights.trend_direction}
                    prefix={
                      <div className="stat-prefix-unified">
                        {getTrendDirectionIcon(trends.insights.trend_direction)}
                      </div>
                    }
                    valueStyle={{ color: 'white', fontSize: '24px' }}
                    className="stat-value-unified"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: trends.insights.occupancy_change > 0 
                      ? 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)'
                      : trends.insights.occupancy_change < 0
                      ? 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)'
                      : 'linear-gradient(135deg, #8c8c8c 0%, #bfbfbf 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(24, 144, 255, 0.15)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified">變化幅度</div>}
                    value={Math.abs(trends.insights.occupancy_change)}
                    suffix={<span className="stat-suffix-unified">%</span>}
                    prefix={
                      <div className="stat-prefix-unified">
                        {trends.insights.occupancy_change > 0 ? '📈' : 
                         trends.insights.occupancy_change < 0 ? '📉' : '➖'}
                      </div>
                    }
                    valueStyle={{ color: 'white' }}
                    className="stat-value-unified"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: trends.insights.average_occupancy > 70 
                      ? 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)'
                      : trends.insights.average_occupancy > 40
                      ? 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)'
                      : 'linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(114, 46, 209, 0.15)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified">平均入住率</div>}
                    value={trends.insights.average_occupancy}
                    suffix={<span className="stat-suffix-unified">%</span>}
                    precision={1}
                    prefix={<div className="stat-prefix-unified">📊</div>}
                    valueStyle={{ color: 'white' }}
                    className="stat-value-unified"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: 'linear-gradient(135deg, #eb2f96 0%, #f759ab 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(235, 47, 150, 0.15)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified">最高週入住率</div>}
                    value={trends.insights.peak_week?.occupancy_rate || 0}
                    suffix={<span className="stat-suffix-unified">%</span>}
                    precision={1}
                    prefix={<div className="stat-prefix-unified">🏆</div>}
                    valueStyle={{ color: 'white' }}
                    className="stat-value-unified"
                  />
                  {trends.insights.peak_week && (
                    <div style={{ 
                      color: 'rgba(255,255,255,0.8)', 
                      fontSize: '10px', 
                      marginTop: '4px',
                      textAlign: 'center'
                    }}>
                      {getWeekRange(trends.insights.peak_week.date)}
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 趨勢圖表 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={16}>
                <Card title="入住率趨勢圖" size="small">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={prepareTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{fontSize: 11}} />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        tick={{fontSize: 12}}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${Number(value || 0).toFixed(2)}%`, '入住率']}
                        labelFormatter={(label) => `週期: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="occupancy" 
                        stroke="#1890ff" 
                        strokeWidth={2}
                        dot={{fill: '#1890ff', r: 5}}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title="房型資訊" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>房型代碼：</Text>
                      <Tag color="blue">{trends.room_type.inv_type_code}</Tag>
                    </div>
                    <div>
                      <Text strong>房型名稱：</Text>
                      <Text>{trends.room_type.name}</Text>
                    </div>
                    <div>
                      <Text strong>所屬蟬說露營區：</Text>
                      <Text>{formatHotelId(trends.room_type.hotel_id)}</Text>
                    </div>
                    <div>
                      <Text strong>總房間數：</Text>
                      <Text>{trends.room_type.total_rooms}</Text>
                    </div>
                    <div>
                      <Text strong>分析週期：</Text>
                      <Text>{trends.period}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* 房型表現對比圖 */}
            {heatmapData && (
              <Card title="房型表現對比" style={{ marginBottom: 24 }} size="small">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareHeatmapData().slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" tick={{fontSize: 11}} />
                    <YAxis 
                      tickFormatter={(value) => `${value}%`}
                      tick={{fontSize: 12}}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${Number(value || 0).toFixed(2)}%`, '入住率']}
                      labelFormatter={(label) => `週期: ${label}`}
                    />
                    <Bar dataKey="occupancy" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* 詳細數據表格 */}
            <Card title="詳細週數據" size="small">
              <Table
                dataSource={prepareTableData()}
                columns={tableColumns}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 筆，共 ${total} 筆`,
                }}
                size="small"
              />
            </Card>
          </>
        )}
      </Spin>
    </div>
  );
};

export default Trends;
