import { create } from 'zustand';
import { Playlist, PlaylistDetail, Song } from '@shared/types';
import * as playlistApi from '../api/playlist';

interface PlaylistState {
  playlists: Playlist[];
  currentPlaylist: PlaylistDetail | null;
  loading: boolean;

  // Actions
  loadPlaylists: () => Promise<void>;
  loadPlaylistDetail: (id: string, page?: number, search?: string) => Promise<void>;
  createPlaylist: (title: string, description?: string) => Promise<Playlist | null>;
  updatePlaylist: (id: string, data: { title?: string; description?: string }) => Promise<boolean>;
  deletePlaylist: (id: string) => Promise<boolean>;
  addSongsToPlaylist: (playlistId: string, songs: Song[]) => Promise<number>;
  removeSongsFromPlaylist: (playlistId: string, songIds: string[]) => Promise<number>;
  renameSongInPlaylist: (playlistId: string, songId: string, newName: string) => Promise<boolean>;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  currentPlaylist: null,
  loading: false,

  loadPlaylists: async () => {
    set({ loading: true });
    const res = await playlistApi.getPlaylists();
    set({ loading: false });

    if (res.code === 0 && res.data) {
      set({ playlists: res.data });
    }
  },

  loadPlaylistDetail: async (id, page = 1, search) => {
    set({ loading: true });
    const res = await playlistApi.getPlaylistDetail(id, page, 50, search);
    set({ loading: false });

    if (res.code === 0 && res.data) {
      set({ currentPlaylist: res.data });
    }
  },

  createPlaylist: async (title, description) => {
    const res = await playlistApi.createPlaylist(title, description);
    if (res.code === 0 && res.data) {
      const { playlists } = get();
      set({ playlists: [res.data, ...playlists] });
      return res.data;
    }
    return null;
  },

  updatePlaylist: async (id, data) => {
    const res = await playlistApi.updatePlaylist(id, data);
    if (res.code === 0) {
      await get().loadPlaylists();
      return true;
    }
    return false;
  },

  deletePlaylist: async (id) => {
    const res = await playlistApi.deletePlaylist(id);
    if (res.code === 0) {
      const { playlists, currentPlaylist } = get();
      set({
        playlists: playlists.filter(p => p.id !== id),
        currentPlaylist: currentPlaylist?.id === id ? null : currentPlaylist
      });
      return true;
    }
    return false;
  },

  addSongsToPlaylist: async (playlistId, songs) => {
    const res = await playlistApi.addSongsToPlaylist(playlistId, songs);
    if (res.code === 0) {
      // 刷新歌单列表和详情
      await get().loadPlaylists();
      const { currentPlaylist } = get();
      if (currentPlaylist?.id === playlistId) {
        await get().loadPlaylistDetail(playlistId);
      }
      return res.data?.addedCount || 0;
    }
    return 0;
  },

  removeSongsFromPlaylist: async (playlistId, songIds) => {
    const res = await playlistApi.removeSongsFromPlaylist(playlistId, songIds);
    if (res.code === 0) {
      await get().loadPlaylists();
      const { currentPlaylist } = get();
      if (currentPlaylist?.id === playlistId) {
        await get().loadPlaylistDetail(playlistId);
      }
      return res.data?.removedCount || 0;
    }
    return 0;
  },

  renameSongInPlaylist: async (playlistId, songId, newName) => {
    const res = await playlistApi.renameSongInPlaylist(playlistId, songId, newName);
    if (res.code === 0) {
      const { currentPlaylist } = get();
      if (currentPlaylist?.id === playlistId) {
        await get().loadPlaylistDetail(playlistId);
      }
      return true;
    }
    return false;
  }
}));
