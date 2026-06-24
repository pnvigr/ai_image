import { Router } from 'express';
import { isDbConnected } from '../db.js';
import { config, hasOpenRouter } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    db: isDbConnected() ? 'connected' : 'disabled',
    ai: hasOpenRouter() ? 'openrouter' : 'mock',
    model: hasOpenRouter() ? config.openRouter.freeModel : 'mock',
    time: new Date().toISOString(),
  });
});
