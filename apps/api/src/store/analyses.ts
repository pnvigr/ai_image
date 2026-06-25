import type { AnalysisModelOutput, TradeResult, UpdateOutcomeInput } from '@ai-image/shared';
import { isDbConnected } from '../db.js';
import { Analysis } from '../models/Analysis.js';

export interface AnalysisRecord {
  id: string;
  userId: string | null;
  pair: string;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  timeframe: string;
  confidence: number;
  description: string;
  signals: string[];
  model: string;
  mock: boolean;
  tier: 'free' | 'paid';
  entered: boolean | null;
  result: TradeResult | null;
  payout: number | null;
  createdAt: string;
}

// In-memory фоллбэк (когда нет MongoDB) — история работает и в демо.
const mem = new Map<string, AnalysisRecord>();
let seq = 1;

function toRecord(doc: Record<string, unknown>): AnalysisRecord {
  const createdAt = doc.createdAt;
  return {
    id: String(doc._id),
    userId: (doc.userId as string | null) ?? null,
    pair: String(doc.pair),
    direction: doc.direction as AnalysisRecord['direction'],
    timeframe: String(doc.timeframe),
    confidence: Number(doc.confidence),
    description: String(doc.description),
    signals: (doc.signals as string[]) ?? [],
    model: String(doc.model),
    mock: Boolean(doc.mock),
    tier: (doc.tier as 'free' | 'paid') ?? 'free',
    entered: (doc.entered as boolean | null) ?? null,
    result: (doc.result as TradeResult | null) ?? null,
    payout: (doc.payout as number | null) ?? null,
    createdAt:
      createdAt instanceof Date ? createdAt.toISOString() : String(createdAt ?? new Date().toISOString()),
  };
}

export async function createAnalysis(input: {
  output: AnalysisModelOutput;
  model: string;
  mock: boolean;
  tier: 'free' | 'paid';
  userId: string | null;
}): Promise<AnalysisRecord> {
  const base = {
    userId: input.userId,
    pair: input.output.pair,
    direction: input.output.direction,
    timeframe: input.output.timeframe,
    confidence: input.output.confidence,
    description: input.output.description,
    signals: input.output.signals,
    model: input.model,
    mock: input.mock,
    tier: input.tier,
    entered: null as boolean | null,
    result: null as TradeResult | null,
    payout: null as number | null,
  };
  if (isDbConnected()) {
    const doc = await Analysis.create(base);
    return toRecord(doc.toObject() as Record<string, unknown>);
  }
  const record: AnalysisRecord = { id: String(seq++), createdAt: new Date().toISOString(), ...base };
  mem.set(record.id, record);
  return record;
}

export async function listAnalysesByUser(userId: string, limit = 200): Promise<AnalysisRecord[]> {
  if (isDbConnected()) {
    const docs = await Analysis.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map((d) => toRecord(d as Record<string, unknown>));
  }
  return [...mem.values()]
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function updateAnalysisOutcome(
  id: string,
  userId: string,
  patch: UpdateOutcomeInput,
): Promise<AnalysisRecord | null> {
  const set: Record<string, unknown> = {};
  if (patch.entered !== undefined) set.entered = patch.entered;
  if (patch.result !== undefined) set.result = patch.result;
  if (patch.payout !== undefined) set.payout = patch.payout;
  // «Не заходил» → обнуляем исход и payout
  if (patch.entered === false) {
    set.result = null;
    set.payout = null;
  }

  if (isDbConnected()) {
    const doc = await Analysis.findOneAndUpdate({ _id: id, userId }, { $set: set }, { new: true })
      .lean()
      .catch(() => null);
    return doc ? toRecord(doc as Record<string, unknown>) : null;
  }
  const record = mem.get(id);
  if (!record || record.userId !== userId) return null;
  Object.assign(record, set);
  return record;
}

export async function deleteAnalysis(id: string, userId: string): Promise<boolean> {
  if (isDbConnected()) {
    const doc = await Analysis.findOneAndDelete({ _id: id, userId })
      .lean()
      .catch(() => null);
    return Boolean(doc);
  }
  const record = mem.get(id);
  if (!record || record.userId !== userId) return false;
  mem.delete(id);
  return true;
}

/** Сколько бесплатных анализов пользователь сделал сегодня (для дневного лимита). */
export async function countUserFreeToday(userId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (isDbConnected()) {
    return Analysis.countDocuments({ userId, tier: 'free', createdAt: { $gte: start } });
  }
  return [...mem.values()].filter(
    (r) => r.userId === userId && r.tier === 'free' && new Date(r.createdAt) >= start,
  ).length;
}
