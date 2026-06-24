import { AnalysisModelOutputSchema, type AnalysisModelOutput } from '@ai-image/shared';
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
