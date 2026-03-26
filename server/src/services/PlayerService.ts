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
}

export const playerService = new PlayerService();
