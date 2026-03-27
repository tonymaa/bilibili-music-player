import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Slider, Button, Tooltip, Dropdown, Popover } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  SoundOutlined,
  RetweetOutlined,
  SwapOutlined,
  UnorderedListOutlined,
  OneToOneOutlined,
  DeleteOutlined,
  HeartOutlined,
  HeartFilled,
  CustomerServiceOutlined,
  PauseOutlined,
  MenuOutlined,
  ArrowUpOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { usePlayerStore } from '../../stores/playerStore';
import styles from './PlayerPanel.module.css';

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

interface PlayerPanelProps {
  visible: boolean;
  onClose: () => void;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({ visible, onClose }) => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playMode,
    playlist,
    pendingSeekTime,
    setPendingSeekTime,
    togglePlay,
    playNext,
    playPrev,
    playByIndex,
    removeFromPlaylist,
    setVolume,
    setPlayMode
  } = usePlayerStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  // 处理进度条拖拽
  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekChange = (value: number) => {
    setDragProgress(value);
  };

  const handleSeekEnd = (value: number) => {
    setIsDragging(false);
    // 通过 store 设置进度
    const audioElement = usePlayerStore.getState().audioElement;
    if (audioElement) {
      audioElement.currentTime = value;
    }
  };

  // 计算显示的进度
  const displayProgress = isDragging ? dragProgress : currentTime;

  const playModeOptions = [
    { key: 'order', label: '顺序播放', icon: <RetweetOutlined /> },
    { key: 'shuffle', label: '随机播放', icon: <SwapOutlined /> },
    { key: 'singleLoop', label: '单曲循环', icon: <OneToOneOutlined /> }
  ];

  const currentPlayMode = playModeOptions.find(m => m.key === playMode);

  if (!visible) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} ref={panelRef} onClick={e => e.stopPropagation()}>
        {/* 毛玻璃背景 */}
        <div
          className={styles.background}
          style={{
            backgroundImage: currentSong?.cover ? `url(${proxyImage(currentSong.cover)})` : undefined
          }}
        />

        {/* 顶部栏 */}
        <div className={styles.header}>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className={styles.closeBtn}
          />
        </div>

        {/* 歌曲图片区域 */}
        <div className={styles.coverContainer}>
          <div className={`${styles.coverWrapper} ${isPlaying ? styles.spinning : ''}`}>
            <div className={styles.cover}>
              {currentSong?.cover ? (
                <img src={proxyImage(currentSong.cover)} alt="cover" />
              ) : (
                <div className={styles.defaultCover}>♪</div>
              )}
            </div>
          </div>
        </div>

        {/* 歌曲信息 */}
        <div className={styles.songInfo}>
          <div className={styles.songName}>{currentSong?.name || '未选择歌曲'}</div>
          <div className={styles.singer}>{currentSong?.singer || ''}</div>
        </div>

        {/* 进度条 */}
        <div className={styles.progress}>
          <Slider
            value={displayProgress}
            max={duration || 100}
            onChange={handleSeekChange}
            onChangeComplete={handleSeekEnd}
            tooltip={{ formatter: value => formatTime(value || 0) }}
          />
          <div className={styles.time}>
            <span>{formatTime(displayProgress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className={styles.controls}>
          <Dropdown
            menu={{
              items: playModeOptions.map(m => ({
                key: m.key,
                label: (
                  <span>
                    {m.icon} {m.label}
                  </span>
                )
              })),
              onClick: ({ key }) => setPlayMode(key as 'order' | 'shuffle' | 'singleLoop')
            }}
          >
            <Tooltip title={currentPlayMode?.label}>
              <Button type="text" size="large" className={styles.modeBtn}>
                {currentPlayMode?.icon}
              </Button>
            </Tooltip>
          </Dropdown>

          <Button type="text" size="large" icon={<StepBackwardOutlined />} onClick={playPrev} />
          <Button
            type="text"
            size="large"
            icon={isPlaying ? <PauseCircleOutlined className={styles.playBtn} /> : <PlayCircleOutlined className={styles.playBtn} />}
            onClick={togglePlay}
            className={styles.playBtnWrapper}
          />
          <Button type="text" size="large" icon={<StepForwardOutlined />} onClick={playNext} />

          <Tooltip title="歌词">
            <Button type="text" size="large" icon={<CustomerServiceOutlined />} />
          </Tooltip>
        </div>

        {/* 底部信息 */}
        <div className={styles.footer}>
          <div className={styles.volume}>
            <SoundOutlined />
            <Slider
              value={volume}
              min={0}
              max={1}
              step={0.01}
              onChange={setVolume}
              className={styles.volumeSlider}
            />
          </div>

          <Popover
            content={
              <div className={styles.playlistPopover}>
                <div className={styles.playlistHeader}>
                  <span>播放列表 ({playlist.length}首)</span>
                </div>
                <div className={styles.playlistContent}>
                  {playlist.length === 0 ? (
                    <div className={styles.playlistEmpty}>播放列表为空</div>
                  ) : (
                    playlist.map((song, index) => (
                      <div
                        key={song.id}
                        className={`${styles.playlistItem} ${currentSong?.id === song.id ? styles.active : ''}`}
                        onClick={() => playByIndex(index)}
                      >
                        <div className={styles.playlistItemIndex}>
                          {currentSong?.id === song.id ? (
                            <PlayCircleOutlined style={{ color: '#1890ff' }} />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>
                        <div className={styles.playlistItemInfo}>
                          <div className={styles.playlistItemName}>{song.name}</div>
                          <div className={styles.playlistItemSinger}>{song.singer}</div>
                        </div>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromPlaylist(index);
                          }}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            }
            trigger="click"
            placement="topRight"
          >
            <Button type="text" icon={<UnorderedListOutlined />} />
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default PlayerPanel;
