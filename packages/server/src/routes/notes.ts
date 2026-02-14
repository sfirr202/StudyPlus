/**
 * Notes Routes
 *
 * ノート自動生成API（AI）。未実装時はクライアントがテンプレートにフォールバック
 */

import express from 'express';

export const notesRouter = express.Router();

/**
 * POST /api/notes/generate
 * セッション完了時にノートを生成（AI）
 * 未実装の場合は 501 を返し、クライアントはテンプレートノートを保存する
 */
notesRouter.post('/generate', async (req, res, next) => {
  try {
    // TODO: OpenAI でノート生成（要約・重要ポイント・例・リコール問題）
    res.status(501).json({
      error: 'Not implemented',
      message: 'AI note generation is not implemented yet. Client will use template.',
    });
  } catch (error) {
    next(error);
  }
});
