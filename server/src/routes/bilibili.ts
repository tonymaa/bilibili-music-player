import { Router, Request, Response } from 'express';
import axios from 'axios';
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

// 音频流代理
router.get('/audio-proxy', async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ code: -1, message: '缺少 url 参数' });
  }

  console.log('[AudioProxy] Proxying:', url.substring(0, 100) + '...');

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/',
        'Origin': 'https://www.bilibili.com',
      },
      responseType: 'stream',
      timeout: 30000,
    });

    // 转发响应头
    res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mp4');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    if (response.headers['accept-ranges']) {
      res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
    }

    // 流式转发
    response.data.pipe(res);

    response.data.on('error', (err: Error) => {
      console.error('[AudioProxy] Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ code: -1, message: '流传输错误' });
      }
    });

  } catch (error: any) {
    console.error('[AudioProxy] Failed:', error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({ code: -1, message: '代理请求失败: ' + (error?.message || '未知错误') });
    }
  }
});

// 图片代理
router.get('/image-proxy', async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ code: -1, message: '缺少 url 参数' });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/',
      },
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(response.data);

  } catch (error: any) {
    console.error('[ImageProxy] Failed:', url, error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({ code: -1, message: '图片代理失败' });
    }
  }
});

export default router;
