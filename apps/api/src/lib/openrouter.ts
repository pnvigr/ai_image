import {
  AnalysisModelOutputSchema,
  AnalyticsInsightSchema,
  INSTRUMENT_UNIVERSE,
  type AnalysisModelOutput,
  type AnalyticsInsight,
  type HistoryStats,
  type InstrumentStat,
} from '@ai-image/shared';
import { config } from '../config.js';

const SYSTEM_PROMPT = `Ты — ассистент для ОБРАЗОВАТЕЛЬНОГО анализа скриншотов трейдинговых графиков.
По картинке опиши, что видно (тренд, свечи, объём, скользящие средние, уровни поддержки/сопротивления),
и сформулируй гипотезу краткосрочного направления. Это не финансовый совет.

Верни СТРОГО один JSON-объект и больше ничего (без markdown, без текста вокруг):
{
  "pair": string,            // тикер/валютная пара с графика, напр. "GBP/USD"; если не видно — "UNKNOWN"
  "direction": "UP" | "DOWN" | "NEUTRAL",
  "timeframe": string,       // таймфрейм/экспирация, напр. "3 minutes" или "1m"
  "confidence": number,      // целое 0..100 — субъективная уверенность по картинке
  "description": string,     // 2-5 предложений на русском: что видно на графике и почему такая гипотеза
  "signals": string[]        // 2-5 коротких тезисов (тренд, объём, уровни, MA)
}
Не выдумывай гарантий и не обещай прибыль.`;

export interface AnalyzeParams {
  imageDataUrl: string;
  pairHint?: string;
  timeframeHint?: string;
  model: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export class OpenRouterError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`OpenRouter error ${status}`);
    this.name = 'OpenRouterError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Отправляет скриншот в OpenRouter (vision-модель) и валидирует ответ Zod-схемой.
 */
export async function analyzeWithOpenRouter(params: AnalyzeParams): Promise<AnalysisModelOutput> {
  const userText = [
    'Проанализируй этот скриншот графика.',
    params.pairHint ? `Подсказка по паре: ${params.pairHint}.` : '',
    params.timeframeHint ? `Таймфрейм/экспирация: ${params.timeframeHint}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const res = await fetch(`${config.openRouter.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openRouter.apiKey}`,
      'Content-Type': 'application/json',
      // OpenRouter рекомендует указывать источник запроса
      'HTTP-Referer': config.openRouter.appUrl,
      'X-Title': config.openRouter.appName,
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: params.imageDataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new OpenRouterError(res.status, body);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) {
    throw new OpenRouterError(502, JSON.stringify(data).slice(0, 500));
  }

  const parsed = extractJson(content);
  return AnalysisModelOutputSchema.parse(parsed);
}

/**
 * Достаёт JSON из ответа модели: срезает markdown-ограждения и берёт первый { ... }.
 * Бесплатные модели часто оборачивают JSON в текст — это делает парсинг устойчивым.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  const slice = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  return JSON.parse(slice);
}

/**
 * Mock-ответ для demo-режима (без ключа OpenRouter).
 * Направление выбирается случайно — это наглядно иллюстрирует тезис диплома:
 * без реальной модели «прогноз» = случайность.
 */
export function mockAnalysis(params: { pairHint?: string; timeframeHint?: string }): AnalysisModelOutput {
  const directions: AnalysisModelOutput['direction'][] = ['UP', 'DOWN', 'NEUTRAL'];
  const direction = directions[Math.floor(Math.random() * directions.length)];
  return {
    pair: params.pairHint || 'GBP/USD',
    direction,
    timeframe: params.timeframeHint || '3 minutes',
    confidence: 50 + Math.floor(Math.random() * 35),
    description:
      'Демо-режим (ключ OpenRouter не задан). Это сгенерированный пример ответа в нужном формате: ' +
      'на графике видна серия свечей, краткосрочная скользящая средняя направлена в сторону сигнала, ' +
      'объём умеренный. В реальном режиме здесь будет разбор от vision-модели.',
    signals: ['Краткосрочный тренд', 'Рядом уровень поддержки/сопротивления', 'Объём умеренный'],
  };
}

/** Текстовый chat-запрос к OpenRouter, возвращает распарсенный JSON. */
async function chatJson(system: string, userText: string, model: string): Promise<unknown> {
  const res = await fetch(`${config.openRouter.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openRouter.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.openRouter.appUrl,
      'X-Title': config.openRouter.appName,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText },
      ],
    }),
  });
  if (!res.ok) throw new OpenRouterError(res.status, await res.text());
  const data = (await res.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new OpenRouterError(502, JSON.stringify(data).slice(0, 500));
  return extractJson(content);
}

