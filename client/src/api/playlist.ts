import { get, post, put, del } from './index';
import { Playlist, PlaylistDetail, Song, ApiResponse } from '@shared/types';

// 获取所有歌单
export async function getPlaylists(): Promise<ApiResponse<Playlist[]>> {
  return get('/playlists');
}

// 获取歌单详情
export async function getPlaylistDetail(
  id: string,
  page = 1,
  pageSize = 50,
  search?: string
): Promise<ApiResponse<PlaylistDetail>> {
  return get(`/playlists/${id}`, { page, pageSize, search });
}

// 获取歌单所有歌曲（不分页）
export async function getPlaylistAllSongs(id: string): Promise<ApiResponse<Song[]>> {
  return get(`/playlists/${id}/songs`);
}

// 创建歌单
export async function createPlaylist(title: string, description?: string): Promise<ApiResponse<Playlist>> {
  return post('/playlists', { title, description });
}

// 更新歌单
export async function updatePlaylist(id: string, data: { title?: string; description?: string }): Promise<ApiResponse<Playlist>> {
  return put(`/playlists/${id}`, data);
}

// 删除歌单
export async function deletePlaylist(id: string): Promise<ApiResponse> {
  return del(`/playlists/${id}`);
}

// 添加歌曲到歌单
export async function addSongsToPlaylist(playlistId: string, songs: Song[]): Promise<ApiResponse<{ addedCount: number }>> {
  return post(`/playlists/${playlistId}/songs`, { songs });
}

// 从歌单删除歌曲
export async function removeSongsFromPlaylist(playlistId: string, songIds: string[]): Promise<ApiResponse<{ removedCount: number }>> {
  return del(`/playlists/${playlistId}/songs`, { songIds });
}

// 重命名歌单中的歌曲
export async function renameSongInPlaylist(playlistId: string, songId: string, newName: string): Promise<ApiResponse> {
  return put(`/playlists/${playlistId}/songs/rename`, { songId, newName });
}

// 导出数据
export async function exportData(): Promise<ApiResponse<{ playlists: PlaylistDetail[] }>> {
  return get('/playlists/export/all');
}

// 导入数据
export async function importData(playlists: PlaylistDetail[]): Promise<ApiResponse<{ importedCount: number }>> {
  return post('/playlists/import', { playlists });
}
