import { get, put, post } from './index';
import { LyricSearchResult, ApiResponse } from '@shared/types';

interface LyricData {
  lyric: string;
  translated?: string;
  offset: number;
}

// 搜索歌词
export async function searchLyric(keyword: string): Promise<ApiResponse<LyricSearchResult[]>> {
  return get('/lyric/search', { keyword });
}

// 获取歌词
export async function getLyric(songId: string, keyword?: string, qqMid?: string): Promise<ApiResponse<LyricData>> {
  return get(`/lyric/${songId}`, { keyword, qqMid });
}

// 更新歌词偏移
export async function updateLyricOffset(songId: string, offset: number): Promise<ApiResponse> {
  return put(`/lyric/${songId}/offset`, { offset });
}

// 保存歌词
export async function saveLyric(songId: string, lyric: string, translated?: string): Promise<ApiResponse> {
  return post(`/lyric/${songId}`, { lyric, translated });
}
