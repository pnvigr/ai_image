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
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
    // срок жизни токена в секундах (по умолчанию 7 дней)
    expiresInSeconds: num(process.env.JWT_EXPIRES_IN_SECONDS, 60 * 60 * 24 * 7),
  },
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    freeModel:
      process.env.OPENROUTER_FREE_MODEL ?? 'meta-llama/llama-3.2-11b-vision-instruct:free',
    paidModel: process.env.OPENROUTER_PAID_MODEL ?? 'openai/gpt-4o-mini',
    textModel: process.env.OPENROUTER_TEXT_MODEL ?? 'meta-llama/llama-3.1-8b-instruct:free',
    appUrl: process.env.OPENROUTER_APP_URL ?? 'http://localhost:5173',
    appName: process.env.OPENROUTER_APP_NAME ?? 'AI Chart Analysis (diploma)',
  },
  admin: {
    // email, который автоматически получает роль admin при регистрации/входе
    email: (process.env.ADMIN_EMAIL ?? '').toLowerCase(),
  },
  billing: {
    supportContact: process.env.SUPPORT_CONTACT ?? 'Telegram: @your_support_handle',
    // дневной лимит бесплатных анализов на пользователя (имитация лимитов free-тира)
    freeDailyLimit: num(process.env.FREE_DAILY_LIMIT, 20),
    // стоимость одного анализа на платной модели (в токенах)
    paidAnalysisCost: num(process.env.PAID_ANALYSIS_COST, 1),
  },
};

/** Есть ли реальный ключ OpenRouter. Если нет — работаем в demo/mock-режиме. */
export function hasOpenRouter(): boolean {
  return Boolean(config.openRouter.apiKey);
}

if (!process.env.JWT_SECRET) {
  console.warn(
    '[config] JWT_SECRET не задан — использую небезопасный дефолт. Задайте JWT_SECRET в .env для продакшена.',
  );
}
