import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Spin,
  Tag
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  SettingOutlined
} from '@ant-design/icons';
import apiService from '../services/api';
import { RoomType } from '../types/api';
import { formatHotelId } from '../utils/format';

const { Title, Text } = Typography;
const { Option } = Select;

interface EditableCell {
  editing: boolean;
  record: RoomType;
}

const RoomManagement: React.FC = () => {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<string | undefined>(undefined);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 獲取房間數據
  const fetchRoomTypes = async () => {
    setLoading(true);
    try {
      const data = await apiService.getRoomTypes(selectedHotel);
      setRoomTypes(data);
    } catch (error) {
      message.error('獲取房間數據失敗');
      console.error('Error fetching room types:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomTypes();
  }, [selectedHotel]);

  // 獲取唯一的蟬說露營區列表
  const getUniqueHotels = () => {
    const hotels = roomTypes.map(room => ({
      id: room.hotel_id,
      name: room.hotel_name || formatHotelId(room.hotel_id)
    }));
    
    // 去重
    const uniqueHotels = hotels.filter((hotel, index, self) => 
      index === self.findIndex(h => h.id === hotel.id)
    );
    
    return uniqueHotels;
  };

  // 開始編輯
  const startEdit = (record: RoomType) => {
    editForm.setFieldsValue({
      name: record.name,
      total_rooms: record.total_rooms
    });
    setEditingKey(record.id);
  };

  // 取消編輯
  const cancelEdit = () => {
    setEditingKey(null);
    editForm.resetFields();
  };

  // 保存編輯
  const saveEdit = async (record: RoomType) => {
    try {
      const values = await editForm.validateFields();
      setLoading(true);
      
      await apiService.updateRoomType(record.id, {
        name: values.name,
        total_rooms: values.total_rooms
      });
      
      message.success('房間信息更新成功');
      setEditingKey(null);
      editForm.resetFields();
      await fetchRoomTypes();
    } catch (error) {
      message.error('更新房間信息失敗');
      console.error('Error updating room type:', error);
    } finally {
      setLoading(false);
    }
  };

  // 刪除房間
  const deleteRoomType = async (record: RoomType) => {
    try {
      setLoading(true);
      await apiService.deleteRoomType(record.id);
      message.success('房間類型刪除成功');
      await fetchRoomTypes();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '刪除房間類型失敗';
      message.error(errorMessage);
      console.error('Error deleting room type:', error);
    } finally {
      setLoading(false);
    }
  };

  // 創建新房間
  const createRoomType = async (values: any) => {
    try {
      setLoading(true);
      await apiService.createRoomType({
        inv_type_code: values.inv_type_code,
        name: values.name,
        total_rooms: values.total_rooms,
        hotel_id: values.hotel_id
      });
      
      message.success('新房間類型創建成功');
      setIsModalVisible(false);
      form.resetFields();
      await fetchRoomTypes();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '創建房間類型失敗';
      message.error(errorMessage);
      console.error('Error creating room type:', error);
    } finally {
      setLoading(false);
    }
  };

  // 表格列定義
  const columns = [
    {
      title: '房型代碼',
      dataIndex: 'inv_type_code',
      key: 'inv_type_code',
      width: 120,
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '房間名稱',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: RoomType) => {
        const isEditing = record.id === editingKey;
        return isEditing ? (
          <Form.Item
            name="name"
            style={{ margin: 0 }}
            rules={[{ required: true, message: '請輸入房間名稱' }]}
          >
            <Input />
          </Form.Item>
        ) : (
          <Text strong>{text}</Text>
        );
      }
    },
    {
      title: '房間總數',
      dataIndex: 'total_rooms',
      key: 'total_rooms',
      width: 120,
      render: (text: number, record: RoomType) => {
        const isEditing = record.id === editingKey;
        return isEditing ? (
          <Form.Item
            name="total_rooms"
            style={{ margin: 0 }}
            rules={[
              { required: true, message: '請輸入房間總數' },
              { type: 'number', min: 1, message: '房間總數必須大於0' }
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        ) : (
          <Text>{text} 間</Text>
        );
      }
    },
    {
      title: '所屬蟬說露營區',
      dataIndex: 'hotel_name',
      key: 'hotel_name',
      render: (text: string, record: RoomType) => (
        <Tag color="green">{text || formatHotelId(record.hotel_id)}</Tag>
      )
    },
    {
      title: '最後更新',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text: string) => (
        <Text type="secondary">
          {text ? new Date(text).toLocaleString('zh-TW') : '-'}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: RoomType) => {
        const isEditing = record.id === editingKey;
        
        if (isEditing) {
          return (
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="small"
                onClick={() => saveEdit(record)}
                loading={loading}
              >
                保存
              </Button>
              <Button
                icon={<CloseOutlined />}
                size="small"
                onClick={cancelEdit}
              >
                取消
              </Button>
            </Space>
          );
        }
        
        return (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              size="small"
              onClick={() => startEdit(record)}
              disabled={editingKey !== null}
            >
              編輯
            </Button>
            <Popconfirm
              title="確定要刪除這個房間類型嗎？"
              description="刪除後無法恢復，請確認。"
              onConfirm={() => deleteRoomType(record)}
              okText="確定"
              cancelText="取消"
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                size="small"
                disabled={editingKey !== null}
              >
                刪除
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 頁面標題 */}
      <Row align="middle" justify="space-between" style={{ marginBottom: 24 }}>
        <Col>
          <Space align="center">
            <SettingOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={2} style={{ margin: 0 }}>房間管理</Title>
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            管理蟬說露營區的房間類型和房間總數
          </Text>
        </Col>
      </Row>

      <Divider />

      {/* 篩選和操作區 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space>
              <Text strong>篩選條件：</Text>
              <Select
                placeholder="選擇蟬說露營區"
                style={{ width: 200 }}
                value={selectedHotel}
                onChange={setSelectedHotel}
                allowClear
              >
                {getUniqueHotels().map(hotel => (
                  <Option key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalVisible(true)}
            >
              新增房間類型
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 房間列表表格 */}
      <Card
        title={
          <Space>
            <Text strong>房間類型列表</Text>
            <Tag color="blue">{roomTypes.length} 個房型</Tag>
          </Space>
        }
      >
        <Form form={editForm} component={false}>
          <Table
            dataSource={roomTypes}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              total: roomTypes.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
            }}
            scroll={{ x: 800 }}
          />
        </Form>
      </Card>

      {/* 新增房間類型Modal */}
      <Modal
        title="新增房間類型"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createRoomType}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="蟬說露營區"
                name="hotel_id"
                rules={[{ required: true, message: '請選擇蟬說露營區' }]}
              >
                <Select placeholder="選擇蟬說露營區">
                  {getUniqueHotels().map(hotel => (
                    <Option key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="房型代碼"
                name="inv_type_code"
                rules={[
                  { required: true, message: '請輸入房型代碼' },
                  { pattern: /^[A-Z0-9]+$/, message: '房型代碼只能包含大寫字母和數字' }
                ]}
              >
                <Input placeholder="例如：A、B、C" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="房間名稱"
            name="name"
            rules={[{ required: true, message: '請輸入房間名稱' }]}
          >
            <Input placeholder="例如：標準雙人房、豪華套房" />
          </Form.Item>
          
          <Form.Item
            label="房間總數"
            name="total_rooms"
            rules={[
              { required: true, message: '請輸入房間總數' },
              { type: 'number', min: 1, message: '房間總數必須大於0' }
            ]}
          >
            <InputNumber
              min={1}
              placeholder="輸入房間總數"
              style={{ width: '100%' }}
              addonAfter="間"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                創建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomManagement;
