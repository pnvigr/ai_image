import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { analyzeRouter } from './routes/analyze.js';
import { analysesRouter } from './routes/analyses.js';
import { analyticsRouter } from './routes/analytics.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { billingRouter } from './routes/billing.js';
import { healthRouter } from './routes/health.js';
import { modelsRouter } from './routes/models.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
    }),
  );
  app.use(express.json({ limit: '20mb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/models', modelsRouter);
  app.use('/api/analyze', analyzeRouter);
  app.use('/api/analyses', analysesRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/admin', adminRouter);

  // Prod (single service): serve the built frontend with SPA fallback when SERVE_WEB=true.
  if (config.serveWeb) {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const webDist = path.resolve(dir, '../../web/dist');
    if (fs.existsSync(webDist)) {
      app.use(express.static(webDist));
      // Any non-API path → index.html (client-side routing)
      app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
    } else {
      console.warn('[web] SERVE_WEB=true but apps/web/dist was not found — build the frontend (pnpm build).');
    }
  } else {
    app.get('/', (_req, res) => res.json({ name: 'ai-image api', health: '/api/health' }));
  }

  return app;
}
