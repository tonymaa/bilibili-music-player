import { get, put, del } from './index';
import { PlayerSettings, ApiResponse, Song } from '@shared/types';

// 获取播放器设置
export async function getPlayerSettings(): Promise<ApiResponse<PlayerSettings>> {
  return get('/player/settings');
}

// 更新播放器设置
export async function updatePlayerSettings(settings: Partial<PlayerSettings>): Promise<ApiResponse<PlayerSettings>> {
  return put('/player/settings', settings);
}

// 获取播放进度
export async function getPlayProgress(songId: string): Promise<ApiResponse<{ progress: number }>> {
  return get(`/player/progress/${songId}`);
}

// 保存播放进度
export async function savePlayProgress(songId: string, progress: number): Promise<ApiResponse> {
  return put(`/player/progress/${songId}`, { progress });
}

// 获取未播放完的歌曲
export async function getUnfinishedSongs(): Promise<ApiResponse<{ song: Song; progress: number }[]>> {
  return get('/player/unfinished');
}

// 清空所有播放进度
export async function clearAllProgress(): Promise<ApiResponse> {
  return del('/player/progress');
}

// 删除单个歌曲的播放进度
export async function deleteProgress(songId: string): Promise<ApiResponse> {
  return del(`/player/progress/${songId}`);
}