/** Просит модель разобрать статистику пользователя и порекомендовать инструменты из списка. */
export async function analyzeTrades(params: {
  stats: HistoryStats;
  byInstrument: InstrumentStat[];
  model: string;
}): Promise<AnalyticsInsight> {
  const used = params.byInstrument.map((s) => s.pair);
  const candidates = INSTRUMENT_UNIVERSE.filter((p) => !used.includes(p));
  const table =
    params.byInstrument
      .map(
        (s) =>
          `${s.pair}: входов ${s.entered}, W/L ${s.wins}/${s.losses}, винрейт ${s.winrate ?? '—'}%, payout ${s.payout.toFixed(2)}`,
      )
      .join('\n') || '(пока нет сделок)';

  const system =
    'Ты — образовательный ассистент по дисциплине трейдинга. Кратко разбери статистику пользователя ' +
    'и порекомендуй инструменты ТОЛЬКО из списка кандидатов. Подчёркивай, что винрейт не гарантирован, ' +
    'а ИИ не предсказывает рынок. Верни строго JSON: ' +
    '{"insight": string (3-5 предложений по-русски), "recommendations": string[] (2-4 тикера из списка кандидатов)}.';
  const user =
    `Статистика по инструментам:\n${table}\n\n` +
    `Общий винрейт: ${params.stats.winrate ?? '—'}% (входов ${params.stats.entered}, всего анализов ${params.stats.total}).\n\n` +
    `Кандидаты для рекомендаций: ${candidates.join(', ') || '(нет)'}.`;

  const parsed = await chatJson(system, user, params.model);
  return AnalyticsInsightSchema.parse(parsed);
}

/** Mock-разбор (без ключа OpenRouter) — выводится из статистики, усиливает тезис диплома. */
export function mockTradeInsight(params: {
  stats: HistoryStats;
  byInstrument: InstrumentStat[];
}): AnalyticsInsight {
  const used = params.byInstrument.map((s) => s.pair);
  const candidates = INSTRUMENT_UNIVERSE.filter((p) => !used.includes(p)).slice(0, 3);
  const decided = params.byInstrument.filter((s) => s.winrate !== null);
  const best = [...decided].sort((a, b) => (b.winrate ?? 0) - (a.winrate ?? 0))[0];
  const worst = [...decided].sort((a, b) => (a.winrate ?? 0) - (b.winrate ?? 0))[0];

  const parts: string[] = [];
  if (params.stats.entered === 0) {
    parts.push(
      'Пока недостаточно отмеченных сделок для разбора. Отмечай исходы (зашёл / win / loss / payout) — и здесь появится статистика.',
    );
  } else {
    parts.push(`Всего входов: ${params.stats.entered}, общий винрейт около ${params.stats.winrate ?? '—'}%.`);
    if (best && worst && best.pair !== worst.pair) {
      parts.push(`Относительно лучше шло по ${best.pair} (${best.winrate}%), хуже — по ${worst.pair} (${worst.winrate}%).`);
    }
    parts.push(
      'Важно: на малой выборке разница между инструментами — в основном шум. Устойчивого предсказательного преимущества у ИИ-разметки нет — это ключевой вывод работы.',
    );
  }
  return { insight: parts.join(' '), recommendations: candidates };
}

export class AllModelsFailedError extends Error {
  constructor(public attempts: number) {
    super(`Все ${attempts} модель(и) не ответили`);
    this.name = 'AllModelsFailedError';
  }
}

/** Бесплатный режим: перебирает модели по порядку и возвращает первый успешный ответ. */
export async function analyzeWithFallback(
  base: { imageDataUrl: string; pairHint?: string; timeframeHint?: string },
  models: string[],
): Promise<{ output: AnalysisModelOutput; model: string }> {
  let attempts = 0;
  for (const model of models) {
    attempts++;
    try {
      const output = await analyzeWithOpenRouter({ ...base, model });
      return { output, model };
    } catch (err) {
      console.warn(
        `[openrouter] модель ${model} не сработала, пробую следующую:`,
        (err as Error).message,
      );
    }
  }
  throw new AllModelsFailedError(attempts);
}
