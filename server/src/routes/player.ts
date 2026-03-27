import { Router, Request, Response } from 'express';
import { playerService } from '../services/PlayerService';

const router = Router();

// 获取播放器设置
router.get('/settings', (req: Request, res: Response) => {
  const settings = playerService.getSettings();
  res.json({ code: 0, data: settings });
});

// 更新播放器设置
router.put('/settings', (req: Request, res: Response) => {
  const settings = playerService.updateSettings(req.body);
  res.json({ code: 0, data: settings });
});

// 获取播放进度
router.get('/progress/:songId', (req: Request, res: Response) => {
  const { songId } = req.params;
  const progress = playerService.getProgress(songId);
  res.json({ code: 0, data: { progress } });
});

// 保存播放进度
router.put('/progress/:songId', (req: Request, res: Response) => {
  const { songId } = req.params;
  const { progress } = req.body;

  if (typeof progress !== 'number') {
    return res.json({ code: -1, message: '进度值必须是数字' });
  }

  playerService.saveProgress(songId, progress);
  res.json({ code: 0, message: '保存成功' });
});

// 获取未播放完的歌曲
router.get('/unfinished', (req: Request, res: Response) => {
  const songs = playerService.getUnfinishedSongs();
  res.json({ code: 0, data: songs });
});

// 清空所有播放进度
router.delete('/progress', (req: Request, res: Response) => {
  playerService.clearAllProgress();
  res.json({ code: 0, message: '清空成功' });
});

// 删除单个歌曲的播放进度
router.delete('/progress/:songId', (req: Request, res: Response) => {
  const { songId } = req.params;
  playerService.deleteProgress(songId);
  res.json({ code: 0, message: '删除成功' });
});

export default router;
