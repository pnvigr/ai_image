import { z } from 'zod';
import type { AnalysisHistoryItem } from './history.js';

/** Список инструментов, из которого ИИ рекомендует «другие» пары. */
export const INSTRUMENT_UNIVERSE: string[] = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'AUD/USD',
  'USD/CAD',
  'USD/CHF',
  'EUR/JPY',
  'GBP/JPY',
  'EUR/GBP',
  'NZD/USD',
  'BTC/USD',
  'ETH/USD',
  'XAU/USD',
  'XAG/USD',
  'WTI/USD',
];

export interface InstrumentStat {
  pair: string;
  total: number;
  entered: number;
  wins: number;
  losses: number;
  winrate: number | null;
  payout: number;
}

/** Разбивка статистики по инструментам (пара → результаты). */
export function computeInstrumentStats(items: AnalysisHistoryItem[]): InstrumentStat[] {
  const map = new Map<string, InstrumentStat>();
  for (const it of items) {
    const key = it.pair || 'UNKNOWN';
    let s = map.get(key);
    if (!s) {
      s = { pair: key, total: 0, entered: 0, wins: 0, losses: 0, winrate: null, payout: 0 };
      map.set(key, s);
    }
    s.total++;
    if (it.entered) {
      s.entered++;
      if (it.result === 'win') s.wins++;
      else if (it.result === 'loss') s.losses++;
      s.payout += it.payout ?? 0;
    }
  }
  for (const s of map.values()) {
    const decided = s.wins + s.losses;
    s.winrate = decided > 0 ? Math.round((s.wins / decided) * 100) : null;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export interface AnalyticsInsight {
  insight: string;
  recommendations: string[];
}

/** Ответ эндпоинта аналитики: текст от ИИ + разбивка по инструментам. */
export interface AnalyticsResult extends AnalyticsInsight {
  byInstrument: InstrumentStat[];
  degraded?: boolean;
}

export const AnalyticsInsightSchema = z.object({
  insight: z.string().min(1).max(2000),
  recommendations: z.array(z.string().max(40)).max(8).default([]),
});
