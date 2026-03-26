import { create } from 'zustand';
import type { Song } from '@shared/types';
import * as playerApi from '../api/player';
import * as bilibiliApi from '../api/bilibili';

// 洗牌函数
function shuffleArray<T>(array: T[], keepFirstId?: string): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  // 如果需要保持第一首
  if (keepFirstId && result.length >= 2) {
    const keepIndex = result.findIndex((s: Song) => s.id === keepFirstId);
    if (keepIndex > 0) {
      const [keepSong] = result.splice(keepIndex, 1);
      result.unshift(keepSong);
    }
  }

  return result;
}

interface PlayerState {
  // 播放列表
  playlist: Song[];
  shuffledPlaylist: Song[];
  currentSong: Song | null;
  currentIndex: number;

  // 播放状态
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playMode: 'order' | 'shuffle' | 'singleLoop';

  // Audio 元素引用
  audioElement: HTMLAudioElement | null;

  // Actions
  setAudioElement: (audio: HTMLAudioElement) => void;
  setPlaylist: (songs: Song[], playFirst?: boolean) => void;
  addToPlaylist: (songs: Song[]) => void;
  playSong: (song: Song) => void;
  playByIndex: (index: number) => void;
  playNext: () => void;
  playPrev: () => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlayMode: (mode: 'order' | 'shuffle' | 'singleLoop') => void;
  loadSettings: () => Promise<void>;
  saveProgress: () => void;
  loadProgress: (songId: string) => Promise<number>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  playlist: [],
  shuffledPlaylist: [],
  currentSong: null,
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.5,
  playMode: 'order',
  audioElement: null,

  setAudioElement: (audio) => {
    set({ audioElement: audio });
    audio.volume = get().volume;
  },

  setPlaylist: (songs, playFirst = false) => {
    const { playMode, currentSong } = get();

    let displayList = songs;
    if (playMode === 'shuffle') {
      displayList = shuffleArray(songs, playFirst ? undefined : currentSong?.id);
    }

    set({
      playlist: songs,
      shuffledPlaylist: displayList,
      currentSong: displayList[0] || null,
      currentIndex: 0,
      isPlaying: playFirst
    });

    if (playFirst && displayList[0]) {
      get().playSong(displayList[0]);
    }
  },

  addToPlaylist: (songs) => {
    const { playlist, shuffledPlaylist, playMode } = get();
    const existingIds = new Set(playlist.map(s => s.id));
    const newSongs = songs.filter(s => !existingIds.has(s.id));

    if (newSongs.length === 0) return;

    const newPlaylist = [...playlist, ...newSongs];
    let newShuffled = [...shuffledPlaylist, ...newSongs];

    if (playMode === 'shuffle') {
      newShuffled = shuffleArray(newShuffled);
    }

    set({ playlist: newPlaylist, shuffledPlaylist: newShuffled });
  },

  playSong: async (song) => {
    const { audioElement, playlist, shuffledPlaylist, playMode } = get();
    if (!audioElement) return;

    try {
      // 先获取视频详情拿到 cid（收藏夹返回的 song.id 是 aid，不是 cid）
      const infoRes = await bilibiliApi.getVideoInfo(song.bvid);
      if (infoRes.code !== 0 || !infoRes.data?.info?.pages?.length) {
        console.error('Failed to get video info for:', song.bvid, infoRes.message);
        return;
      }

      // 取第一个分P的 cid（多P视频暂不支持选择）
      const cid = String(infoRes.data.info.pages[0].cid);
      console.log('[Player] Got cid:', cid, 'for bvid:', song.bvid);

      // 通过后端代理获取音频 URL
      const res = await bilibiliApi.getPlayUrl(song.bvid, cid);
      if (res.code === 0 && res.data?.audioUrl) {
        audioElement.src = res.data.audioUrl;

        // 确定当前列表和索引
        const currentList = playMode === 'shuffle' ? shuffledPlaylist : playlist;
        const index = currentList.findIndex(s => s.id === song.id);

        set({
          currentSong: song,
          currentIndex: index >= 0 ? index : 0,
          isPlaying: true
        });

        await audioElement.play().catch(console.error);

        // 加载保存的进度
        const progress = await get().loadProgress(song.id);
        if (progress > 1) {
          setTimeout(() => {
            if (audioElement) {
              audioElement.currentTime = progress;
            }
          }, 500);
        }

        // 保存设置
        playerApi.updatePlayerSettings({ lastSongId: song.id });
      } else {
        console.error('Failed to get audio URL for:', song.name, res.message);
      }
    } catch (error) {
      console.error('Error playing song:', error);
    }
  },

  playByIndex: (index) => {
    const { playMode, playlist, shuffledPlaylist } = get();
    const currentList = playMode === 'shuffle' ? shuffledPlaylist : playlist;
    if (index >= 0 && index < currentList.length) {
      get().playSong(currentList[index]);
    }
  },

  playNext: () => {
    const { playMode, playlist, shuffledPlaylist, currentIndex, currentSong } = get();
    const currentList = playMode === 'shuffle' ? shuffledPlaylist : playlist;

    if (currentList.length === 0) return;

    let nextIndex: number;
    if (playMode === 'shuffle') {
      // 随机播放下一首
      nextIndex = Math.floor(Math.random() * currentList.length);
      // 避免播放同一首
      if (currentList.length > 1 && currentList[nextIndex].id === currentSong?.id) {
        nextIndex = (nextIndex + 1) % currentList.length;
      }
    } else {
      nextIndex = (currentIndex + 1) % currentList.length;
    }

    get().playSong(currentList[nextIndex]);
  },

  playPrev: () => {
    const { playMode, playlist, shuffledPlaylist, currentIndex } = get();
    const currentList = playMode === 'shuffle' ? shuffledPlaylist : playlist;

    if (currentList.length === 0) return;

    const prevIndex = currentIndex === 0 ? currentList.length - 1 : currentIndex - 1;
    get().playSong(currentList[prevIndex]);
  },

  togglePlay: () => {
    const { audioElement, isPlaying } = get();
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play().catch(console.error);
    }
    set({ isPlaying: !isPlaying });
  },

  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  setDuration: (duration) => {
    set({ duration });
  },

  setVolume: (volume) => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.volume = volume;
    }
    set({ volume });
    playerApi.updatePlayerSettings({ volume });
  },

  setPlayMode: (mode) => {
    const { playlist, currentSong } = get();

    let shuffledPlaylist = [...playlist];
    if (mode === 'shuffle') {
      shuffledPlaylist = shuffleArray(playlist, currentSong?.id);
    }

    set({ playMode: mode, shuffledPlaylist });
    playerApi.updatePlayerSettings({ playMode: mode });
  },

  loadSettings: async () => {
    const res = await playerApi.getPlayerSettings();
    if (res.code === 0 && res.data) {
      const { volume, playMode } = res.data;
      set({
        volume: volume ?? 0.5,
        playMode: playMode || 'order'
      });

      const { audioElement } = get();
      if (audioElement) {
        audioElement.volume = volume ?? 0.5;
      }
    }
  },

  saveProgress: () => {
    const { currentSong, currentTime } = get();
    if (currentSong && currentTime > 1) {
      playerApi.savePlayProgress(currentSong.id, currentTime);
    }
  },

  loadProgress: async (songId) => {
    const res = await playerApi.getPlayProgress(songId);
    return res.code === 0 ? res.data?.progress || 0 : 0;
  }
}));
