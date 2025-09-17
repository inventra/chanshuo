import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Typography,
  Space,
  Badge,
  Dropdown,
  Avatar,
  theme,
  Drawer,
} from 'antd';
import {
  DashboardOutlined,
  LineChartOutlined,
  CameraOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  ReloadOutlined,
  BarChartOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 檢測屏幕大小
  useEffect(() => {
    const checkIfMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width < 768) {
        setCollapsed(true);
      }
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // 選單項目配置
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '總覽儀表板',
    },
    {
      key: '/trends',
      icon: <LineChartOutlined />,
      label: '趨勢分析',
    },
    {
      key: '/sales-status',
      icon: <BarChartOutlined />,
      label: '銷售狀況',
    },
    {
      key: '/snapshots',
      icon: <CameraOutlined />,
      label: '快照管理',
    },
    {
      key: '/room-management',
      icon: <HomeOutlined />,
      label: '房間管理',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系統設定',
    },
  ];

  // 用戶選單
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '個人設定',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    // 在手機端點擊菜單後關閉Drawer
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const toggleSideMenu = () => {
    if (isMobile) {
      setDrawerVisible(!drawerVisible);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      // 處理登出邏輯
      console.log('用戶登出');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // 側邊欄內容組件
  const SidebarContent = () => (
    <>
      <div className="logo">
        {(!collapsed || isMobile) ? (
          <Space>
            <div className="logo-icon">🏨</div>
            <Title level={4} style={{ color: 'white', margin: 0 }}>
              蟬說露營區管理
            </Title>
          </Space>
        ) : (
          <div className="logo-icon">🏨</div>
        )}
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端側邊欄 */}
      {!isMobile && (
        <Sider 
          trigger={null} 
          collapsible 
          collapsed={collapsed}
          style={{
            boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
          }}
        >
          <SidebarContent />
        </Sider>
      )}

      {/* 手機端抽屜菜單 */}
      {isMobile && (
        <Drawer
          title={
            <Space>
              <div className="logo-icon">🏨</div>
              <Text style={{ color: '#1890ff', fontSize: 18, fontWeight: 'bold' }}>
                蟬說露營區管理
              </Text>
            </Space>
          }
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          bodyStyle={{ padding: 0, background: '#001529' }}
          width={250}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0, background: '#001529' }}
          />
        </Drawer>
      )}

      {/* 主要內容區域 */}
      <Layout>
        {/* 頂部標題欄 */}
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: isMobile ? 56 : 64,
          }}
        >
          <Space>
            <Button
              type="text"
              icon={isMobile ? <MenuFoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
              onClick={toggleSideMenu}
              style={{ 
                fontSize: '16px', 
                width: isMobile ? 40 : 64, 
                height: isMobile ? 40 : 64 
              }}
            />
            <Title 
              level={isMobile ? 4 : 3} 
              style={{ 
                margin: 0,
                fontSize: isMobile ? '14px' : undefined,
                display: isMobile ? 'none' : 'block'
              }}
            >
              蟬說露營區庫存管理系統
            </Title>
            {isMobile && (
              <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
                蟬說露營區
              </Title>
            )}
          </Space>

          <Space size={isMobile ? "middle" : "large"}>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              title="重新整理"
              style={{ 
                fontSize: isMobile ? '14px' : '16px',
                width: isMobile ? 32 : 'auto',
                height: isMobile ? 32 : 'auto'
              }}
            />
            
            <Badge count={3} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ 
                  fontSize: isMobile ? '14px' : '16px',
                  width: isMobile ? 32 : 'auto',
                  height: isMobile ? 32 : 'auto'
                }}
                title="通知"
              />
            </Badge>

            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar 
                  icon={<UserOutlined />} 
                  size={isMobile ? 'small' : 'default'}
                />
                {!isMobile && <Text>管理員</Text>}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 內容區域 */}
        <Content
          style={{
            margin: isMobile ? '8px' : '24px',
            padding: isMobile ? '12px' : '24px',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: isMobile ? 'calc(100vh - 64px)' : 'calc(100vh - 112px)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
