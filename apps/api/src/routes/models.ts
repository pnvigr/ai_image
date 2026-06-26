import { Router } from 'express';
import { listEnabledByTier } from '../store/models.js';

export const modelsRouter = Router();

/** Доступные (включённые) модели для выбора на фронте. */
modelsRouter.get('/', async (_req, res) => {
  const [free, paid] = await Promise.all([listEnabledByTier('free'), listEnabledByTier('paid')]);
  res.json({ free, paid });
});
