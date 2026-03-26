import React, { useState } from 'react';
import { Input, Button, message, Tooltip } from 'antd';
import { SearchOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { getVideoInfo, getFavList, getSeriesList, getCollectionList } from '../../api/bilibili';
import { usePlaylistStore } from '../../stores/playlistStore';
import { Song } from '@shared/types';
import styles from './SearchBar.module.css';

const SearchBar: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const { createPlaylist, addSongsToPlaylist } = usePlaylistStore();

  // 解析搜索输入
  const parseInput = (input: string): { type: string; params: string[] } | null => {
    const trimmed = input.trim();

    // BV号
    if (/^BV[a-zA-Z0-9]+$/.test(trimmed)) {
      return { type: 'bvid', params: [trimmed] };
    }

    // 收藏夹ID (纯数字)
    if (/^\d+$/.test(trimmed)) {
      return { type: 'fav', params: [trimmed] };
    }

    // 系列链接
    const seriesMatch = trimmed.match(/bilibili\.com\/(\d+)\/channel\/seriesdetail\?sid=(\d+)/);
    if (seriesMatch) {
      return { type: 'series', params: [seriesMatch[1], seriesMatch[2]] };
    }

    // 合集链接
    const colleMatch = trimmed.match(/bilibili\.com\/(\d+)\/channel\/collectiondetail\?sid=(\d+)/);
    if (colleMatch) {
      return { type: 'collection', params: [colleMatch[1], colleMatch[2]] };
    }

    // Season链接
    const seasonMatch = trimmed.match(/bilibili\.com\/(\d+)\/lists\/(\d+)\?type=season/);
    if (seasonMatch) {
      return { type: 'collection', params: [seasonMatch[1], seasonMatch[2]] };
    }

    return null;
  };

  const handleSearch = async () => {
    if (!keyword.trim()) {
      message.warning('请输入搜索内容');
      return;
    }

    const parsed = parseInput(keyword);
    if (!parsed) {
      message.warning('不支持的格式，请输入BV号、收藏夹ID或B站链接');
      return;
    }

    setLoading(true);
    let songs: Song[] = [];

    try {
      switch (parsed.type) {
        case 'bvid': {
          const res = await getVideoInfo(parsed.params[0]);
          if (res.code === 0 && res.data?.songs) {
            songs = res.data.songs;
          }
          break;
        }
        case 'fav': {
          // 获取所有页
          let page = 1;
          let hasMore = true;
          while (hasMore) {
            const res = await getFavList(parsed.params[0], page);
            if (res.code === 0 && res.data) {
              songs.push(...res.data.songs);
              hasMore = res.data.hasMore;
              page++;
            } else {
              hasMore = false;
            }
          }
          break;
        }
        case 'series': {
          const res = await getSeriesList(parsed.params[0], parsed.params[1]);
          if (res.code === 0 && res.data?.songs) {
            songs = res.data.songs;
          }
          break;
        }
        case 'collection': {
          const res = await getCollectionList(parsed.params[0], parsed.params[1]);
          if (res.code === 0 && res.data?.songs) {
            songs = res.data.songs;
          }
          break;
        }
      }

      if (songs.length === 0) {
        message.warning('未找到歌曲');
        return;
      }

      // 创建新歌单保存搜索结果
      const playlist = await createPlaylist(`搜索结果 ${new Date().toLocaleString()}`);
      if (playlist) {
        await addSongsToPlaylist(playlist.id, songs);
        message.success(`已添加 ${songs.length} 首歌曲到新歌单`);
      }
    } catch (error) {
      console.error('Search error:', error);
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.searchBar}>
      <Input
        placeholder="输入BV号、收藏夹ID或B站链接"
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onPressEnter={handleSearch}
        prefix={<SearchOutlined />}
        suffix={
          <Tooltip title="支持: BV号、收藏夹ID、合集链接、系列链接">
            <QuestionCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        }
      />
      <Button type="primary" loading={loading} onClick={handleSearch}>
        搜索
      </Button>
    </div>
  );
};

export default SearchBar;
