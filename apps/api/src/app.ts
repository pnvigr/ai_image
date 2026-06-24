import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { analyzeRouter } from './routes/analyze.js';
import { analysesRouter } from './routes/analyses.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { billingRouter } from './routes/billing.js';
import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
    }),
  );
  app.use(express.json({ limit: '20mb' }));

  app.get('/', (_req, res) => res.json({ name: 'ai-image api', health: '/api/health' }));
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/analyze', analyzeRouter);
  app.use('/api/analyses', analysesRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/admin', adminRouter);

  return app;
}
