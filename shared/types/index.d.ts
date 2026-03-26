export interface Song {
    id: string;
    bvid: string;
    name: string;
    singer: string;
    singerId: string | number;
    cover: string;
    duration?: number;
    lyric?: string;
    lyricOffset?: number;
}
export interface Playlist {
    id: string;
    title: string;
    description?: string;
    coverUrl?: string;
    songCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface PlaylistDetail extends Playlist {
    songs: Song[];
}
export interface PlayerSettings {
    playMode: 'order' | 'shuffle' | 'singleLoop';
    volume: number;
    lastPlaylistId?: string;
    lastSongId?: string;
}
export interface PlayProgress {
    songId: string;
    progress: number;
    lastPlayedAt: string;
}
export interface ApiResponse<T = unknown> {
    code: number;
    message?: string;
    data?: T;
}
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
export interface LyricSearchResult {
    mid: string;
    name: string;
    singer: string;
}
//# sourceMappingURL=index.d.ts.map