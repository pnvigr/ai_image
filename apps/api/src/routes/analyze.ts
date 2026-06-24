import { Router } from 'express';
import { ZodError } from 'zod';
import {
  AnalyzeRequestSchema,
  AnalysisResultSchema,
  ANALYSIS_DISCLAIMER,
  type AnalysisResult,
} from '@ai-image/shared';
import { config, hasOpenRouter } from '../config.js';
import { analyzeWithOpenRouter, mockAnalysis, OpenRouterError } from '../lib/openrouter.js';
import { isDbConnected } from '../db.js';
import { Analysis } from '../models/Analysis.js';

export const analyzeRouter = Router();

analyzeRouter.post('/', async (req, res) => {
  const parse = AnalyzeRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const { imageDataUrl, pairHint, timeframeHint, tier } = parse.data;

  const usingMock = !hasOpenRouter();
  const model = tier === 'paid' ? config.openRouter.paidModel : config.openRouter.freeModel;
  const usedModelLabel = usingMock ? 'mock' : model;

  try {
    const output = usingMock
      ? mockAnalysis({ pairHint, timeframeHint })
      : await analyzeWithOpenRouter({ imageDataUrl, pairHint, timeframeHint, model });

    let id: string | undefined;
    let createdAt: string | undefined;
    if (isDbConnected()) {
      const doc = await Analysis.create({ ...output, model: usedModelLabel, mock: usingMock });
      id = String(doc._id);
      createdAt = (doc as { createdAt?: Date }).createdAt?.toISOString();
    }

    const result: AnalysisResult = AnalysisResultSchema.parse({
      ...output,
      id,
      createdAt,
      model: usedModelLabel,
      mock: usingMock,
      disclaimer: ANALYSIS_DISCLAIMER,
    });
    return res.json(result);
  } catch (err) {
    if (err instanceof OpenRouterError) {
      // Лимит free-тира / rate limit → подсказка перейти на платную модель (полный флоу в Фазе 4)
      if (err.status === 429) {
        return res.status(429).json({
          error: 'rate_limited',
          message: 'Лимит бесплатной модели исчерпан. Попробуйте позже или переключитесь на платную модель.',
          upgrade: true,
        });
      }
      return res.status(502).json({
        error: 'provider_error',
        status: err.status,
        message: 'Ошибка провайдера ИИ. Попробуйте ещё раз.',
        body: err.body.slice(0, 500),
      });
    }
    if (err instanceof ZodError) {
      return res.status(422).json({
        error: 'bad_model_output',
        message: 'Модель вернула ответ не в ожидаемом формате. Попробуйте ещё раз.',
        details: err.flatten(),
      });
    }
    console.error('[analyze] неожиданная ошибка:', err);
    return res.status(500).json({ error: 'internal', message: 'Внутренняя ошибка сервера.' });
  }
});
