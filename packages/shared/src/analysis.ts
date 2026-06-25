import { z } from 'zod';

/**
 * Направление прогноза. NEUTRAL — когда по картинке нет явного сигнала.
 */
export const DirectionSchema = z.enum(['UP', 'DOWN', 'NEUTRAL']);
export type Direction = z.infer<typeof DirectionSchema>;

/**
 * То, что мы ПРОСИМ модель вернуть (сырой ответ модели, который мы валидируем).
 * Формат намеренно повторяет карточку из курсового Telegram-бота:
 * пара, направление, таймфрейм/экспирация, описание — плюс уверенность и тезисы.
 */
export const AnalysisModelOutputSchema = z.object({
  pair: z.string().min(1).max(40),
  direction: DirectionSchema,
  timeframe: z.string().min(1).max(40),
  confidence: z.number().min(0).max(100),
  description: z.string().min(1).max(2000),
  signals: z.array(z.string().max(300)).max(12).default([]),
});
export type AnalysisModelOutput = z.infer<typeof AnalysisModelOutputSchema>;

/**
 * Полный результат, который API отдаёт клиенту: вывод модели + метаданные.
 */
export const AnalysisResultSchema = AnalysisModelOutputSchema.extend({
  id: z.string().optional(),
  createdAt: z.string().optional(),
  model: z.string(),
  mock: z.boolean().default(false),
  disclaimer: z.string(),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/**
 * Тело запроса на анализ. Картинку передаём как data URL (base64),
 * чтобы не возиться с multipart — фронту он всё равно нужен для превью.
 */
export const AnalyzeRequestSchema = z.object({
  imageDataUrl: z
    .string()
    .startsWith('data:image/', 'Ожидается data URL картинки (data:image/...)')
    .max(20_000_000, 'Картинка слишком большая (макс. ~15 МБ)'),
  pairHint: z.string().max(40).optional(),
  timeframeHint: z.string().max(40).optional(),
  tier: z.enum(['free', 'paid']).default('free'),
  // Для платной модели — выбранный пользователем OpenRouter model id (опционально).
  modelId: z.string().max(120).optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

/**
 * Дисклеймер — ключевой тезис дипломной работы: ИИ не предсказывает рынок.
 * Сервер всегда добавляет его в ответ, фронт показывает на видном месте.
 */
export const ANALYSIS_DISCLAIMER =
  'Это не финансовая рекомендация. ИИ не предсказывает движение рынка — ' +
  'анализ носит образовательный характер и не гарантирует результат. ' +
  'Реальный винрейт определяется рынком и условиями платформы, а не «силой» модели.';
