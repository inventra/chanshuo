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
  Table,
  DatePicker,
  Tag,
  Progress,
  Divider,
} from 'antd';
import {
  BarChartOutlined,
  TrophyOutlined,
  CalendarOutlined,
  ReloadOutlined,
  SearchOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import apiService from '../services/api';
import { RoomType, SalesStatus as SalesStatusType } from '../types/api';
import {
  formatPercent,
  formatDate,
  getOccupancyColor,
  formatHotelId,
  formatNumber,
} from '../utils/format';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const SalesStatus: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [roomTypesLoading, setRoomTypesLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [salesData, setSalesData] = useState<SalesStatusType | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 篩選條件
  const [selectedHotel, setSelectedHotel] = useState<string | undefined>(undefined);
  const [selectedRoomType, setSelectedRoomType] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs(),
    dayjs().add(7, 'day')
  ]);

  // 初始化載入房型數據
  useEffect(() => {
    loadRoomTypes();
  }, []);

  // 自動載入數據
  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      handleSearch();
    }
  }, []);

  const loadRoomTypes = async () => {
    try {
      setRoomTypesLoading(true);
      const data = await apiService.getRoomTypes();
      setRoomTypes(data);
    } catch (err: any) {
      setError(`載入房型失敗: ${err.message}`);
    } finally {
      setRoomTypesLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      setError('請選擇日期範圍');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const params = {
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
        hotel_id: selectedHotel,
        inv_type_code: selectedRoomType,
      };

      const data = await apiService.getSalesStatus(params);
      setSalesData(data);
    } catch (err: any) {
      setError(`查詢失敗: ${err.message}`);
      setSalesData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedHotel(undefined);
    setSelectedRoomType(undefined);
    setDateRange([dayjs(), dayjs().add(7, 'day')]);
    setSalesData(null);
    setError(null);
  };

  // 獲取唯一露營區列表
  const getUniqueHotels = () => {
    const hotelIds = roomTypes.map(rt => rt.hotel_id);
    return Array.from(new Set(hotelIds));
  };

  // 獲取可選房型（根據選中的露營區篩選）
  const getAvailableRoomTypes = () => {
    if (selectedHotel) {
      return roomTypes.filter(rt => rt.hotel_id === selectedHotel);
    }
    return roomTypes;
  };

  // 準備日趨勢圖表數據
  const prepareDailyTrendData = () => {
    if (!salesData?.daily_data) return [];
    
    return salesData.daily_data.map(item => ({
      date: formatDate(item.date, 'MM/DD'),
      fullDate: item.date,
      入住率: item.occupancy_rate,
      已售房間: item.sold_rooms,
      可售房間: item.available_rooms,
      總房間: item.total_rooms,
    }));
  };

  // 準備房型表現數據
  const prepareRoomTypePerformanceData = () => {
    if (!salesData?.room_type_performance) return [];
    
    return salesData.room_type_performance.map(item => ({
      房型: item.inv_type_code,
      露營區: formatHotelId(item.hotel_id, item.hotel_name),
      房型名稱: item.room_type_name,
      平均入住率: item.avg_occupancy_rate,
      平均已售: Number(item.avg_sold_rooms).toFixed(1),
      總房間數: Number(item.avg_total_rooms).toFixed(1),
    }));
  };

  // 詳細數據表格列定義
  const detailColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => formatDate(text),
      sorter: (a: any, b: any) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: '露營區',
      dataIndex: 'hotel_id',
      key: 'hotel_id',
      render: (text: string, record: any) => (
        <Tag color="blue">{formatHotelId(text, record.hotel_name)}</Tag>
      ),
      filters: getUniqueHotels().map(id => ({
        text: formatHotelId(id, roomTypes.find(rt => rt.hotel_id === id)?.hotel_name),
        value: id,
      })),
      onFilter: (value: any, record: any) => record.hotel_id === value,
    },
    {
      title: '房型',
      dataIndex: 'inv_type_code',
      key: 'inv_type_code',
      render: (text: string, record: any) => (
        <div>
          <Tag color="green">{text}</Tag>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.room_type_name}
          </Text>
        </div>
      ),
    },
    {
      title: '房間狀況',
      key: 'room_status',
      render: (_: any, record: any) => (
        <div>
          <Text strong>總房間: {record.total_rooms}</Text><br />
          <Text type="success">已售: {record.sold_rooms}</Text><br />
          <Text type="warning">可售: {record.available_rooms}</Text>
        </div>
      ),
    },
    {
      title: '入住率',
      dataIndex: 'occupancy_rate',
      key: 'occupancy_rate',
      render: (value: number) => (
        <Progress
          percent={value}
          size="small"
          strokeColor={getOccupancyColor(value)}
          format={() => formatPercent(value)}
        />
      ),
      sorter: (a: any, b: any) => a.occupancy_rate - b.occupancy_rate,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'OPEN' ? 'green' : 'red'}>
          {status === 'OPEN' ? '開放' : '關閉'}
        </Tag>
      ),
      filters: [
        { text: '開放', value: 'OPEN' },
        { text: '關閉', value: 'CLOSE' },
      ],
      onFilter: (value: any, record: any) => record.status === value,
    },
  ];

  // 房型表現表格列定義
  const performanceColumns = [
    {
      title: '排名',
      key: 'rank',
      render: (_: any, __: any, index: number) => (
        <div style={{ textAlign: 'center' }}>
          {index === 0 && <TrophyOutlined style={{ color: '#faad14', fontSize: 16 }} />}
          {index < 3 ? (
            <Text strong style={{ color: index === 0 ? '#faad14' : '#8c8c8c' }}>
              #{index + 1}
            </Text>
          ) : (
            <Text type="secondary">#{index + 1}</Text>
          )}
        </div>
      ),
      width: 80,
    },
    {
      title: '房型',
      dataIndex: '房型',
      key: 'room_type',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '露營區',
      dataIndex: '露營區',
      key: 'hotel',
    },
    {
      title: '房型名稱',
      dataIndex: '房型名稱',
      key: 'room_name',
    },
    {
      title: '平均入住率',
      dataIndex: '平均入住率',
      key: 'avg_occupancy',
      render: (value: number) => (
        <Progress
          percent={value}
          size="small"
          strokeColor={getOccupancyColor(value)}
          format={() => formatPercent(value)}
        />
      ),
      sorter: (a: any, b: any) => a.平均入住率 - b.平均入住率,
    },
    {
      title: '平均已售房間',
      dataIndex: '平均已售',
      key: 'avg_sold',
      render: (value: string) => <Text strong>{value}</Text>,
    },
  ];

  if (error) {
    return (
      <Alert
        message="載入失敗"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => window.location.reload()}>
            重新載入
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BarChartOutlined /> 房間銷售狀況
      </Title>
      <Text type="secondary">查看露營區房間銷售情況，分析入住率和房型表現</Text>

      <Divider />

      {/* 篩選器區域 */}
      <Card title="查詢條件" size="small" style={{ marginBottom: 24 }}>
        <Spin spinning={roomTypesLoading}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6} lg={5}>
              <Text strong>露營區：</Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                placeholder="選擇露營區"
                value={selectedHotel}
                onChange={setSelectedHotel}
                allowClear
              >
                {getUniqueHotels().map(hotelId => (
                  <Option key={hotelId} value={hotelId}>
                    {formatHotelId(hotelId, roomTypes.find(rt => rt.hotel_id === hotelId)?.hotel_name)}
                  </Option>
                ))}
              </Select>
            </Col>
            
            <Col xs={24} sm={12} md={6} lg={5}>
              <Text strong>房型：</Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                placeholder="選擇房型"
                value={selectedRoomType}
                onChange={setSelectedRoomType}
                allowClear
                disabled={!selectedHotel}
              >
                {getAvailableRoomTypes().map(rt => (
                  <Option key={`${rt.hotel_id}-${rt.inv_type_code}`} value={rt.inv_type_code}>
                    {rt.inv_type_code} - {rt.name}
                  </Option>
                ))}
              </Select>
            </Col>
            
            <Col xs={24} sm={12} md={8} lg={8}>
              <Text strong>日期範圍：</Text>
              <RangePicker
                style={{ width: '100%', marginTop: 4 }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs])}
                format="YYYY-MM-DD"
              />
            </Col>
            
            <Col xs={24} sm={12} md={4} lg={6}>
              <Space direction="horizontal" wrap style={{ width: '100%', marginTop: window.innerWidth < 768 ? 8 : 20 }}>
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  loading={loading}
                  style={{ minWidth: 80 }}
                >
                  查詢
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  style={{ minWidth: 80 }}
                >
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Spin>
      </Card>

      {/* 數據顯示區域 */}
      <Spin spinning={loading}>
        {salesData && (
          <>
            {/* 統計摘要卡片 - 2x2 統一網格佈局 */}
            <Row gutter={[24, 24]} style={{ marginBottom: 32 }} className="grid-2x2-container">
              <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(255, 215, 0, 0.15)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified" style={{ color: 'rgba(51,51,51,0.8)' }}>查詢期間</div>}
                    value={salesData.summary.total_days}
                    suffix={<span className="stat-suffix-unified" style={{ color: '#666' }}>天</span>}
                    prefix={<div className="stat-prefix-unified">📅</div>}
                    valueStyle={{ color: '#333' }}
                    className="stat-value-unified"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: 'linear-gradient(135deg, #87CEEB 0%, #4682B4 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(135, 206, 235, 0.15)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified">總房間數</div>}
                    value={salesData.summary.total_rooms}
                    prefix={<div className="stat-prefix-unified">🏠</div>}
                    valueStyle={{ color: 'white' }}
                    className="stat-value-unified"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: 'linear-gradient(135deg, #98FB98 0%, #32CD32 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(152, 251, 152, 0.15)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified" style={{ color: 'rgba(51,51,51,0.8)' }}>總已售房間</div>}
                    value={salesData.summary.total_sold}
                    prefix={<div className="stat-prefix-unified">✅</div>}
                    valueStyle={{ color: '#2d5c2d' }}
                    className="stat-value-unified"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: salesData.summary.avg_occupancy_rate > 70 
                      ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)'
                      : salesData.summary.avg_occupancy_rate > 40
                      ? 'linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)'
                      : 'linear-gradient(135deg, #6BCF7F 0%, #4D96FF 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(255, 107, 107, 0.15)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified">平均入住率</div>}
                    value={salesData.summary.avg_occupancy_rate}
                    suffix={<span className="stat-suffix-unified">%</span>}
                    prefix={
                      <div className="stat-prefix-unified">
                        {salesData.summary.avg_occupancy_rate > 70 ? '🔥' : 
                         salesData.summary.avg_occupancy_rate > 40 ? '📊' : '📈'}
                      </div>
                    }
                    valueStyle={{ color: 'white' }}
                    className="stat-value-unified"
                  />
                </Card>
              </Col>
            </Row>

            {/* 圖表區域 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={16}>
                <Card title="日銷售趨勢" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={prepareDailyTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{fontSize: 12}} />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        tick={{fontSize: 12}}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => {
                          if (name === '入住率') {
                            return [`${Number(value).toFixed(2)}%`, '入住率'];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label, payload) => {
                          const data = payload?.[0]?.payload;
                          return data ? `日期: ${data.fullDate}` : label;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="入住率" 
                        stroke="#1890ff" 
                        strokeWidth={2}
                        dot={{fill: '#1890ff', r: 4}}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              
              <Col xs={24} lg={8}>
                <Card title="房型表現排行" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareRoomTypePerformanceData().slice(0, 8)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{fontSize: 12}} />
                      <YAxis 
                        type="category" 
                        dataKey="房型"
                        tick={{fontSize: 12}}
                        width={40}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${Number(value).toFixed(2)}%`, '平均入住率']}
                      />
                      <Bar 
                        dataKey="平均入住率" 
                        fill="#1890ff"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>

            {/* 表格區域 */}
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Card title="房型表現詳情" size="small" style={{ marginBottom: 16 }}>
                  <Table
                    dataSource={prepareRoomTypePerformanceData()}
                    columns={performanceColumns}
                    pagination={false}
                    size="small"
                    rowKey={(record) => `${record.房型}-${record.露營區}`}
                  />
                </Card>
              </Col>
              
              <Col xs={24}>
                <Card title="詳細銷售數據" size="small">
                  <Table
                    dataSource={salesData.detailed_data}
                    columns={detailColumns}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => 
                        `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
                    }}
                    size="small"
                    rowKey={(record) => `${record.date}-${record.hotel_id}-${record.inv_type_code}`}
                    scroll={{ x: 800 }}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
        
        {!salesData && !loading && (
          <Card style={{ textAlign: 'center', padding: '60px 0' }}>
            <BarChartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Title level={4} type="secondary">請選擇查詢條件並點擊查詢</Title>
            <Text type="secondary">選擇露營區、房型和日期範圍來查看銷售狀況</Text>
          </Card>
        )}
      </Spin>
    </div>
  );
};

export default SalesStatus;
