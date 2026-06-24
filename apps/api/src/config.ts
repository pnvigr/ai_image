import dotenv from 'dotenv';

dotenv.config();

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: num(process.env.PORT, 4000),
  mongoUri: process.env.MONGODB_URI ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    freeModel:
      process.env.OPENROUTER_FREE_MODEL ?? 'meta-llama/llama-3.2-11b-vision-instruct:free',
    paidModel: process.env.OPENROUTER_PAID_MODEL ?? 'openai/gpt-4o-mini',
    appUrl: process.env.OPENROUTER_APP_URL ?? 'http://localhost:5173',
    appName: process.env.OPENROUTER_APP_NAME ?? 'AI Chart Analysis (diploma)',
  },
};

/** Есть ли реальный ключ OpenRouter. Если нет — работаем в demo/mock-режиме. */
export function hasOpenRouter(): boolean {
  return Boolean(config.openRouter.apiKey);
}
