import React, { useEffect, useRef, useState } from 'react';
import { Slider, Button, Space, Tooltip, Dropdown } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  SoundOutlined,
  RetweetOutlined,
  SwapOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { usePlayerStore } from '../../stores/playerStore';
import styles from './AudioPlayer.module.css';

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 图片代理，避免 403
const proxyImage = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/bilibili/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
};

const AudioPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playMode,
    playlist,
    setAudioElement,
    togglePlay,
    playNext,
    playPrev,
    setCurrentTime,
    setDuration,
    setVolume,
    setPlayMode,
    loadSettings,
    saveProgress
  } = usePlayerStore();

  const [showPlaylist, setShowPlaylist] = useState(false);

  // 初始化
  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current);
      loadSettings();
    }
  }, []);

  // 定期保存进度
  useEffect(() => {
    const timer = setInterval(() => {
      saveProgress();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (audioRef.current) {
            audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, duration]);

  // Audio 事件处理
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (playMode === 'singleLoop') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      playNext();
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
  };

  const playModeOptions = [
    { key: 'order', label: '顺序播放', icon: <UnorderedListOutlined /> },
    { key: 'shuffle', label: '随机播放', icon: <SwapOutlined /> },
    { key: 'singleLoop', label: '单曲循环', icon: <RetweetOutlined /> }
  ];

  const currentPlayMode = playModeOptions.find(m => m.key === playMode);

  return (
    <div className={styles.player}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* 歌曲信息 */}
      <div className={styles.songInfo}>
        {currentSong ? (
          <>
            <div className={styles.cover}>
              {currentSong.cover && <img src={proxyImage(currentSong.cover)} alt="cover" />}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>{currentSong.name}</div>
              <div className={styles.singer}>{currentSong.singer}</div>
            </div>
          </>
        ) : (
          <div className={styles.noSong}>未选择歌曲</div>
        )}
      </div>

      {/* 播放控制 */}
      <div className={styles.controls}>
        <div className={styles.buttons}>
          <Button type="text" size="large" icon={<StepBackwardOutlined />} onClick={playPrev} />
          <Button
            type="text"
            size="large"
            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={togglePlay}
            className={styles.playBtn}
          />
          <Button type="text" size="large" icon={<StepForwardOutlined />} onClick={playNext} />
        </div>

        <div className={styles.progress}>
          <span className={styles.time}>{formatTime(currentTime)}</span>
          <Slider
            value={currentTime}
            max={duration || 100}
            onChange={handleSeek}
            className={styles.slider}
            tooltip={{ formatter: value => formatTime(value || 0) }}
          />
          <span className={styles.time}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 音量和模式 */}
      <div className={styles.extra}>
        <div className={styles.volume}>
          <SoundOutlined />
          <Slider
            value={volume}
            min={0}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            className={styles.volumeSlider}
          />
        </div>

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
            <Button type="text" icon={currentPlayMode?.icon} />
          </Tooltip>
        </Dropdown>

        <span className={styles.playlistCount}>{playlist.length} 首</span>
      </div>
    </div>
  );
};

export default AudioPlayer;
