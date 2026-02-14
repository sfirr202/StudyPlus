/**
 * Study Pro Server
 * 
 * Express + OpenAI API統合
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { plannerRouter } from './routes/planner';
import { contentRouter } from './routes/content';
import { notesRouter } from './routes/notes';

// 環境変数読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS設定：localhost / 127.0.0.1（ポート問わず）＋ FRONTEND_URL を許可
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

// ミドルウェア
app.use(cors({
  origin: (origin, callback) => {
    // originがundefined（同一オリジン）または許可リストに含まれる場合は許可
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // 開発用途: localhost / 127.0.0.1 からのアクセスはポート問わず許可
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
  });
});

// ルート
app.use('/api/planner', plannerRouter);
app.use('/api/content', contentRouter);
app.use('/api/notes', notesRouter);

// エラーハンドリング
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Study Pro Server running on http://localhost:${PORT}`);
  console.log(`📱 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
});
