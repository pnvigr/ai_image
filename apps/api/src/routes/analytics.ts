import { Router } from 'express';
import { computeHistoryStats, computeInstrumentStats } from '@ai-image/shared';
import { requireAuth } from '../middleware/auth.js';
import { listAnalysesByUser } from '../store/analyses.js';
import { config, hasOpenRouter } from '../config.js';
import { analyzeTrades, mockTradeInsight, OpenRouterError } from '../lib/openrouter.js';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

/** Разбор истории сделок пользователя + рекомендации инструментов. */
analyticsRouter.post('/insight', async (req, res) => {
  const records = await listAnalysesByUser(req.user!.id);
  const byInstrument = computeInstrumentStats(records);
  const stats = computeHistoryStats(records);

  try {
    const insight = hasOpenRouter()
      ? await analyzeTrades({ stats, byInstrument, model: config.openRouter.textModel })
      : mockTradeInsight({ stats, byInstrument });
    return res.json({ ...insight, byInstrument });
  } catch (err) {
    if (err instanceof OpenRouterError && err.status === 429) {
      return res
        .status(429)
        .json({ error: 'rate_limited', message: 'Лимит модели исчерпан. Попробуйте позже.' });
    }
    // На любой другой сбой провайдера — мягкий фоллбэк на mock-разбор.
    const insight = mockTradeInsight({ stats, byInstrument });
    return res.json({ ...insight, byInstrument, degraded: true });
  }
});
