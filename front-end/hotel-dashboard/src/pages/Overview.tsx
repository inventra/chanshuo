import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Spin,
  Alert,
  Space,
  Tag,
  Button,
  Select,
  Divider,
  Table,
  Progress,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  TrophyOutlined,
  WarningOutlined,
  ReloadOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiService from '../services/api';
import { DashboardSummary, DashboardCharts, RoomType } from '../types/api';
import { formatPercent, formatDateTime, getOccupancyColor, formatHotelId } from '../utils/format';

const { Title, Text } = Typography;
const { Option } = Select;

const Overview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // 載入數據
  const loadData = async (hotelId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, chartsData, roomTypesData] = await Promise.all([
        apiService.getDashboardSummary(hotelId),
        apiService.getDashboardCharts(hotelId, 8),
        apiService.getRoomTypes(hotelId),
      ]);

      setSummary(summaryData);
      setCharts(chartsData);
      setRoomTypes(roomTypesData);
    } catch (err: any) {
      setError(err.message || '載入數據失敗');
      console.error('Overview data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 載入圖表數據
  const loadCharts = async (hotelId?: string) => {
    try {
      setChartsLoading(true);
      const chartsData = await apiService.getDashboardCharts(hotelId, 8);
      setCharts(chartsData);
    } catch (err: any) {
      console.error('Charts loading error:', err);
    } finally {
      setChartsLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedHotel);
  }, [selectedHotel]);

  // 手動重新整理
  const handleRefresh = () => {
    loadData(selectedHotel);
  };

  // 創建快照
  const handleCreateSnapshot = async () => {
    try {
      await apiService.createSnapshot('手動建立的儀表板快照');
      loadData(selectedHotel); // 重新載入以獲取最新的快照資訊
    } catch (err: any) {
      console.error('Create snapshot error:', err);
    }
  };

  // 獲取唯一的蟬說露營區ID列表
  const getUniqueHotels = () => {
    const hotelIds = roomTypes.map(rt => rt.hotel_id);
    return [...new Set(hotelIds)];
  };

  // 準備圖表數據
  const prepareOccupancyTrendData = () => {
    if (!charts?.charts.occupancy_trends) return [];
    return charts.charts.occupancy_trends.map(item => ({
      week: item.week_start_date,
      occupancy: item.avg_occupancy,
      date: item.week_start_date,
    }));
  };

  // 準備房型表現數據
  const prepareRoomTypeTableData = () => {
    if (!summary?.room_types_overview) return [];
    return summary.room_types_overview.map((item, index) => ({
      key: index,
      inv_type_code: item.inv_type_code,
      hotel_id: item.hotel_id,
      avg_occupancy: item.avg_occupancy,
      weeks_count: item.weeks_count,
    }));
  };

  const roomTypeColumns = [
    {
      title: '房型代碼',
      dataIndex: 'inv_type_code',
      key: 'inv_type_code',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '蟬說露營區',
      dataIndex: 'hotel_id',
      key: 'hotel_id',
      render: (text: string, record: any) => formatHotelId(text, record.hotel_name),
    },
    {
      title: '平均入住率',
      dataIndex: 'avg_occupancy',
      key: 'avg_occupancy',
      render: (value: number) => (
        <Progress
          percent={value}
          size="small"
          strokeColor={getOccupancyColor(value)}
          format={() => formatPercent(value)}
        />
      ),
    },
    {
      title: '統計週數',
      dataIndex: 'weeks_count',
      key: 'weeks_count',
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
          <Button size="small" onClick={handleRefresh}>
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
        <Col xs={24} sm={24} md={12} lg={14}>
          <Title level={2} style={{ margin: 0 }}>
            總覽儀表板
          </Title>
          <Text type="secondary">
            蟬說露營區庫存管理系統概覽 {summary?.summary.data_period}
          </Text>
        </Col>
        <Col xs={24} sm={24} md={12} lg={10} style={{ marginTop: 16 }}>
          <Space direction="horizontal" wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Select
              placeholder="選擇蟬說露營區"
              allowClear
              style={{ minWidth: 150 }}
              value={selectedHotel}
              onChange={setSelectedHotel}
            >
              {getUniqueHotels().map(hotelId => (
                <Option key={hotelId} value={hotelId}>
                  {formatHotelId(hotelId)}
                </Option>
              ))}
            </Select>
            <Button
              icon={<CameraOutlined />}
              onClick={handleCreateSnapshot}
              type="primary"
              ghost
            >
              建立快照
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              重新整理
            </Button>
          </Space>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {summary && (
          <>
            {/* 關鍵指標卡片 - 2x2 統一網格佈局 */}
            <Row gutter={[24, 24]} style={{ marginBottom: 32 }} className="grid-2x2-container">
              <Col xs={12} sm={12} md={12} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.12)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified">總蟬說露營區數</div>}
                    value={summary.summary.total_hotels}
                    prefix={<div className="stat-prefix-unified">🏨</div>}
                    valueStyle={{ color: 'white' }}
                    className="stat-value-unified"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={12} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(240, 147, 251, 0.12)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified">總房型數</div>}
                    value={summary.summary.total_room_types}
                    prefix={<div className="stat-prefix-unified">🏠</div>}
                    valueStyle={{ color: 'white' }}
                    className="stat-value-unified"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={12} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: summary.summary.avg_occupancy_rate > 50 
                      ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                      : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    borderRadius: '16px',
                    boxShadow: summary.summary.avg_occupancy_rate > 50 
                      ? '0 8px 32px rgba(79, 172, 254, 0.12)'
                      : '0 8px 32px rgba(250, 112, 154, 0.12)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified">平均入住率</div>}
                    value={summary.summary.avg_occupancy_rate}
                    suffix={<span className="stat-suffix-unified">%</span>}
                    prefix={
                      <div className="stat-prefix-unified">
                        {summary.summary.avg_occupancy_rate > 50 ? '📈' : '📉'}
                      </div>
                    }
                    valueStyle={{ color: 'white' }}
                    className="stat-value-unified"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={12} lg={6} className="grid-2x2-item">
                <Card 
                  bordered={false}
                  style={{ 
                    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(168, 237, 234, 0.12)',
                  }}
                  hoverable
                >
                  <Statistic
                    title={<div className="stat-title-unified" style={{ color: 'rgba(51,51,51,0.8)' }}>快照記錄</div>}
                    value={summary.latest_snapshot?.total_records || 0}
                    prefix={<div className="stat-prefix-unified">📊</div>}
                    valueStyle={{ color: '#333' }}
                    className="stat-value-unified"
                  />
                  {summary.latest_snapshot && (
                    <div style={{ 
                      color: 'rgba(51,51,51,0.6)', 
                      fontSize: '10px', 
                      marginTop: '4px',
                      textAlign: 'center'
                    }}>
                      {formatDateTime(summary.latest_snapshot.snapshot_time)}
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 最佳和最差表現者 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <Space>
                      <TrophyOutlined style={{ color: '#faad14' }} />
                      最佳表現房型
                    </Space>
                  }
                  size="small"
                >
                  {summary.summary.best_performer ? (
                    <div>
                      <Row justify="space-between">
                        <Col>
                          <Tag color="gold">
                            {summary.summary.best_performer.room_type}
                          </Tag>
                          <Text>
                            {formatHotelId(summary.summary.best_performer.hotel_id, summary.summary.best_performer.hotel_name)}
                          </Text>
                        </Col>
                        <Col>
                          <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                            {formatPercent(summary.summary.best_performer.occupancy_rate)}
                          </Text>
                        </Col>
                      </Row>
                    </div>
                  ) : (
                    <Text type="secondary">暫無數據</Text>
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <Space>
                      <WarningOutlined style={{ color: '#f5222d' }} />
                      最差表現房型
                    </Space>
                  }
                  size="small"
                >
                  {summary.summary.worst_performer ? (
                    <div>
                      <Row justify="space-between">
                        <Col>
                          <Tag color="red">
                            {summary.summary.worst_performer.room_type}
                          </Tag>
                          <Text>
                            {formatHotelId(summary.summary.worst_performer.hotel_id)}
                          </Text>
                        </Col>
                        <Col>
                          <Text strong style={{ color: '#f5222d', fontSize: 16 }}>
                            {formatPercent(summary.summary.worst_performer.occupancy_rate)}
                          </Text>
                        </Col>
                      </Row>
                    </div>
                  ) : (
                    <Text type="secondary">暫無數據</Text>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 圖表區域 */}
            <Spin spinning={chartsLoading}>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                  <Card title="入住率趨勢" size="small">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prepareOccupancyTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tick={{fontSize: 12}} />
                        <YAxis 
                          tickFormatter={(value) => `${value}%`}
                          tick={{fontSize: 12}}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`${Number(value).toFixed(2)}%`, '入住率']}
                          labelFormatter={(label) => `週期: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="occupancy" 
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
                    <Table
                      dataSource={prepareRoomTypeTableData()}
                      columns={roomTypeColumns}
                      pagination={false}
                      size="small"
                      scroll={{ y: 300 }}
                    />
                  </Card>
                </Col>
              </Row>
            </Spin>
          </>
        )}
      </Spin>
    </div>
  );
};

export default Overview;
