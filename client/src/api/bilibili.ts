import { get } from './index';
import { Song, BilibiliVideoInfo, ApiResponse } from '@shared/types';

interface VideoResponse {
  info: BilibiliVideoInfo;
  songs: Song[];
}

interface FavResponse {
  songs: Song[];
  hasMore: boolean;
  total: number;
}

// 获取视频详情
export async function getVideoInfo(bvid: string): Promise<ApiResponse<VideoResponse>> {
  return get('/bilibili/video/' + bvid);
}

// 获取播放URL (后端代理)
export async function getPlayUrl(bvid: string, cid: string): Promise<ApiResponse<{ audioUrl: string }>> {
  return get(`/bilibili/playurl/${bvid}/${cid}`);
}

// 获取收藏夹
export async function getFavList(mediaId: string, page = 1): Promise<ApiResponse<FavResponse>> {
  return get(`/bilibili/fav/${mediaId}`, { page });
}

// 获取系列视频
export async function getSeriesList(mid: string, sid: string, page = 1): Promise<ApiResponse<{ songs: Song[] }>> {
  return get(`/bilibili/series/${mid}/${sid}`, { page });
}

// 获取合集视频
export async function getCollectionList(mid: string, sid: string, page = 1): Promise<ApiResponse<{ songs: Song[] }>> {
  return get(`/bilibili/collection/${mid}/${sid}`, { page });
}
