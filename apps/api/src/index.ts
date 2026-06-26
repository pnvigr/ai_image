import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { seedModelsIfEmpty } from './store/models.js';

async function main() {
  await connectDb();
  await seedModelsIfEmpty();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[api] listening on http://localhost:${config.port}`);
    console.log(`[api] health: http://localhost:${config.port}/api/health`);
  });
}

main().catch((err) => {
  console.error('[api] fatal startup error:', err);
  process.exit(1);
});
