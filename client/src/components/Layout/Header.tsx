import React, { useState } from 'react';
import { Layout, Input, Button, Space, Tooltip } from 'antd';
import { SearchOutlined, SettingOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { usePlaylistStore } from '../../stores/playlistStore';
import SearchBar from '../Search/SearchBar';
import styles from './Header.module.css';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const [showSearch, setShowSearch] = useState(false);
  const { exportData, importData } = usePlaylistStore();

  const handleExport = async () => {
    // TODO: 实现导出
  };

  const handleImport = () => {
    // TODO: 实现导入
  };

  return (
    <AntHeader className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoText}>Bilibili Player</span>
      </div>

      <div className={styles.search}>
        <SearchBar />
      </div>

      <div className={styles.actions}>
        <Tooltip title="导出数据">
          <Button type="text" icon={<DownloadOutlined />} onClick={handleExport} />
        </Tooltip>
        <Tooltip title="导入数据">
          <Button type="text" icon={<UploadOutlined />} onClick={handleImport} />
        </Tooltip>
      </div>
    </AntHeader>
  );
};

export default Header;
