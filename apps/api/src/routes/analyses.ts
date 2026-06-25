import { Router } from 'express';
import { UpdateOutcomeSchema, type AnalysisHistoryItem } from '@ai-image/shared';
import { requireAuth } from '../middleware/auth.js';
import {
  listAnalysesByUser,
  updateAnalysisOutcome,
  deleteAnalysis,
  type AnalysisRecord,
} from '../store/analyses.js';

function toHistoryItem(r: AnalysisRecord): AnalysisHistoryItem {
  return {
    id: r.id,
    createdAt: r.createdAt,
    pair: r.pair,
    direction: r.direction,
    timeframe: r.timeframe,
    confidence: r.confidence,
    description: r.description,
    signals: r.signals,
    model: r.model,
    mock: r.mock,
    entered: r.entered,
    result: r.result,
    payout: r.payout,
  };
}

export const analysesRouter = Router();

// Вся история — только для авторизованных пользователей.
analysesRouter.use(requireAuth);

analysesRouter.get('/', async (req, res) => {
  const items = (await listAnalysesByUser(req.user!.id)).map(toHistoryItem);
  res.json({ items });
});

analysesRouter.patch('/:id', async (req, res) => {
  const parse = UpdateOutcomeSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const updated = await updateAnalysisOutcome(req.params.id, req.user!.id, parse.data);
  if (!updated) return res.status(404).json({ error: 'not_found', message: 'Анализ не найден.' });
  res.json({ item: toHistoryItem(updated) });
});

analysesRouter.delete('/:id', async (req, res) => {
  const ok = await deleteAnalysis(req.params.id, req.user!.id);
  if (!ok) return res.status(404).json({ error: 'not_found', message: 'Анализ не найден.' });
  res.status(204).end();
});
