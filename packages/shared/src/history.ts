import { z } from 'zod';
import type { Direction } from './analysis.js';

export const TradeResultSchema = z.enum(['win', 'loss']);
export type TradeResult = z.infer<typeof TradeResultSchema>;

/** Тело PATCH-запроса на обновление исхода сделки (заполняет пользователь вручную). */
export const UpdateOutcomeSchema = z.object({
  entered: z.boolean().nullable().optional(),
  result: TradeResultSchema.nullable().optional(),
  payout: z.number().min(0).max(1_000_000).nullable().optional(),
});
export type UpdateOutcomeInput = z.infer<typeof UpdateOutcomeSchema>;

/** Элемент истории: прогноз ИИ + проставленный пользователем исход. */
export interface AnalysisHistoryItem {
  id: string;
  createdAt?: string;
  pair: string;
  direction: Direction;
  timeframe: string;
  confidence: number;
  description: string;
  signals: string[];
  model: string;
  mock: boolean;
  // Исход (вручную)
  entered: boolean | null;
  result: TradeResult | null;
  payout: number | null;
}

/** Сводная статистика — наглядно демонстрирует тезис диплома про винрейт. */
export interface HistoryStats {
  total: number;
  entered: number;
  wins: number;
  losses: number;
  /** % побед среди сделок с известным исходом; null, если данных нет. */
  winrate: number | null;
  totalPayout: number;
}

export function computeHistoryStats(items: AnalysisHistoryItem[]): HistoryStats {
  const entered = items.filter((i) => i.entered === true);
  const wins = entered.filter((i) => i.result === 'win').length;
  const losses = entered.filter((i) => i.result === 'loss').length;
  const decided = wins + losses;
  const totalPayout = entered.reduce((sum, i) => sum + (i.payout ?? 0), 0);
  return {
    total: items.length,
    entered: entered.length,
    wins,
    losses,
    winrate: decided > 0 ? Math.round((wins / decided) * 100) : null,
    totalPayout,
  };
}
