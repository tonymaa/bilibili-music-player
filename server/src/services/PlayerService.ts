import { getDb, queryOne, saveDatabase } from '../config/database';
import { PlayerSettings, PlayProgress } from '../../../shared/types';

export class PlayerService {
  // 获取播放器设置
  getSettings(): PlayerSettings {
    const row = queryOne<any>('SELECT * FROM player_settings WHERE id = 1');
    return {
      playMode: row?.play_mode || 'order',
      volume: row?.volume ?? 0.5,
      lastPlaylistId: row?.last_playlist_id || undefined,
      lastSongId: row?.last_song_id || undefined
    };
  }

  // 更新播放器设置
  updateSettings(settings: Partial<PlayerSettings>): PlayerSettings {
    const now = new Date().toISOString();
    getDb().run(`
      UPDATE player_settings
      SET play_mode = COALESCE(?, play_mode),
          volume = COALESCE(?, volume),
          last_playlist_id = COALESCE(?, last_playlist_id),
          last_song_id = COALESCE(?, last_song_id),
          updated_at = ?
      WHERE id = 1
    `, [
      settings.playMode || null,
      settings.volume ?? null,
      settings.lastPlaylistId || null,
      settings.lastSongId || null,
      now
    ]);
    saveDatabase();
    return this.getSettings();
  }

  // 获取播放进度
  getProgress(songId: string): number {
    const row = queryOne<any>('SELECT progress_seconds FROM play_progress WHERE song_id = ?', [songId]);
    return row?.progress_seconds || 0;
  }

  // 保存播放进度
  saveProgress(songId: string, progress: number): void {
    const now = new Date().toISOString();
    const song = queryOne<any>('SELECT id FROM songs WHERE id = ?', [songId]);
    if (!song) return;

    getDb().run(`
      INSERT OR REPLACE INTO play_progress (song_id, progress_seconds, last_played_at)
      VALUES (?, ?, ?)
    `, [songId, progress, now]);
    saveDatabase();
  }

  // 获取所有播放进度
  getAllProgress(): PlayProgress[] {
    const result = getDb().exec(`
      SELECT song_id, progress_seconds, last_played_at
      FROM play_progress
      ORDER BY last_played_at DESC
    `);

    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map(values => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = values[i];
      });
      return {
        songId: obj.song_id,
        progress: obj.progress_seconds,
        lastPlayedAt: obj.last_played_at
      };
    });
  }

  // 获取未播放完的歌曲（进度 < 时长 * 0.9）
  getUnfinishedSongs(): { song: any; progress: number }[] {
    const result = getDb().exec(`
      SELECT s.*, pp.progress_seconds, pp.last_played_at
      FROM songs s
      JOIN play_progress pp ON s.id = pp.song_id
      WHERE pp.progress_seconds < COALESCE(s.duration, 600) * 0.99
      ORDER BY pp.last_played_at DESC
      LIMIT 50
    `);

    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map(values => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = values[i];
      });
      return {
        song: {
          id: obj.id,
          bvid: obj.bvid,
          name: obj.name,
          singer: obj.singer,
          singerId: obj.singer_id,
          cover: obj.cover_url,
          duration: obj.duration
        },
        progress: obj.progress_seconds
      };
    });
  }

  // 清空所有播放进度
  clearAllProgress(): void {
    getDb().run('DELETE FROM play_progress');
    saveDatabase();
  }

  // 删除单个歌曲的播放进度
  deleteProgress(songId: string): void {
    getDb().run('DELETE FROM play_progress WHERE song_id = ?', [songId]);
    saveDatabase();
  }
}

export const playerService = new PlayerService();
