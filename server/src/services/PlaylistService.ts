import { v4 as uuidv4 } from 'uuid';
import { getDb, queryOne, queryAll, run, saveDatabase } from '../config/database';
import { Song, Playlist, PlaylistDetail } from '../../../shared/types';

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
  updatePlaylist(id: string, title?: string, description?: string): Playlist | null {
    const playlist = queryOne<any>('SELECT * FROM playlists WHERE id = ?', [id]);
    if (!playlist) return null;

    const now = new Date().toISOString();
    getDb().run(`
      UPDATE playlists
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          updated_at = ?
      WHERE id = ?
    `, [title || null, description || null, now, id]);
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

  // 添加歌曲到歌单
  addSongsToPlaylist(playlistId: string, songs: Song[]): number {
    const playlist = queryOne<any>('SELECT * FROM playlists WHERE id = ?', [playlistId]);
    if (!playlist) return 0;

    let addedCount = 0;
    const now = new Date().toISOString();

    // 获取当前最大排序号
    const maxOrderResult = getDb().exec(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM playlist_songs WHERE playlist_id = ?',
      [playlistId]
    );
    let sortOrder = (maxOrderResult[0]?.values[0]?.[0] as number) || 0;

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
        sortOrder++;
        getDb().run(`
          INSERT INTO playlist_songs (playlist_id, song_id, sort_order, added_at)
          VALUES (?, ?, ?, ?)
        `, [playlistId, song.id, sortOrder, now]);
        addedCount++;
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
}

export const playlistService = new PlaylistService();
