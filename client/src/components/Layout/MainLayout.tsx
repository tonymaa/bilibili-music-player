import React from 'react';
import { Layout } from 'antd';
import Header from './Header';
import Sidebar from './Sidebar';
import styles from './MainLayout.module.css';

const { Content, Sider } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <Layout className={styles.layout}>
      <Header />
      <Layout className={styles.body}>
        <Sider width={280} className={styles.sider} theme="light">
          <Sidebar />
        </Sider>
        <Content className={styles.content}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
