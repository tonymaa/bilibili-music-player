import axios from 'axios';
import { getDb, queryOne, saveDatabase } from '../config/database';
import { LyricSearchResult } from '../../../shared/types';

const QQ_SEARCH_URL = 'https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg';
const QQ_LYRIC_URL = 'https://i.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg';

export class LyricService {
  // 搜索歌词
  async searchLyric(keyword: string): Promise<LyricSearchResult[]> {
    try {
      const url = `${QQ_SEARCH_URL}?key=${encodeURIComponent(keyword)}`;
      const res = await axios.get(url, {
        headers: { 'Referer': 'https://y.qq.com/' }
      });

      const songs = res.data?.data?.song?.itemlist || [];
      return songs.map((item: any) => ({
        mid: item.mid,
        name: item.name,
        singer: item.singer
      }));
    } catch (error) {
      console.error('Failed to search lyric:', error);
      return [];
    }
  }

  // 获取歌词
  async getLyric(songId: string, keyword?: string, qqMid?: string): Promise<{ lyric: string; translated?: string; offset: number } | null> {
    // 先检查缓存
    const cached = queryOne<any>('SELECT * FROM lyric_cache WHERE song_id = ?', [songId]);
    if (cached?.lyric_content) {
      return {
        lyric: cached.lyric_content,
        translated: cached.translated_lyric || undefined,
        offset: cached.offset || 0
      };
    }

    // 如果没有 qqMid，先搜索
    if (!qqMid && keyword) {
      const results = await this.searchLyric(keyword);
      if (results.length > 0) {
        qqMid = results[0].mid;
      }
    }

    if (!qqMid) return null;

    // 从QQ音乐获取歌词
    try {
      const url = `${QQ_LYRIC_URL}?songmid=${qqMid}&format=json&nobase64=1`;
      const res = await axios.get(url, {
        headers: { 'Referer': 'https://y.qq.com/' }
      });

      const lyric = this.normalizeLyric(res.data.lyric);
      const translated = this.normalizeLyric(res.data.trans);

      // 缓存歌词
      if (lyric) {
        const now = new Date().toISOString();
        getDb().run(`
          INSERT OR REPLACE INTO lyric_cache (song_id, lyric_content, translated_lyric, search_keyword, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [songId, lyric, translated || null, keyword || null, now]);
        saveDatabase();
      }

      return { lyric, translated, offset: 0 };
    } catch (error) {
      console.error('Failed to fetch lyric:', error);
      return null;
    }
  }

  // 更新歌词偏移
  updateLyricOffset(songId: string, offset: number): boolean {
    getDb().run('UPDATE lyric_cache SET offset = ? WHERE song_id = ?', [offset, songId]);
    saveDatabase();
    return true;
  }

  // 保存歌词
  saveLyric(songId: string, lyric: string, translated?: string): void {
    const now = new Date().toISOString();
    getDb().run(`
      INSERT OR REPLACE INTO lyric_cache (song_id, lyric_content, translated_lyric, created_at)
      VALUES (?, ?, ?, ?)
    `, [songId, lyric, translated || null, now]);
    saveDatabase();
  }

  // 规范化歌词
  private normalizeLyric(text: string): string {
    if (!text) return '';
    return text.replace(/\r\n/g, '\n').trim();
  }
}

export const lyricService = new LyricService();
