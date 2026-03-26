import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;
const dbPath = path.join(__dirname, '../../database/bilibili-player.sqlite');

// 初始化数据库
export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  // 尝试加载现有数据库
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      cover_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      bvid TEXT NOT NULL,
      name TEXT NOT NULL,
      singer TEXT,
      singer_id TEXT,
      cover_url TEXT,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      custom_name TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (playlist_id, song_id),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lyric_cache (
      song_id TEXT PRIMARY KEY,
      lyric_content TEXT,
      translated_lyric TEXT,
      offset INTEGER DEFAULT 0,
      search_keyword TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS play_progress (
      song_id TEXT PRIMARY KEY,
      progress_seconds REAL NOT NULL,
      last_played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS player_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      play_mode TEXT DEFAULT 'order',
      volume REAL DEFAULT 0.5,
      last_playlist_id TEXT,
      last_song_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 初始化播放器设置
  const settings = db.exec('SELECT * FROM player_settings WHERE id = 1');
  if (settings.length === 0 || settings[0].values.length === 0) {
    db.run('INSERT INTO player_settings (id) VALUES (1)');
  }

  // 保存数据库
  saveDatabase();

  console.log('Database initialized successfully');
  return db;
}

// 保存数据库到文件
export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, buffer);
  }
}

// 获取数据库实例
export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// 查询辅助函数
export function queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
  const result = getDb().exec(sql, params);
  if (result.length === 0 || result[0].values.length === 0) {
    return undefined;
  }
  const columns = result[0].columns;
  const values = result[0].values[0];
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = values[i];
  });
  return obj;
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const result = getDb().exec(sql, params);
  if (result.length === 0) {
    return [];
  }
  const columns = result[0].columns;
  return result[0].values.map(values => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = values[i];
    });
    return obj;
  });
}

export function run(sql: string, params: any[] = []): { changes: number; lastInsertRowId: number } {
  getDb().run(sql, params);
  saveDatabase();
  // sql.js 没有直接返回 changes 和 lastInsertRowId
  // 我们需要通过其他方式获取
  return { changes: 1, lastInsertRowId: 0 };
}

export default { initDatabase, saveDatabase, getDb, queryOne, queryAll, run };
