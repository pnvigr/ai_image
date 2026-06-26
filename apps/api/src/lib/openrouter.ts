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

const SYSTEM_PROMPT = `You are an assistant for the EDUCATIONAL analysis of trading chart screenshots.
Describe what is visible (trend, candles, volume, moving averages, support/resistance levels)
and state a short-term directional hypothesis. This is not financial advice.

Return STRICTLY one JSON object and nothing else (no markdown, no surrounding text):
{
  "pair": string,            // ticker/currency pair from the chart, e.g. "GBP/USD"; "UNKNOWN" if not visible
  "direction": "UP" | "DOWN" | "NEUTRAL",
  "timeframe": string,       // timeframe/expiry, e.g. "3 minutes" or "1m"
  "confidence": number,      // integer 0..100 — subjective confidence based on the image
  "description": string,     // 2-5 sentences in English: what is on the chart and why this hypothesis
  "signals": string[]        // 2-5 short bullet points (trend, volume, levels, MA)
}
Do not invent guarantees and do not promise profit.`;

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
    'Analyze this chart screenshot.',
    params.pairHint ? `Pair hint: ${params.pairHint}.` : '',
    params.timeframeHint ? `Timeframe/expiry: ${params.timeframeHint}.` : '',
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
      'Demo mode (no OpenRouter key set). This is a generated example in the required format: ' +
      'the chart shows a series of candles, the short-term moving average points toward the signal, ' +
      'and volume is moderate. In live mode a vision model would provide the analysis here.',
    signals: ['Short-term trend', 'Support/resistance nearby', 'Moderate volume'],
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
          `${s.pair}: entries ${s.entered}, W/L ${s.wins}/${s.losses}, win rate ${s.winrate ?? '—'}%, payout ${s.payout.toFixed(2)}`,
      )
      .join('\n') || '(no trades yet)';

  const system =
    'You are an educational trading-discipline assistant. Briefly review the user’s statistics ' +
    'and recommend instruments ONLY from the candidates list. Emphasize that the win rate is not ' +
    'guaranteed and that AI does not predict the market. Return strictly JSON: ' +
    '{"insight": string (3-5 sentences in English), "recommendations": string[] (2-4 tickers from the candidates list)}.';
  const user =
    `Per-instrument stats:\n${table}\n\n` +
    `Overall win rate: ${params.stats.winrate ?? '—'}% (entries ${params.stats.entered}, total analyses ${params.stats.total}).\n\n` +
    `Candidates for recommendations: ${candidates.join(', ') || '(none)'}.`;

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
      'Not enough marked trades yet for a review. Mark outcomes (entered / win / loss / payout) and stats will appear here.',
    );
  } else {
    parts.push(`Total entries: ${params.stats.entered}, overall win rate around ${params.stats.winrate ?? '—'}%.`);
    if (best && worst && best.pair !== worst.pair) {
      parts.push(`Relatively better on ${best.pair} (${best.winrate}%), worse on ${worst.pair} (${worst.winrate}%).`);
    }
    parts.push(
      'Important: on a small sample, differences between instruments are mostly noise. AI labeling has no stable predictive edge — this is the key conclusion of the project.',
    );
  }
  return { insight: parts.join(' '), recommendations: candidates };
}

export class AllModelsFailedError extends Error {
  constructor(public attempts: number) {
    super(`All ${attempts} model(s) failed`);
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
