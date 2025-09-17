import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import MainLayout from './layouts/MainLayout';
import Overview from './pages/Overview';
import Trends from './pages/Trends';
import SalesStatus from './pages/SalesStatus';
import Snapshots from './pages/Snapshots';
import RoomManagement from './pages/RoomManagement';
import './App.css';
import './styles/responsive.css';

// Ant Design 主題配置
const themeConfig = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f5222d',
    colorInfo: '#1890ff',
    borderRadius: 6,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#fff',
      siderBg: '#001529',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: '#1890ff',
      darkItemHoverBg: 'rgba(24, 144, 255, 0.2)',
    },
    Card: {
      boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.09)',
    },
  },
};

const App: React.FC = () => {
  return (
    <ConfigProvider 
      locale={zhTW} 
      theme={themeConfig}
    >
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Overview />} />
              <Route path="trends" element={<Trends />} />
              <Route path="sales-status" element={<SalesStatus />} />
              <Route path="snapshots" element={<Snapshots />} />
              <Route path="room-management" element={<RoomManagement />} />
              <Route path="settings" element={
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '400px',
                  flexDirection: 'column',
                  color: '#8c8c8c'
                }}>
                  <h2>⚙️ 系統設定</h2>
                  <p>此功能正在開發中...</p>
                </div>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </ConfigProvider>
  );
};

export default App;