import { get, put } from './index';
import { PlayerSettings, ApiResponse } from '@shared/types';

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
