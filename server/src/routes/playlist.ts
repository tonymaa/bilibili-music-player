import { Router, Request, Response } from 'express';
import { playlistService } from '../services/PlaylistService';

const router = Router();

// 获取所有歌单
router.get('/', (req: Request, res: Response) => {
  const playlists = playlistService.getAllPlaylists();
  res.json({ code: 0, data: playlists });
});

// 获取歌单详情
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = 1, pageSize = 50, search } = req.query;

  const playlist = playlistService.getPlaylistById(
    id,
    Number(page),
    Number(pageSize),
    search as string
  );

  if (!playlist) {
    return res.json({ code: -1, message: '歌单不存在' });
  }

  res.json({ code: 0, data: playlist });
});

// 创建歌单
router.post('/', (req: Request, res: Response) => {
  const { title, description } = req.body;

  if (!title) {
    return res.json({ code: -1, message: '歌单名称不能为空' });
  }

  const playlist = playlistService.createPlaylist(title, description);
  res.json({ code: 0, data: playlist });
});

// 更新歌单
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description } = req.body;

  const playlist = playlistService.updatePlaylist(id, title, description);

  if (!playlist) {
    return res.json({ code: -1, message: '歌单不存在' });
  }

  res.json({ code: 0, data: playlist });
});

// 删除歌单
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const success = playlistService.deletePlaylist(id);

  if (!success) {
    return res.json({ code: -1, message: '歌单不存在' });
  }

  res.json({ code: 0, message: '删除成功' });
});

// 添加歌曲到歌单
router.post('/:id/songs', (req: Request, res: Response) => {
  const { id } = req.params;
  const { songs } = req.body;

  if (!songs || !Array.isArray(songs) || songs.length === 0) {
    return res.json({ code: -1, message: '歌曲列表不能为空' });
  }

  const addedCount = playlistService.addSongsToPlaylist(id, songs);
  res.json({ code: 0, addedCount });
});

// 从歌单删除歌曲
router.delete('/:id/songs', (req: Request, res: Response) => {
  const { id } = req.params;
  const { songIds } = req.body;

  if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
    return res.json({ code: -1, message: '歌曲ID列表不能为空' });
  }

  const removedCount = playlistService.removeSongsFromPlaylist(id, songIds);
  res.json({ code: 0, removedCount });
});

// 重命名歌单中的歌曲
router.put('/:id/songs/rename', (req: Request, res: Response) => {
  const { id } = req.params;
  const { songId, newName } = req.body;

  if (!songId || !newName) {
    return res.json({ code: -1, message: '参数不完整' });
  }

  const success = playlistService.renameSongInPlaylist(id, songId, newName);

  if (!success) {
    return res.json({ code: -1, message: '歌曲不存在' });
  }

  res.json({ code: 0, message: '重命名成功' });
});

// 导出数据
router.get('/export/all', (req: Request, res: Response) => {
  const data = playlistService.exportData();
  res.json({ code: 0, data });
});

// 导入数据
router.post('/import', (req: Request, res: Response) => {
  const { playlists } = req.body;

  if (!playlists || !Array.isArray(playlists)) {
    return res.json({ code: -1, message: '数据格式错误' });
  }

  const importedCount = playlistService.importData({ playlists });
  res.json({ code: 0, importedCount });
});

export default router;
