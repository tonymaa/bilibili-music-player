import React, { useState, useEffect } from 'react';
import { Layout, Input, Button, Space, Tooltip, Popover, List } from 'antd';
import { SearchOutlined, SettingOutlined, DownloadOutlined, UploadOutlined, ClockCircleOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { usePlaylistStore } from '../../stores/playlistStore';
import { usePlayerStore } from '../../stores/playerStore';
import SearchBar from '../Search/SearchBar';
import styles from './Header.module.css';

const { Header: AntHeader } = Layout;

// 图片代理
const proxyImage = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/bilibili/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Header: React.FC = () => {
  const [showSearch, setShowSearch] = useState(false);
  const { exportData, importData } = usePlaylistStore();
  const { unfinishedSongs, loadUnfinishedSongs, playSong, setPlaylist, clearAllProgress, deleteSongProgress } = usePlayerStore();

  // 加载未播放完的歌曲
  useEffect(() => {
    loadUnfinishedSongs();
  }, []);

  const handleExport = async () => {
    // TODO: 实现导出
  };

  const handleImport = () => {
    // TODO: 实现导入
  };

  const handlePlayUnfinished = (song: any) => {
    playSong(song);
  };

  const handlePlayAllUnfinished = () => {
    if (unfinishedSongs.length > 0) {
      setPlaylist(unfinishedSongs.map(u => u.song), true);
    }
  };

  const handleClearAll = () => {
    clearAllProgress();
  };

  const handleDeleteUnfinished = (songId: string) => {
    deleteSongProgress(songId);
  };

  const historyContent = (
    <div style={{ width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 500 }}>未播放完 ({unfinishedSongs.length})</span>
        <Space>
          <Button type="link" size="small" onClick={handlePlayAllUnfinished} disabled={unfinishedSongs.length === 0}>
            播放全部
          </Button>
          <Button type="link" size="small" danger onClick={handleClearAll} disabled={unfinishedSongs.length === 0}>
            清空
          </Button>
        </Space>
      </div>
      {unfinishedSongs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无未播放完的歌曲</div>
      ) : (
        <List
          dataSource={unfinishedSongs}
          style={{ maxHeight: 300, overflow: 'auto' }}
          renderItem={(item, index) => (
            <List.Item
              style={{ padding: '8px 0' }}
              actions={[
                <Button
                  key="play"
                  type="text"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handlePlayUnfinished(item.song)}
                />,
                <Button
                  key="delete"
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteUnfinished(item.song.id)}
                />
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div style={{ width: 40, height: 40, borderRadius: 4, overflow: 'hidden', background: '#f5f5f5' }}>
                    {item.song.cover && <img src={proxyImage(item.song.cover)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                }
                title={<span style={{ fontSize: 14 }}>{item.song.name}</span>}
                description={<span style={{ fontSize: 12, color: '#999' }}>{item.singer} · {formatTime(item.progress)}</span>}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <AntHeader className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoText}>Bilibili Player</span>
      </div>

      <div className={styles.search}>
        <SearchBar />
      </div>

      <div className={styles.actions}>
        <Popover
          content={historyContent}
          trigger="click"
          placement="bottomRight"
        >
          <Tooltip title="播放历史">
            <Button type="text" icon={<ClockCircleOutlined />} />
          </Tooltip>
        </Popover>
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
