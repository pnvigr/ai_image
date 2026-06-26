import { Router } from 'express';
import { ZodError } from 'zod';
import {
  AnalyzeRequestSchema,
  AnalysisResultSchema,
  ANALYSIS_DISCLAIMER,
  type AnalysisModelOutput,
  type AnalysisResult,
  type AiModelInfo,
} from '@ai-image/shared';
import { config, hasOpenRouter } from '../config.js';
import { analyzeWithOpenRouter, analyzeWithFallback, mockAnalysis, AllModelsFailedError } from '../lib/openrouter.js';
import { optionalAuth } from '../middleware/auth.js';
import { createAnalysis, countUserFreeToday } from '../store/analyses.js';
import { adjustTokens } from '../store/users.js';
import { listEnabledByTier } from '../store/models.js';

export const analyzeRouter = Router();

function toRef(m: AiModelInfo) {
  return { modelId: m.modelId, label: m.label, costTokens: m.costTokens };
}

analyzeRouter.post('/', optionalAuth, async (req, res) => {
  const parse = AnalyzeRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const { imageDataUrl, pairHint, timeframeHint, tier, modelId } = parse.data;
  const user = req.user ?? null;
  const usingMock = !hasOpenRouter();

  // ── Проверки и выбор модели по тарифу ──
  let chosenPaid: AiModelInfo | null = null;
  let cost = 0;

  if (tier === 'paid') {
    if (!user) {
      return res
        .status(401)
        .json({ error: 'auth_required', message: 'Sign in to use a paid model.' });
    }
    const paidList = await listEnabledByTier('paid');
    if (paidList.length === 0) {
      return res
        .status(503)
        .json({ error: 'no_paid_models', message: 'No paid models are configured. Contact the administrator.' });
    }
    // Берём выбранную модель; если не задана/не найдена — первую доступную.
    chosenPaid = (modelId && paidList.find((m) => m.modelId === modelId)) || paidList[0];
    cost = chosenPaid.costTokens || config.billing.paidAnalysisCost;
    if (user.tokensBalance < cost) {
      return res.status(402).json({
        error: 'insufficient_tokens',
        message: 'Not enough tokens. Top up your balance to use a paid model.',
        topup: true,
      });
    }
  } else if (user) {
    // Бесплатный тариф: дневной лимит на пользователя.
    const usedToday = await countUserFreeToday(user.id);
    if (usedToday >= config.billing.freeDailyLimit) {
      return res.status(429).json({
        error: 'free_limit',
        message: 'Daily free-analysis limit reached. Switch to a paid model.',
        upgrade: true,
      });
    }
  }

  try {
    let output: AnalysisModelOutput;
    let usedModelLabel: string;

    if (usingMock) {
      // Демо-режим без ключа: один mock-ответ (направление случайно — часть тезиса).
      output = mockAnalysis({ pairHint, timeframeHint });
      usedModelLabel = tier === 'paid' && chosenPaid ? chosenPaid.modelId : 'mock';
    } else if (tier === 'paid' && chosenPaid) {
      // Платная: одна выбранная модель; при ошибке предлагаем другие платные.
      try {
        output = await analyzeWithOpenRouter({ imageDataUrl, pairHint, timeframeHint, model: chosenPaid.modelId });
        usedModelLabel = chosenPaid.modelId;
      } catch {
        const others = (await listEnabledByTier('paid')).filter((m) => m.modelId !== chosenPaid!.modelId);
        return res.status(502).json({
          error: 'paid_model_failed',
          message: `The “${chosenPaid.label}” model is unavailable right now. Try another paid model.`,
          alternatives: others.map(toRef),
        });
      }
    } else {
      // Бесплатная: перебираем модели по порядку до первого успеха.
      const freeModels = (await listEnabledByTier('free')).map((m) => m.modelId);
      const candidates = freeModels.length ? freeModels : [config.openRouter.freeModel];
      try {
        const r = await analyzeWithFallback({ imageDataUrl, pairHint, timeframeHint }, candidates);
        output = r.output;
        usedModelLabel = r.model;
      } catch (err) {
        if (err instanceof AllModelsFailedError) {
          return res.status(502).json({
            error: 'all_free_failed',
            message: 'All free models are unavailable right now. Try a paid model.',
            upgrade: true,
          });
        }
        throw err;
      }
    }

    // Сохраняем (Mongo или in-memory). Если пользователь залогинен — привязываем к нему.
    const saved = await createAnalysis({
      output,
      model: usedModelLabel,
      mock: usingMock,
      tier,
      userId: user?.id ?? null,
    });

    // Списываем токены за платный анализ только при успехе.
    if (tier === 'paid' && user && chosenPaid) {
      await adjustTokens(user.id, -cost);
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
    if (err instanceof ZodError) {
      return res.status(422).json({
        error: 'bad_model_output',
        message: 'The model returned an unexpected format. Please try again.',
        details: err.flatten(),
      });
    }
    console.error('[analyze] unexpected error:', err);
    return res.status(500).json({ error: 'internal', message: 'Internal server error.' });
  }
});
