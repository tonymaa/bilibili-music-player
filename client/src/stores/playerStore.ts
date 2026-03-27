import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song } from '@shared/types';
import * as playerApi from '../api/player';
import * as bilibiliApi from '../api/bilibili';

// 洗牌函数
function shuffleArray<T extends { id: string }>(array: T[], keepFirstId?: string): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  // 如果需要保持第一首
  if (keepFirstId && result.length >= 2) {
    const keepIndex = result.findIndex((s) => s.id === keepFirstId);
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

  // 加载状态（防止重复请求）
  loadingBvid: string | null;

  // 待跳转的播放时间（用于 duration 加载完成前）
  pendingSeekTime: number;

  // Actions
  setAudioElement: (audio: HTMLAudioElement) => void;
  setPlaylist: (songs: Song[], playFirst?: boolean) => void;
  addToPlaylist: (songs: Song[]) => void;
  removeFromPlaylist: (index: number) => void;
  clearPlaylist: () => void;
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
  setPendingSeekTime: (time: number) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
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
      loadingBvid: null,
      pendingSeekTime: 0,

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

  removeFromPlaylist: (index) => {
    const { playlist, shuffledPlaylist, currentIndex, currentSong, playMode } = get();
    if (index < 0 || index >= playlist.length) return;

    const removedSong = playlist[index];
    const newPlaylist = playlist.filter((_, i) => i !== index);
    const newShuffled = shuffledPlaylist.filter(s => s.id !== removedSong.id);

    let newCurrentSong = currentSong;
    let newCurrentIndex = currentIndex;
    let newIsPlaying = get().isPlaying;

    // 如果删除的是当前播放的歌曲
    if (currentSong?.id === removedSong.id) {
      if (newPlaylist.length === 0) {
        newCurrentSong = null;
        newCurrentIndex = 0;
        newIsPlaying = false;
        get().audioElement?.pause();
      } else {
        // 播放下一首（或第一首）
        const nextIndex = Math.min(currentIndex, newPlaylist.length - 1);
        const currentList = playMode === 'shuffle' ? newShuffled : newPlaylist;
        newCurrentSong = currentList[nextIndex] || null;
        newCurrentIndex = nextIndex;
        if (newCurrentSong) {
          get().playSong(newCurrentSong);
        }
      }
    } else if (currentIndex > index) {
      // 如果删除的歌曲在当前播放歌曲之前，更新索引
      newCurrentIndex = currentIndex - 1;
    }

    set({
      playlist: newPlaylist,
      shuffledPlaylist: newShuffled,
      currentSong: newCurrentSong,
      currentIndex: newCurrentIndex,
      isPlaying: newIsPlaying
    });
  },

  clearPlaylist: () => {
    get().audioElement?.pause();
    set({
      playlist: [],
      shuffledPlaylist: [],
      currentSong: null,
      currentIndex: 0,
      isPlaying: false
    });
  },

  playSong: async (song) => {
    const { audioElement, playlist, shuffledPlaylist, playMode, loadingBvid } = get();
    if (!audioElement) return;

    // 防止重复请求：如果正在加载同一个 bvid，直接返回
    if (loadingBvid === song.bvid) {
      console.log('[Player] Already loading bvid:', song.bvid);
      return;
    }

    // 如果当前播放的就是这首歌，直接播放
    if (get().currentSong?.id === song.id && audioElement.src) {
      const currentList = playMode === 'shuffle' ? shuffledPlaylist : playlist;
      const index = currentList.findIndex(s => s.id === song.id);
      set({ currentSong: song, currentIndex: index >= 0 ? index : 0, isPlaying: true });
      await audioElement.play().catch(console.error);
      return;
    }

    try {
      // 标记正在加载
      set({ loadingBvid: song.bvid });

      // 先获取视频详情拿到 cid（收藏夹返回的 song.id 是 aid，不是 cid）
      const infoRes = await bilibiliApi.getVideoInfo(song.bvid);
      if (infoRes.code !== 0 || !infoRes.data?.info?.pages?.length) {
        console.error('Failed to get video info for:', song.bvid, infoRes.message);
        set({ loadingBvid: null });
        return;
      }

      // 取第一个分P的 cid（多P视频暂不支持选择）
      const cid = String(infoRes.data.info.pages[0].cid);
      console.log('[Player] Got cid:', cid, 'for bvid:', song.bvid);

      // 通过后端代理获取音频 URL
      const res = await bilibiliApi.getPlayUrl(song.bvid, cid);
      if (res.code === 0 && res.data?.audioUrl) {
        // 先加载保存的进度（要在设置 src 之前，这样 loadedmetadata 触发时 pendingSeekTime 已经设置好了）
        const progress = await get().loadProgress(song.id);
        if (progress > 1) {
          set({ pendingSeekTime: progress });
        }

        // 通过后端代理播放，避免 403
        audioElement.src = `/api/bilibili/audio-proxy?url=${encodeURIComponent(res.data.audioUrl)}`;

        // 确定当前列表和索引
        const currentList = playMode === 'shuffle' ? shuffledPlaylist : playlist;
        const index = currentList.findIndex(s => s.id === song.id);

        set({
          currentSong: song,
          currentIndex: index >= 0 ? index : 0,
          isPlaying: true
        });

        await audioElement.play().catch(console.error);

        // 保存设置
        playerApi.updatePlayerSettings({ lastSongId: song.id });
      } else {
        console.error('Failed to get audio URL for:', song.name, res.message);
      }
    } catch (error) {
      console.error('Error playing song:', error);
    } finally {
      // 清除加载标记
      set({ loadingBvid: null });
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
  },

  setPendingSeekTime: (time) => {
    set({ pendingSeekTime: time });
  }
}), {
  name: 'player-storage',
  partialize: (state) => ({
    playlist: state.playlist,
    shuffledPlaylist: state.shuffledPlaylist,
    currentSong: state.currentSong,
    currentIndex: state.currentIndex,
    volume: state.volume,
    playMode: state.playMode,
    currentTime: state.currentTime
  })
}));
