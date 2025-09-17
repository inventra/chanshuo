import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Table,
  Space,
  Spin,
  Alert,
  Modal,
  Input,
  Tag,
  Popconfirm,
  DatePicker,
  Statistic,
  Divider,
  Empty,
  message,
} from 'antd';
import {
  CameraOutlined,
  DeleteOutlined,
  EyeOutlined,
  SwapOutlined,
  ReloadOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import apiService from '../services/api';
import { DataSnapshot, SnapshotComparison, WeeklyChanges } from '../types/api';
import {
  formatDateTime,
  formatDate,
  getStatusTag,
  formatNumber,
  getChangeDisplay,
} from '../utils/format';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Snapshots: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<DataSnapshot[]>([]);
  const [selectedSnapshots, setSelectedSnapshots] = useState<number[]>([]);
  const [comparison, setComparison] = useState<SnapshotComparison | null>(null);
  const [weeklyChanges, setWeeklyChanges] = useState<WeeklyChanges | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [newSnapshotDescription, setNewSnapshotDescription] = useState('');
  const [compareDates, setCompareDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 載入快照列表
  const loadSnapshots = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getSnapshots(50);
      setSnapshots(response.data?.snapshots || []);
    } catch (err: any) {
      setError(err.message || '載入快照列表失敗');
      console.error('Snapshots loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 載入週變化數據
  const loadWeeklyChanges = async () => {
    try {
      const changes = await apiService.getWeeklyChanges(4);
      setWeeklyChanges(changes);
    } catch (err: any) {
      console.error('Weekly changes loading error:', err);
    }
  };

  useEffect(() => {
    loadSnapshots();
    loadWeeklyChanges();
  }, []);

  // 創建新快照
  const handleCreateSnapshot = async () => {
    try {
      await apiService.createSnapshot(newSnapshotDescription || undefined);
      message.success('快照創建成功');
      setCreateModalVisible(false);
      setNewSnapshotDescription('');
      loadSnapshots();
    } catch (err: any) {
      message.error(err.message || '創建快照失敗');
    }
  };

  // 刪除快照
  const handleDeleteSnapshot = async (snapshotId: number) => {
    try {
      await apiService.deleteSnapshot(snapshotId);
      message.success('快照刪除成功');
      loadSnapshots();
    } catch (err: any) {
      message.error(err.message || '刪除快照失敗');
    }
  };

  // 比較快照
  const handleCompareSnapshots = async () => {
    if (!compareDates || compareDates.length !== 2) {
      message.warning('請選擇比較日期範圍');
      return;
    }

    try {
      const fromDate = compareDates[0].format('YYYY-MM-DD');
      const toDate = compareDates[1].format('YYYY-MM-DD');
      
      const comparisonData = await apiService.compareSnapshots(fromDate, toDate);
      setComparison(comparisonData);
      setCompareModalVisible(true);
    } catch (err: any) {
      message.error(err.message || '比較快照失敗');
    }
  };

  // 表格列定義
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '快照日期',
      dataIndex: 'snapshot_date',
      key: 'snapshot_date',
      render: (date: string) => formatDate(date),
      sorter: (a: DataSnapshot, b: DataSnapshot) => 
        new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime(),
    },
    {
      title: '創建時間',
      dataIndex: 'snapshot_time',
      key: 'snapshot_time',
      render: (time: string) => formatDateTime(time),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const { color, text } = getStatusTag(status);
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '記錄數',
      dataIndex: 'total_records',
      key: 'total_records',
      render: (value: number) => formatNumber(value),
      sorter: (a: DataSnapshot, b: DataSnapshot) => a.total_records - b.total_records,
    },
    {
      title: '房型數',
      dataIndex: 'room_types_count',
      key: 'room_types_count',
      render: (value: number) => value || '-',
    },
    {
      title: '蟬說露營區數',
      dataIndex: 'hotels_count',
      key: 'hotels_count',
      render: (value: number) => value || '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: DataSnapshot) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => {
              // 查看快照詳情的邏輯
              message.info(`查看快照 ${record.id} 詳情`);
            }}
          />
          <Popconfirm
            title="確定要刪除這個快照嗎？"
            description="刪除後無法恢復"
            onConfirm={() => handleDeleteSnapshot(record.id)}
            okText="確定"
            cancelText="取消"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 準備週變化圖表數據
  const prepareWeeklyChangesData = () => {
    if (!weeklyChanges?.changes) return [];
    return weeklyChanges.changes.map(change => ({
      period: change.period,
      changes: change.summary.total_changes,
      new: change.summary.new_records,
      modified: change.summary.modified_records,
      removed: change.summary.removed_records,
    }));
  };

  if (error) {
    return (
      <Alert
        message="載入失敗"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadSnapshots}>
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
            快照管理
          </Title>
          <Text type="secondary">數據快照創建、管理與比較分析</Text>
        </Col>
        <Col>
          <Space>
            <RangePicker
              value={compareDates}
              onChange={setCompareDates}
              placeholder={['開始日期', '結束日期']}
            />
            <Button
              icon={<SwapOutlined />}
              onClick={handleCompareSnapshots}
              disabled={!compareDates}
            >
              比較快照
            </Button>
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              創建快照
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadSnapshots}>
              重新整理
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 週變化概覽 */}
      {weeklyChanges && (
        <Card title="最近週變化趨勢" style={{ marginBottom: 24 }} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={prepareWeeklyChangesData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{fontSize: 11}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip 
                    formatter={(value: any) => [`${value} 筆`, '總變化數']}
                    labelFormatter={(label) => `期間: ${label}`}
                  />
                  <Bar dataKey="changes" fill="#1890ff" />
                </BarChart>
              </ResponsiveContainer>
            </Col>
            <Col xs={24} lg={8}>
              <Row gutter={[16, 16]} style={{ height: '100%' }}>
                <Col xs={12} sm={12}>
                  <Card 
                    bordered={false}
                    style={{ 
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #36cfc9 0%, #13c2c2 100%)',
                      borderRadius: '12px',
                      boxShadow: '0 6px 20px rgba(54, 207, 201, 0.15)',
                      transition: 'all 0.3s ease',
                      height: '100%'
                    }}
                    hoverable
                    bodyStyle={{ padding: '16px 12px' }}
                  >
                    <Statistic
                      title={<div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px', marginBottom: '4px' }}>分析週數</div>}
                      value={weeklyChanges.weeks_analyzed}
                      prefix={<div style={{ fontSize: '20px', marginBottom: '4px' }}>📅</div>}
                      valueStyle={{ color: 'white', fontSize: '24px', fontWeight: 'bold', lineHeight: '1.2' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12}>
                  <Card 
                    bordered={false}
                    style={{ 
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #ff9c6e 0%, #ff7a45 100%)',
                      borderRadius: '12px',
                      boxShadow: '0 6px 20px rgba(255, 156, 110, 0.15)',
                      transition: 'all 0.3s ease',
                      height: '100%'
                    }}
                    hoverable
                    bodyStyle={{ padding: '16px 12px' }}
                  >
                    <Statistic
                      title={<div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px', marginBottom: '4px' }}>分析期間</div>}
                      value={weeklyChanges.period}
                      prefix={<div style={{ fontSize: '20px', marginBottom: '4px' }}>📊</div>}
                      valueStyle={{ color: 'white', fontSize: '18px', fontWeight: 'bold', lineHeight: '1.2' }}
                    />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card 
                    size="small"
                    style={{ 
                      background: 'linear-gradient(135deg, #f0f0f0 0%, #e6f7ff 100%)',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      追蹤過去 {weeklyChanges.weeks_analyzed} 週的數據變化趨勢，
                      幫助您了解庫存數據的動態變化。
                    </Text>
                  </Card>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>
      )}

      {/* 快照列表 */}
      <Card title="快照列表" size="small">
        <Spin spinning={loading}>
          <Table
            dataSource={snapshots}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 筆，共 ${total} 筆`,
            }}
            scroll={{ x: 1000 }}
          />
        </Spin>
      </Card>

      {/* 創建快照對話框 */}
      <Modal
        title="創建新快照"
        open={createModalVisible}
        onOk={handleCreateSnapshot}
        onCancel={() => {
          setCreateModalVisible(false);
          setNewSnapshotDescription('');
        }}
        okText="創建"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>為新快照添加描述（可選）：</Text>
          <Input.TextArea
            rows={3}
            value={newSnapshotDescription}
            onChange={(e) => setNewSnapshotDescription(e.target.value)}
            placeholder="例如：週報數據快照、月度分析快照等"
            maxLength={255}
            showCount
          />
          <Text type="secondary">
            快照將包含當前所有的庫存數據和週統計數據，創建後可用於歷史數據比較和分析。
          </Text>
        </Space>
      </Modal>

      {/* 快照比較對話框 */}
      <Modal
        title="快照比較結果"
        open={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setCompareModalVisible(false)}>
            關閉
          </Button>,
        ]}
        width={800}
      >
        {comparison && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small" title="起始快照">
                  <Space direction="vertical">
                    <Text>日期: {formatDate(comparison.comparison.from_snapshot.snapshot_date)}</Text>
                    <Text>記錄數: {formatNumber(comparison.comparison.from_snapshot.total_records)}</Text>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="結束快照">
                  <Space direction="vertical">
                    <Text>日期: {formatDate(comparison.comparison.to_snapshot.snapshot_date)}</Text>
                    <Text>記錄數: {formatNumber(comparison.comparison.to_snapshot.total_records)}</Text>
                  </Space>
                </Card>
              </Col>
            </Row>

            <Card title="變化摘要 - 2x2 統一網格檢視" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[24, 24]} className="grid-2x2-container">
                <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                  <Card 
                    bordered={false}
                    style={{ 
                      background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                      borderRadius: '16px',
                      boxShadow: '0 8px 32px rgba(24, 144, 255, 0.15)',
                    }}
                    hoverable
                  >
                    <Statistic
                      title={<div className="stat-title-unified">總變化</div>}
                      value={comparison.comparison.summary.total_changes}
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
                      background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                      borderRadius: '16px',
                      boxShadow: '0 8px 32px rgba(82, 196, 26, 0.15)',
                    }}
                    hoverable
                  >
                    <Statistic
                      title={<div className="stat-title-unified">新增記錄</div>}
                      value={comparison.comparison.summary.new_records}
                      prefix={<div className="stat-prefix-unified">➕</div>}
                      valueStyle={{ color: 'white' }}
                      className="stat-value-unified"
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                  <Card 
                    bordered={false}
                    style={{ 
                      background: 'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)',
                      borderRadius: '16px',
                      boxShadow: '0 8px 32px rgba(250, 173, 20, 0.15)',
                    }}
                    hoverable
                  >
                    <Statistic
                      title={<div className="stat-title-unified">修改記錄</div>}
                      value={comparison.comparison.summary.modified_records}
                      prefix={<div className="stat-prefix-unified">✏️</div>}
                      valueStyle={{ color: 'white' }}
                      className="stat-value-unified"
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={6} lg={6} className="grid-2x2-item">
                  <Card 
                    bordered={false}
                    style={{ 
                      background: 'linear-gradient(135deg, #f5222d 0%, #ff4d4f 100%)',
                      borderRadius: '16px',
                      boxShadow: '0 8px 32px rgba(245, 34, 45, 0.15)',
                    }}
                    hoverable
                  >
                    <Statistic
                      title={<div className="stat-title-unified">刪除記錄</div>}
                      value={comparison.comparison.summary.removed_records}
                      prefix={<div className="stat-prefix-unified">➖</div>}
                      valueStyle={{ color: 'white' }}
                      className="stat-value-unified"
                    />
                  </Card>
                </Col>
              </Row>
            </Card>

            {comparison.comparison.changes.length > 0 ? (
              <Card title="詳細變化" size="small">
                <Table
                  dataSource={comparison.comparison.changes.slice(0, 10)}
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: '房型',
                      dataIndex: 'inv_type_code',
                      key: 'inv_type_code',
                      render: (text: string) => <Tag color="blue">{text}</Tag>,
                    },
                    {
                      title: '蟬說露營區',
                      dataIndex: 'hotel_id',
                      key: 'hotel_id',
                    },
                    {
                      title: '週期',
                      dataIndex: 'week_start_date',
                      key: 'week_start_date',
                      render: (date: string) => formatDate(date),
                    },
                    {
                      title: '變化類型',
                      dataIndex: 'change_type',
                      key: 'change_type',
                      render: (type: string) => {
                        const colorMap = {
                          new: 'green',
                          removed: 'red',
                          changed: 'orange',
                          unchanged: 'default',
                        };
                        return <Tag color={colorMap[type as keyof typeof colorMap]}>{type}</Tag>;
                      },
                    },
                    {
                      title: '入住率變化',
                      dataIndex: 'occupancy_diff',
                      key: 'occupancy_diff',
                      render: (diff: number | null) => {
                        if (diff === null) return '-';
                        const { color, prefix } = getChangeDisplay(diff);
                        return (
                          <Text style={{ color }}>
                            {prefix}{Math.abs(diff).toFixed(2)}%
                          </Text>
                        );
                      },
                    },
                  ]}
                />
                {comparison.comparison.changes.length > 10 && (
                  <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                    顯示前 10 筆變化，共 {comparison.comparison.changes.length} 筆變化
                  </Text>
                )}
              </Card>
            ) : (
              <Empty description="沒有發現數據變化" />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Snapshots;
