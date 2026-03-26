import React, { useEffect, useState } from 'react';
import { Modal, Input, List, Button, Empty, Spin, Slider } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Lrc } from 'react-lrc';
import { usePlayerStore } from '../../stores/playerStore';
import { searchLyric, getLyric, updateLyricOffset } from '../../api/lyric';
import { LyricSearchResult } from '@shared/types';
import styles from './LyricPanel.module.css';

interface LyricPanelProps {
  visible: boolean;
  onClose: () => void;
}

const LyricPanel: React.FC<LyricPanelProps> = ({ visible, onClose }) => {
  const { currentSong, currentTime } = usePlayerStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<LyricSearchResult[]>([]);
  const [lyric, setLyric] = useState<string>('');
  const [translatedLyric, setTranslatedLyric] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible && currentSong) {
      setSearchKeyword(currentSong.name);
      loadLyric();
    }
  }, [visible, currentSong]);

  const loadLyric = async () => {
    if (!currentSong) return;
    setLoading(true);
    try {
      const res = await getLyric(currentSong.id, currentSong.name);
      if (res.code === 0 && res.data) {
        setLyric(res.data.lyric);
        setTranslatedLyric(res.data.translated || '');
        setOffset(res.data.offset || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setSearching(true);
    try {
      const res = await searchLyric(searchKeyword.trim());
      if (res.code === 0 && res.data) {
        setSearchResults(res.data);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSelectLyric = async (result: LyricSearchResult) => {
    if (!currentSong) return;
    setLoading(true);
    try {
      const res = await getLyric(currentSong.id, result.name, result.mid);
      if (res.code === 0 && res.data) {
        setLyric(res.data.lyric);
        setTranslatedLyric(res.data.translated || '');
        setOffset(res.data.offset || 0);
        setSearchResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOffsetChange = async (value: number) => {
    setOffset(value);
    if (currentSong) {
      await updateLyricOffset(currentSong.id, value);
    }
  };

  const adjustedCurrentTime = currentTime + offset / 1000;

  return (
    <Modal
      title="歌词"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className={styles.modal}
    >
      <div className={styles.container}>
        {/* 搜索区域 */}
        <div className={styles.search}>
          <Input
            placeholder="搜索歌词"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" loading={searching} onClick={handleSearch}>
            搜索
          </Button>
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <List
            className={styles.results}
            dataSource={searchResults}
            renderItem={item => (
              <List.Item
                className={styles.resultItem}
                onClick={() => handleSelectLyric(item)}
              >
                <div>
                  <div className={styles.resultName}>{item.name}</div>
                  <div className={styles.resultSinger}>{item.singer}</div>
                </div>
              </List.Item>
            )}
          />
        )}

        {/* 歌词偏移 */}
        <div className={styles.offset}>
          <span>歌词偏移: {offset}ms</span>
          <Slider
            min={-5000}
            max={5000}
            value={offset}
            onChange={handleOffsetChange}
            style={{ width: 200 }}
          />
        </div>

        {/* 歌词显示 */}
        <div className={styles.lyricContainer}>
          {loading ? (
            <Spin />
          ) : lyric ? (
            <Lrc
              className={styles.lrc}
              lrc={lyric}
              currentTime={adjustedCurrentTime}
              lineRenderer={({ lrcLine: { content }, active }) => (
                <div className={active ? styles.activeLine : styles.line}>
                  {content}
                </div>
              )}
            />
          ) : (
            <Empty description="暂无歌词，请搜索" />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default LyricPanel;
