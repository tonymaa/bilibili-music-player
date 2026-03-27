// 歌曲类型
export interface Song {
  id: string;           // cid
  bvid: string;
  name: string;
  singer: string;
  singerId: string | number;
  cover: string;
  duration?: number;
  lyric?: string;
  lyricOffset?: number;
}

// 歌单类型
export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  songCount: number;
  createdAt: string;
  updatedAt: string;
}

// 歌单详情（含歌曲）
export interface PlaylistDetail extends Playlist {
  songs: Song[];
  total?: number; // 总歌曲数（用于分页）
}

// 播放器设置
export interface PlayerSettings {
  playMode: 'order' | 'shuffle' | 'singleLoop';
  volume: number;
  lastPlaylistId?: string;
  lastSongId?: string;
}

// 播放进度
export interface PlayProgress {
  songId: string;
  progress: number;
  lastPlayedAt: string;
}

// API 响应格式
export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}

// Bilibili 视频信息
export interface BilibiliVideoInfo {
  bvid: string;
  title: string;
  desc: string;
  pic: string;
  owner: {
    mid: number;
    name: string;
  };
  pages: Array<{
    cid: number;
    part: string;
    duration: number;
  }>;
  videos: number;
}

// 歌词搜索结果
export interface LyricSearchResult {
  mid: string;
  name: string;
  singer: string;
}
