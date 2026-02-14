/**
 * Content Routes
 * 
 * 学習コンテンツの生成API
 */

import express from 'express';
import * as openaiService from '../services/openai';

export const contentRouter = express.Router();

/**
 * POST /api/content/generate
 * 学習コンテンツを生成
 */
contentRouter.post('/generate', async (req, res, next) => {
  try {
    const { learningContent, domainName, sessionDuration } = req.body;

    if (!learningContent || !domainName || !sessionDuration) {
      return res.status(400).json({
        error: 'Missing required fields: learningContent, domainName, sessionDuration',
      });
    }

    const result = await openaiService.generateLearningContent({
      learningContent,
      domainName,
      sessionDuration,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});
