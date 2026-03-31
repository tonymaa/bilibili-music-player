import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './config/database';
import routes from './routes';
import { playlistService } from './services/PlaylistService';

const app = express();
const PORT = process.env.PORT || 17600;
const SYNC_INTERVAL = 12 * 60 * 60 * 1000; // 12小时

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();

    // 中间件
    app.use(cors());
    app.use(express.json());

    // API 路由
    app.use('/api', routes);

    // 健康检查
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // 生产环境：服务前端静态文件
    if (process.env.NODE_ENV === 'production') {
      const staticPath = path.join(__dirname, '../public');
      app.use(express.static(staticPath));

      // SPA fallback - 所有非 API 路由返回 index.html
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(staticPath, 'index.html'));
        }
      });
    }

    // 错误处理
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err.message);
      res.status(500).json({ code: -1, message: '服务器内部错误' });
    });

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`API endpoint: http://localhost:${PORT}/api`);
    });

    // 启动订阅歌单定时同步（每12小时）
    setInterval(async () => {
      console.log('[Scheduler] 开始同步订阅歌单...');
      try {
        const results = await playlistService.syncAllSubscriptionPlaylists();
        console.log('[Scheduler] 同步完成:', results);
      } catch (error) {
        console.error('[Scheduler] 同步失败:', error);
      }
    }, SYNC_INTERVAL);

    // 启动后立即同步一次（延迟30秒执行）
    setTimeout(async () => {
      console.log('[Scheduler] 首次同步订阅歌单...');
      try {
        const results = await playlistService.syncAllSubscriptionPlaylists();
        console.log('[Scheduler] 首次同步完成:', results);
      } catch (error) {
        console.error('[Scheduler] 首次同步失败:', error);
      }
    }, 30000);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
