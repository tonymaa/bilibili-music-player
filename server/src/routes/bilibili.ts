import { Router, Request, Response } from 'express';
import { bilibiliService } from '../services/BilibiliService';

const router = Router();

// 获取视频详情
router.get('/video/:bvid', async (req: Request, res: Response) => {
  const { bvid } = req.params;
  const info = await bilibiliService.getVideoInfo(bvid);

  if (!info) {
    return res.json({ code: -1, message: '获取视频信息失败' });
  }

  const songs = bilibiliService.videoToSongs(info);
  res.json({ code: 0, data: { info, songs } });
});

// 获取播放URL
router.get('/playurl/:bvid/:cid', async (req: Request, res: Response) => {
  const { bvid, cid } = req.params;
  console.log(`[PlayUrl] Request: bvid=${bvid}, cid=${cid}`);

  try {
    const audioUrl = await bilibiliService.getPlayUrl(bvid, cid);

    if (!audioUrl) {
      console.log(`[PlayUrl] Failed: bvid=${bvid}, cid=${cid} - no audio URL returned`);
      return res.json({ code: -1, message: '获取播放URL失败，可能需要登录或视频不可用' });
    }

    console.log(`[PlayUrl] Success: bvid=${bvid}, audioUrl length=${audioUrl.length}`);
    res.json({ code: 0, data: { audioUrl } });
  } catch (error: any) {
    console.error(`[PlayUrl] Error: bvid=${bvid}`, error?.message || error);
    res.json({ code: -1, message: '获取播放URL异常: ' + (error?.message || '未知错误') });
  }
});

// 获取收藏夹
router.get('/fav/:mediaId', async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const { page = 1 } = req.query;

  const result = await bilibiliService.getFavList(mediaId, Number(page));
  res.json({ code: 0, data: result });
});

// 获取系列视频
router.get('/series/:mid/:sid', async (req: Request, res: Response) => {
  const { mid, sid } = req.params;
  const { page = 1 } = req.query;

  const songs = await bilibiliService.getSeriesList(mid, sid, Number(page));
  res.json({ code: 0, data: { songs } });
});

// 获取合集视频
router.get('/collection/:mid/:sid', async (req: Request, res: Response) => {
  const { mid, sid } = req.params;
  const { page = 1 } = req.query;

  const songs = await bilibiliService.getCollectionList(mid, sid, Number(page));
  res.json({ code: 0, data: { songs } });
});

export default router;
