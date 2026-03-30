import { v4 as uuidv4 } from 'uuid';
import { getDb, queryOne, queryAll, saveDatabase } from '../config/database';
import { Song, Playlist, PlaylistDetail } from '../../../shared/types';
import { bilibiliService } from './BilibiliService';

export class PlaylistService {
  // 获取所有歌单
  getAllPlaylists(): Playlist[] {
    const db = getDb();
    const result = db.exec(`
      SELECT p.*,
        (SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = p.id) as song_count
      FROM playlists p
      ORDER BY p.updated_at DESC
    `);

    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map(values => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = values[i];
      });
      return {
        id: obj.id,
        title: obj.title,
        description: obj.description,
        coverUrl: obj.cover_url,
        playlistType: obj.playlist_type || 'normal',
        searchKeyword: obj.search_keyword,
        lastSyncedAt: obj.last_synced_at,
        songCount: obj.song_count,
        createdAt: obj.created_at,
        updatedAt: obj.updated_at
      };
    });
  }

  // 获取歌单详情
  getPlaylistById(id: string, page = 1, pageSize = 50, search?: string): PlaylistDetail | null {
    const playlist = queryOne<any>('SELECT * FROM playlists WHERE id = ?', [id]);
    if (!playlist) return null;

    let sql = `
      SELECT s.*, ps.custom_name, ps.sort_order
      FROM songs s
      JOIN playlist_songs ps ON s.id = ps.song_id
      WHERE ps.playlist_id = ?
    `;
    const params: any[] = [id];

    if (search) {
      sql += ' AND (s.name LIKE ? OR s.singer LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY ps.sort_order ASC, ps.added_at DESC';

    // 先计算总数
    const countResult = getDb().exec(
      sql.replace(/SELECT s\.\*, ps\.custom_name, ps\.sort_order/g, 'SELECT COUNT(*) as total'),
      params
    );
    const total = countResult.length > 0 ? (countResult[0].values[0]?.[0] as number) || 0 : 0;

    // 分页
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    const songsResult = getDb().exec(sql, params);
    let songs: Song[] = [];

    if (songsResult.length > 0) {
      const columns = songsResult[0].columns;
      songs = songsResult[0].values.map(values => {
        const obj: any = {};
        columns.forEach((col, i) => {
          obj[col] = values[i];
        });
        return {
          id: obj.id,
          bvid: obj.bvid,
          name: obj.custom_name || obj.name,
          singer: obj.singer,
          singerId: obj.singer_id,
          cover: obj.cover_url,
          duration: obj.duration
        };
      });
    }

    return {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      coverUrl: playlist.cover_url,
      songCount: total,
      total,
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at,
      songs
    };
  }

  // 获取歌单所有歌曲（不分页）
  getAllSongsFromPlaylist(id: string): Song[] {
    const sql = `
      SELECT s.*, ps.custom_name, ps.sort_order
      FROM songs s
      JOIN playlist_songs ps ON s.id = ps.song_id
      WHERE ps.playlist_id = ?
      ORDER BY ps.sort_order ASC, ps.added_at DESC
    `;

    const songsResult = getDb().exec(sql, [id]);
    let songs: Song[] = [];

    if (songsResult.length > 0) {
      const columns = songsResult[0].columns;
      songs = songsResult[0].values.map(values => {
        const obj: any = {};
        columns.forEach((col, i) => {
          obj[col] = values[i];
        });
        return {
          id: obj.id,
          bvid: obj.bvid,
          name: obj.custom_name || obj.name,
          singer: obj.singer,
          singerId: obj.singer_id,
          cover: obj.cover_url,
          duration: obj.duration
        };
      });
    }

    return songs;
  }

  // 创建歌单
  createPlaylist(title: string, description?: string): Playlist {
    const id = uuidv4();
    const now = new Date().toISOString();

    getDb().run(`
      INSERT INTO playlists (id, title, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [id, title, description || null, now, now]);
    saveDatabase();

    return {
      id,
      title,
      description,
      songCount: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  // 更新歌单
  updatePlaylist(id: string, title?: string, description?: string, searchKeyword?: string): Playlist | null {
    const playlist = queryOne<any>('SELECT * FROM playlists WHERE id = ?', [id]);
    if (!playlist) return null;

    const now = new Date().toISOString();

    // 如果是订阅歌单，可以更新searchKeyword
    if (playlist.playlist_type === 'subscription' && searchKeyword !== undefined) {
      getDb().run(`
        UPDATE playlists
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            search_keyword = ?,
            updated_at = ?
        WHERE id = ?
      `, [title || null, description || null, searchKeyword, now, id]);
    } else {
      getDb().run(`
        UPDATE playlists
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            updated_at = ?
        WHERE id = ?
      `, [title || null, description || null, now, id]);
    }
    saveDatabase();

    return this.getAllPlaylists().find(p => p.id === id) || null;
  }

  // 删除歌单
  deletePlaylist(id: string): boolean {
    getDb().run('DELETE FROM playlist_songs WHERE playlist_id = ?', [id]);
    getDb().run('DELETE FROM playlists WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }

  // 添加歌曲到歌单（新增歌曲放在最前面）
  addSongsToPlaylist(playlistId: string, songs: Song[]): number {
    const playlist = queryOne<any>('SELECT * FROM playlists WHERE id = ?', [playlistId]);
    if (!playlist) return 0;

    let addedCount = 0;
    const now = new Date().toISOString();

    // 获取当前最小排序号
    const minOrderResult = getDb().exec(
      'SELECT COALESCE(MIN(sort_order), 0) as min_order FROM playlist_songs WHERE playlist_id = ?',
      [playlistId]
    );
    let sortOrder = (minOrderResult[0]?.values[0]?.[0] as number) || 0;

    // 先把所有现有歌曲的排序号后移一位
    if (sortOrder !== 0) {
      getDb().run(
        'UPDATE playlist_songs SET sort_order = sort_order + 1 WHERE playlist_id = ?',
        [playlistId]
      );
    }

    for (const song of songs) {
      // 检查歌曲是否已存在
      const existingSong = queryOne<any>('SELECT id FROM songs WHERE id = ?', [song.id]);

      if (!existingSong) {
        // 插入歌曲
        getDb().run(`
          INSERT INTO songs (id, bvid, name, singer, singer_id, cover_url, duration, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [song.id, song.bvid, song.name, song.singer, String(song.singerId), song.cover, song.duration || 0, now]);
      }

      // 检查是否已在歌单中
      const inPlaylist = queryOne<any>(
        'SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
        [playlistId, song.id]
      );

      if (!inPlaylist) {
        sortOrder--;
        getDb().run(`
          INSERT INTO playlist_songs (playlist_id, song_id, sort_order, added_at)
          VALUES (?, ?, ?, ?)
        `, [playlistId, song.id, sortOrder, now]);
        addedCount++;
      } else {
        // 如果歌曲已存在，提到最前面
        getDb().run(
          'UPDATE playlist_songs SET sort_order = sort_order + 1 WHERE playlist_id = ? AND song_id = ?',
          [playlistId, song.id]
        );
      }
    }

    // 更新歌单时间
    getDb().run('UPDATE playlists SET updated_at = ? WHERE id = ?', [now, playlistId]);
    saveDatabase();

    return addedCount;
  }

  // 从歌单删除歌曲
  removeSongsFromPlaylist(playlistId: string, songIds: string[]): number {
    const placeholders = songIds.map(() => '?').join(',');
    getDb().run(
      `DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id IN (${placeholders})`,
      [playlistId, ...songIds]
    );

    const now = new Date().toISOString();
    getDb().run('UPDATE playlists SET updated_at = ? WHERE id = ?', [now, playlistId]);
    saveDatabase();

    return songIds.length;
  }

  // 重命名歌单中的歌曲
  renameSongInPlaylist(playlistId: string, songId: string, newName: string): boolean {
    getDb().run(`
      UPDATE playlist_songs SET custom_name = ? WHERE playlist_id = ? AND song_id = ?
    `, [newName, playlistId, songId]);
    saveDatabase();
    return true;
  }

  // 导出所有数据
  exportData(): { playlists: PlaylistDetail[] } {
    const playlists = this.getAllPlaylists();
    const playlistDetails = playlists.map(p => this.getPlaylistById(p.id) as PlaylistDetail);
    return { playlists: playlistDetails.filter(Boolean) };
  }

  // 导入数据
  importData(data: { playlists: PlaylistDetail[] }): number {
    let importedCount = 0;

    for (const playlist of data.playlists) {
      const newPlaylist = this.createPlaylist(playlist.title, playlist.description);
      if (playlist.songs?.length) {
        const added = this.addSongsToPlaylist(newPlaylist.id, playlist.songs);
        importedCount += added;
      }
    }

    return importedCount;
  }

  // 创建订阅歌单
  createSubscriptionPlaylist(title: string, searchKeyword: string, description?: string): Playlist {
    const id = uuidv4();
    const now = new Date().toISOString();

    getDb().run(`
      INSERT INTO playlists (id, title, description, playlist_type, search_keyword, created_at, updated_at)
      VALUES (?, ?, ?, 'subscription', ?, ?, ?)
    `, [id, title, description || null, searchKeyword, now, now]);
    saveDatabase();

    return {
      id,
      title,
      description,
      coverUrl: undefined,
      playlistType: 'subscription',
      searchKeyword,
      songCount: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  // 同步订阅歌单
  async syncSubscriptionPlaylist(id: string): Promise<{ addedCount: number; songs: Song[] }> {
    const playlist = queryOne<any>('SELECT * FROM playlists WHERE id = ? AND playlist_type = ?', [id, 'subscription']);
    if (!playlist) {
      return { addedCount: 0, songs: [] };
    }

    const searchKeyword = playlist.search_keyword;
    if (!searchKeyword) {
      return { addedCount: 0, songs: [] };
    }

    // 解析搜索输入（使用现有的搜索格式）
    let songs: Song[] = [];
    const trimmed = searchKeyword.trim();

    // BV号
    if (/^BV[a-zA-Z0-9]+$/.test(trimmed)) {
      const info = await bilibiliService.getVideoInfo(trimmed);
      if (info) {
        songs = bilibiliService.videoToSongs(info);
      }
    } else if (/^\d+$/.test(trimmed)) {
      // 收藏夹ID - 获取所有页面的歌曲
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const result = await bilibiliService.getFavList(trimmed, page);
        songs.push(...result.songs);
        hasMore = result.hasMore;
        page++;
      }
    } else if (trimmed.includes('seriesdetail')) {
      // 系列链接 - 获取所有页面的视频
      const seriesMatch = trimmed.match(/bilibili\.com\/(\d+)\/channel\/seriesdetail\?sid=(\d+)/);
      if (seriesMatch) {
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const result = await bilibiliService.getSeriesList(seriesMatch[1], seriesMatch[2], page);
          songs.push(...result);
          hasMore = result.length >= 30;
          page++;
        }
      }
    } else if (trimmed.includes('collectiondetail') || trimmed.includes('lists') || trimmed.includes('type=season')) {
      // 合集链接
      let mid = '';
      let sid = '';
      const colleMatch = trimmed.match(/bilibili\.com\/(\d+)\/channel\/collectiondetail\?sid=(\d+)/);
      if (colleMatch) {
        mid = colleMatch[1];
        sid = colleMatch[2];
      } else {
        const seasonMatch = trimmed.match(/bilibili\.com\/(\d+)\/lists\/(\d+)\?type=season/);
        if (seasonMatch) {
          mid = seasonMatch[1];
          sid = seasonMatch[2];
        }
      }
      if (mid && sid) {
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const result = await bilibiliService.getCollectionList(mid, sid, page);
          songs.push(...result);
          hasMore = result.length >= 30;
          page++;
        }
      }
    } else {
      // 系列链接
      const seriesMatch = trimmed.match(/bilibili\.com\/(\d+)\/channel\/seriesdetail\?sid=(\d+)/);
      if (seriesMatch) {
        songs = await bilibiliService.getSeriesList(seriesMatch[1], seriesMatch[2]);
      } else {
        // 合集链接
        const colleMatch = trimmed.match(/bilibili\.com\/(\d+)\/channel\/collectiondetail\?sid=(\d+)/);
        if (colleMatch) {
          songs = await bilibiliService.getCollectionList(colleMatch[1], colleMatch[2]);
        } else {
          // Season链接
          const seasonMatch = trimmed.match(/bilibili\.com\/(\d+)\/lists\/(\d+)\?type=season/);
          if (seasonMatch) {
            songs = await bilibiliService.getCollectionList(seasonMatch[1], seasonMatch[2]);
          }
        }
      }
    }

    if (songs.length === 0) {
      return { addedCount: 0, songs: [] };
    }

    // 添加到歌单
    const addedCount = this.addSongsToPlaylist(id, songs);

    // 更新最后同步时间
    const now = new Date().toISOString();
    getDb().run('UPDATE playlists SET last_synced_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
    saveDatabase();

    return { addedCount, songs };
  }

  // 同步所有订阅歌单
  async syncAllSubscriptionPlaylists(): Promise<{ playlistId: string; addedCount: number }[]> {
    const playlists = queryAll<any>('SELECT id FROM playlists WHERE playlist_type = ?', ['subscription']);
    const results: { playlistId: string; addedCount: number }[] = [];

    for (const p of playlists) {
      const result = await this.syncSubscriptionPlaylist(p.id);
      results.push({ playlistId: p.id, addedCount: result.addedCount });
    }

    return results;
  }
}

export const playlistService = new PlaylistService();
