/**
 * Planner Routes
 * 
 * 週次プラン、今日のセット、2択問題の生成API
 */

import express from 'express';
import * as openaiService from '../services/openai';

export const plannerRouter = express.Router();

/**
 * POST /api/planner/weekly-plan
 * 週次プランを生成
 */
plannerRouter.post('/weekly-plan', async (req, res, next) => {
  try {
    const { domainName, frequency, sessionDuration } = req.body;

    if (!domainName || !frequency || !sessionDuration) {
      return res.status(400).json({
        error: 'Missing required fields: domainName, frequency, sessionDuration',
      });
    }

    const result = await openaiService.generateWeeklyPlan({
      domainName,
      frequency,
      sessionDuration,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/planner/today-set
 * 今日の学習セットを生成
 */
plannerRouter.post('/today-set', async (req, res, next) => {
  try {
    const { domainName, themes, sessionCount, sessionDuration } = req.body;

    if (!domainName || !themes || sessionCount === undefined || !sessionDuration) {
      return res.status(400).json({
        error: 'Missing required fields: domainName, themes, sessionCount, sessionDuration',
      });
    }

    const result = await openaiService.generateTodaySet({
      domainName,
      themes,
      sessionCount,
      sessionDuration,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/planner/recall-question
 * 2択問題を生成
 */
plannerRouter.post('/recall-question', async (req, res, next) => {
  try {
    const { domainName, learningContent, sessionDuration } = req.body;

    if (!domainName || !learningContent || !sessionDuration) {
      return res.status(400).json({
        error: 'Missing required fields: domainName, learningContent, sessionDuration',
      });
    }

    const result = await openaiService.generateRecallQuestion({
      domainName,
      learningContent,
      sessionDuration,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/planner/suggest-topics
 * 学習トピックを提案
 */
plannerRouter.post('/suggest-topics', async (req, res, next) => {
  try {
    const { domainName, sessionCount } = req.body;

    if (!domainName) {
      return res.status(400).json({
        error: 'Missing required field: domainName',
      });
    }

    const result = await openaiService.suggestLearningTopics({
      domainName,
      sessionCount: sessionCount || 0,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});
