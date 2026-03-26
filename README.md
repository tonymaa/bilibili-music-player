# Bilibili Player

一个基于 React + Node.js + SQLite 的 Bilibili 音乐播放器。

## 功能特性

- 搜索：支持 BV号、收藏夹ID、合集链接、系列链接
- 歌单管理：创建、删除、重命名歌单
- 播放器：播放控制、进度保存、播放模式切换
- 歌词：搜索歌词、歌词显示、偏移调整

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Ant Design 5
- Zustand (状态管理)
- react-lrc (歌词显示)

### 后端
- Node.js + Express
- TypeScript
- SQLite (better-sqlite3)

## 项目结构

```
bilibili-player/
├── client/          # 前端项目
│   ├── src/
│   │   ├── api/     # API 请求
│   │   ├── components/  # React 组件
│   │   ├── stores/  # Zustand 状态管理
│   │   └── App.tsx
│   └── package.json
│
├── server/          # 后端项目
│   ├── src/
│   │   ├── routes/  # 路由
│   │   ├── services/  # 业务逻辑
│   │   └── app.ts
│   └── package.json
│
└── shared/          # 共享类型
    └── types/
```

## 快速开始

### 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 启动开发服务器

```bash
# 启动后端 (在 server 目录)
npm run dev

# 启动前端 (在 client 目录，新终端)
npm run dev
```

### 访问

- 前端: http://localhost:17500
- 后端 API: http://localhost:17600/api

## 使用说明

### 搜索格式

| 类型 | 示例 |
|------|------|
| BV号 | `BV1w44y1b7MX` |
| 收藏夹ID | `1303535681` |
| 合集链接 | `https://space.bilibili.com/xxx/channel/collectiondetail?sid=xxx` |
| 系列链接 | `https://space.bilibili.com/xxx/channel/seriesdetail?sid=xxx` |

### 快捷键

| 按键 | 功能 |
|------|------|
| 空格 | 播放/暂停 |
| 左箭头 | 快退 5 秒 |
| 右箭头 | 快进 5 秒 |
| 上箭头 | 音量增加 |
| 下箭头 | 音量减少 |

## License

MIT
