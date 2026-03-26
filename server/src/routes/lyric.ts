import { Router, Request, Response } from 'express';
import { lyricService } from '../services/LyricService';

const router = Router();

// 搜索歌词
router.get('/search', async (req: Request, res: Response) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.json({ code: -1, message: '搜索关键词不能为空' });
  }

  const results = await lyricService.searchLyric(keyword as string);
  res.json({ code: 0, data: results });
});

// 获取歌词
router.get('/:songId', async (req: Request, res: Response) => {
  const { songId } = req.params;
  const { keyword, qqMid } = req.query;

  const lyric = await lyricService.getLyric(
    songId,
    keyword as string,
    qqMid as string
  );

  if (!lyric) {
    return res.json({ code: -1, message: '未找到歌词' });
  }

  res.json({ code: 0, data: lyric });
});

// 更新歌词偏移
router.put('/:songId/offset', (req: Request, res: Response) => {
  const { songId } = req.params;
  const { offset } = req.body;

  if (typeof offset !== 'number') {
    return res.json({ code: -1, message: '偏移值必须是数字' });
  }

  const success = lyricService.updateLyricOffset(songId, offset);

  if (!success) {
    return res.json({ code: -1, message: '歌词缓存不存在' });
  }

  res.json({ code: 0, message: '更新成功' });
});

// 保存歌词
router.post('/:songId', (req: Request, res: Response) => {
  const { songId } = req.params;
  const { lyric, translated } = req.body;

  if (!lyric) {
    return res.json({ code: -1, message: '歌词内容不能为空' });
  }

  lyricService.saveLyric(songId, lyric, translated);
  res.json({ code: 0, message: '保存成功' });
});

export default router;
