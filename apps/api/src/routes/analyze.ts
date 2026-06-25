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
import { optionalAuth } from '../middleware/auth.js';
import { createAnalysis, countUserFreeToday } from '../store/analyses.js';
import { adjustTokens } from '../store/users.js';

export const analyzeRouter = Router();

analyzeRouter.post('/', optionalAuth, async (req, res) => {
  const parse = AnalyzeRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const { imageDataUrl, pairHint, timeframeHint, tier } = parse.data;
  const user = req.user ?? null;

  const usingMock = !hasOpenRouter();
  const model = tier === 'paid' ? config.openRouter.paidModel : config.openRouter.freeModel;
  const usedModelLabel = usingMock ? 'mock' : model;

  // Платная модель: нужен аккаунт и достаточный баланс токенов.
  if (tier === 'paid') {
    if (!user) {
      return res
        .status(401)
        .json({ error: 'auth_required', message: 'Войдите, чтобы использовать платную модель.' });
    }
    if (user.tokensBalance < config.billing.paidAnalysisCost) {
      return res.status(402).json({
        error: 'insufficient_tokens',
        message: 'Недостаточно токенов. Пополните баланс, чтобы пользоваться платной моделью.',
        topup: true,
      });
    }
  } else if (user) {
    // Бесплатный тариф: дневной лимит на пользователя (имитация лимитов free-тира).
    const usedToday = await countUserFreeToday(user.id);
    if (usedToday >= config.billing.freeDailyLimit) {
      return res.status(429).json({
        error: 'free_limit',
        message: 'Дневной лимит бесплатных анализов исчерпан. Переключитесь на платную модель.',
        upgrade: true,
      });
    }
  }

  try {
    const output = usingMock
      ? mockAnalysis({ pairHint, timeframeHint })
      : await analyzeWithOpenRouter({ imageDataUrl, pairHint, timeframeHint, model });

    // Сохраняем всегда (Mongo или in-memory). Если пользователь залогинен — привязываем к нему.
    const saved = await createAnalysis({
      output,
      model: usedModelLabel,
      mock: usingMock,
      tier,
      userId: user?.id ?? null,
    });

    // Списываем токены за платный анализ только при успехе.
    if (tier === 'paid' && user) {
      await adjustTokens(user.id, -config.billing.paidAnalysisCost);
    }

    const result: AnalysisResult = AnalysisResultSchema.parse({
      ...output,
      id: saved.id,
      createdAt: saved.createdAt,
      model: usedModelLabel,
      mock: usingMock,
      disclaimer: ANALYSIS_DISCLAIMER,
    });
    return res.json(result);
  } catch (err) {
    if (err instanceof OpenRouterError) {
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
