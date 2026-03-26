import express from 'express';
import cors from 'cors';
import { initDatabase } from './config/database';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 17600;

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

    // 错误处理
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err.message);
      res.status(500).json({ code: -1, message: '服务器内部错误' });
    });

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`API endpoint: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
