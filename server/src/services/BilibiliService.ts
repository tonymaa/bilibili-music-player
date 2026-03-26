import axios from 'axios';
import { BilibiliVideoInfo, Song } from '../../../shared/types';

// Bilibili 请求头 - 模拟真实浏览器
const BILIBILI_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.bilibili.com',
  'Origin': 'https://www.bilibili.com',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
};

// 生成随机的 buvid
const generateBuvid = () => {
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

// API URLs
const URL_VIDEO_INFO = 'https://api.bilibili.com/x/web-interface/view?bvid={bvid}';
const URL_PLAY_URL = 'https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=64&fnval=16';
const URL_FAV_LIST = 'https://api.bilibili.com/x/v3/fav/resource/list?media_id={mediaId}&pn={page}&ps=20';
const URL_SERIES_LIST = 'https://api.bilibili.com/x/series/archives?mid={mid}&series_id={sid}&pn={page}&ps=30';
const URL_COLLE_LIST = 'https://api.bilibili.com/x/polymer/space/seasons_archives_list?mid={mid}&season_id={sid}&sort_reverse=false&page_num={page}&page_size=30';

// 歌名提取正则
const extractSongName = (filename: string, uploader = ''): string => {
  let name = String(filename || '').trim();
  const uploaderName = String(uploader || '').trim();

  // 尝试从书名号中提取
  const bookMatch = name.match(/《([^》]+)》/);
  if (bookMatch?.[1]) return bookMatch[1];

  // 移除 "歌手 - 歌名" 格式中的歌手
  const artistTitle = name.match(/^.+?\s-\s(.+)$/);
  if (artistTitle?.[1]) {
    name = artistTitle[1];
  }

  // 如果包含上传者名称，移除后再处理
  if (uploaderName && name.includes(uploaderName)) {
    name = name.replaceAll(uploaderName, '');
  }

  // 移除【】[]等标签
  name = name.replace(/[【\[].+?[】\]]/g, '');

  // 移除括号内容
  name = name.replace(/\(.*?\)|（.*?）/g, '');

  // 移除序号前缀
  name = name.replace(/^\d+[._\-\s]*/, '');

  return name.trim() || filename;
};

export class BilibiliService {
  // 获取视频详情
  async getVideoInfo(bvid: string): Promise<BilibiliVideoInfo | null> {
    try {
      const url = URL_VIDEO_INFO.replace('{bvid}', bvid);
      const res = await axios.get(url, { headers: BILIBILI_HEADERS });

      if (res.data.code !== 0) {
        console.error('Bilibili API error:', res.data.message);
        return null;
      }

      const data = res.data.data;
      return {
        bvid: data.bvid,
        title: data.title,
        desc: data.desc,
        pic: data.pic,
        owner: {
          mid: data.owner.mid,
          name: data.owner.name
        },
        pages: data.pages.map((p: any) => ({
          cid: p.cid,
          part: p.part,
          duration: p.duration
        })),
        videos: data.videos
      };
    } catch (error) {
      console.error('Failed to fetch video info:', error);
      return null;
    }
  }

  // 获取播放URL
  async getPlayUrl(bvid: string, cid: string): Promise<string> {
    try {
      const url = URL_PLAY_URL.replace('{bvid}', bvid).replace('{cid}', cid);
      console.log('Fetching play URL:', url);

      // 生成更真实的 cookie
      const timestamp = Date.now();
      const buvid3 = `X${generateBuvid()}${generateBuvid()}infoc`;
      const buvid4 = `X${generateBuvid()}${generateBuvid()}infoc`;

      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `https://www.bilibili.com/video/${bvid}`,
          'Origin': 'https://www.bilibili.com',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cookie': `buvid3=${buvid3}; buvid4=${buvid4}; CURRENT_FNVAL=4048; b_nut=${timestamp};`,
        },
        timeout: 15000
      });

      console.log('PlayUrl API response:', JSON.stringify(res.data).substring(0, 500));

      if (res.data.code !== 0) {
        console.error('Bilibili API error:', res.data.code, res.data.message);
        return await this.getPlayUrlFallback(bvid, cid);
      }

      const audioUrl = this.extractAudioUrl(res.data);
      console.log('Extracted audio URL:', audioUrl ? 'success' : 'failed');

      if (!audioUrl) {
        return await this.getPlayUrlFallback(bvid, cid);
      }

      return audioUrl;
    } catch (error: any) {
      console.error('Failed to fetch play URL:', error?.message || error);
      return await this.getPlayUrlFallback(bvid, cid);
    }
  }

  // 备用方案：尝试不同的参数组合
  async getPlayUrlFallback(bvid: string, cid: string): Promise<string> {
    try {
      console.log('Trying fallback method for', bvid, cid);

      // 尝试使用更简单的参数
      const url = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=16&fnval=16&fnver=0&fourk=0`;

      const timestamp = Date.now();
      const buvid3 = `X${generateBuvid()}${generateBuvid()}infoc`;

      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `https://www.bilibili.com/video/${bvid}`,
          'Accept': 'application/json, text/plain, */*',
          'Cookie': `buvid3=${buvid3}; CURRENT_FNVAL=4048; b_nut=${timestamp};`,
        },
        timeout: 15000
      });

      console.log('Fallback API response code:', res.data.code);

      if (res.data.code === 0) {
        const audioUrl = this.extractAudioUrl(res.data);
        if (audioUrl) {
          console.log('Fallback extracted audio URL success');
          return audioUrl;
        }
      }

      console.log('All methods failed for', bvid, cid);
      return '';
    } catch (error: any) {
      console.error('Fallback method failed:', error?.message || error);
      return '';
    }
  }

  // 提取音频URL
  private extractAudioUrl(json: any): string {
    // DASH 格式
    const audios = json?.data?.dash?.audio || [];
    if (audios.length > 0) {
      // 按带宽排序，选择最高质量
      const sorted = [...audios].sort((a: any, b: any) => {
        const aScore = Number(a?.bandwidth || a?.id || 0);
        const bScore = Number(b?.bandwidth || b?.id || 0);
        return bScore - aScore;
      });

      // 优先选择 mp4a 编码
      const preferred = sorted.find((a: any) =>
        String(a?.codecs || '').includes('mp4a')
      ) || sorted[0];

      const url = preferred?.baseUrl || preferred?.base_url || preferred?.backupUrl?.[0] || preferred?.backup_url?.[0] || '';
      if (url) return url;
    }

    // FLV/MP4 格式备用
    const durl = json?.data?.durl || [];
    if (durl.length > 0) {
      return durl[0]?.url || durl[0]?.backup_url?.[0] || '';
    }

    return '';
  }

  // 视频信息转歌曲列表
  videoToSongs(info: BilibiliVideoInfo): Song[] {
    const songs: Song[] = [];

    if (info.pages.length === 1) {
      // 单P视频
      songs.push({
        id: String(info.pages[0].cid),
        bvid: info.bvid,
        name: extractSongName(info.title, info.owner.name),
        singer: info.owner.name,
        singerId: info.owner.mid,
        cover: info.pic,
        duration: info.pages[0].duration
      });
    } else {
      // 多P视频
      for (const page of info.pages) {
        songs.push({
          id: String(page.cid),
          bvid: info.bvid,
          name: extractSongName(page.part, info.owner.name),
          singer: info.owner.name,
          singerId: info.owner.mid,
          cover: info.pic,
          duration: page.duration
        });
      }
    }

    return songs;
  }

  // 获取收藏夹
  async getFavList(mediaId: string, page = 1): Promise<{ songs: Song[]; hasMore: boolean; total: number }> {
    try {
      const url = URL_FAV_LIST.replace('{mediaId}', mediaId).replace('{page}', String(page));
      const res = await axios.get(url, { headers: BILIBILI_HEADERS });

      if (res.data.code !== 0) {
        console.error('Bilibili API error:', res.data.message);
        return { songs: [], hasMore: false, total: 0 };
      }

      const data = res.data.data;
      const songs: Song[] = (data.medias || []).map((item: any) => ({
        id: String(item.id),
        bvid: item.bvid,
        name: extractSongName(item.title, item.upper?.name),
        singer: item.upper?.name || '',
        singerId: item.upper?.mid || 0,
        cover: item.cover,
        duration: item.duration
      }));

      return {
        songs,
        hasMore: data.has_more || false,
        total: data.info?.media_count || songs.length
      };
    } catch (error) {
      console.error('Failed to fetch fav list:', error);
      return { songs: [], hasMore: false, total: 0 };
    }
  }

  // 获取系列视频
  async getSeriesList(mid: string, sid: string, page = 1): Promise<Song[]> {
    try {
      const url = URL_SERIES_LIST.replace('{mid}', mid).replace('{sid}', sid).replace('{page}', String(page));
      const res = await axios.get(url, { headers: BILIBILI_HEADERS });

      if (res.data.code !== 0) {
        console.error('Bilibili API error:', res.data.message);
        return [];
      }

      const archives = res.data.data?.archives || [];
      const songs: Song[] = [];

      for (const archive of archives) {
        const info = await this.getVideoInfo(archive.bvid);
        if (info) {
          songs.push(...this.videoToSongs(info));
        }
      }

      return songs;
    } catch (error) {
      console.error('Failed to fetch series list:', error);
      return [];
    }
  }

  // 获取合集视频
  async getCollectionList(mid: string, sid: string, page = 1): Promise<Song[]> {
    try {
      const url = URL_COLLE_LIST.replace('{mid}', mid).replace('{sid}', sid).replace('{page}', String(page));
      const res = await axios.get(url, { headers: BILIBILI_HEADERS });

      if (res.data.code !== 0) {
        console.error('Bilibili API error:', res.data.message);
        return [];
      }

      const archives = res.data.data?.archives || [];
      const songs: Song[] = [];

      for (const archive of archives) {
        const info = await this.getVideoInfo(archive.bvid);
        if (info) {
          songs.push(...this.videoToSongs(info));
        }
      }

      return songs;
    } catch (error) {
      console.error('Failed to fetch collection list:', error);
      return [];
    }
  }
}

export const bilibiliService = new BilibiliService();
