import type { AiModelInfo, CreateModelInput, ModelTier, UpdateModelInput } from '@ai-image/shared';
import { config } from '../config.js';
import { isDbConnected } from '../db.js';
import { AiModel } from '../models/AiModel.js';

const mem = new Map<string, AiModelInfo>();
let seq = 1;

function toRecord(doc: Record<string, unknown>): AiModelInfo {
  return {
    id: String(doc._id),
    modelId: String(doc.modelId),
    label: String(doc.label),
    tier: doc.tier as ModelTier,
    enabled: Boolean(doc.enabled),
    order: Number(doc.order ?? 0),
    costTokens: Number(doc.costTokens ?? 0),
  };
}

const byOrder = (a: AiModelInfo, b: AiModelInfo) => a.order - b.order;

export async function listModels(): Promise<AiModelInfo[]> {
  if (isDbConnected()) {
    const docs = await AiModel.find().sort({ tier: 1, order: 1 }).lean();
    return docs.map((d) => toRecord(d as Record<string, unknown>));
  }
  return [...mem.values()].sort((a, b) => (a.tier === b.tier ? a.order - b.order : a.tier.localeCompare(b.tier)));
}

export async function listEnabledByTier(tier: ModelTier): Promise<AiModelInfo[]> {
  if (isDbConnected()) {
    const docs = await AiModel.find({ tier, enabled: true }).sort({ order: 1 }).lean();
    return docs.map((d) => toRecord(d as Record<string, unknown>));
  }
  return [...mem.values()].filter((m) => m.tier === tier && m.enabled).sort(byOrder);
}

export async function createModel(input: CreateModelInput): Promise<AiModelInfo> {
  if (isDbConnected()) {
    const doc = await AiModel.create(input);
    return toRecord(doc.toObject() as Record<string, unknown>);
  }
  const record: AiModelInfo = { id: String(seq++), ...input };
  mem.set(record.id, record);
  return record;
}

export async function updateModel(id: string, patch: UpdateModelInput): Promise<AiModelInfo | null> {
  if (isDbConnected()) {
    const doc = await AiModel.findByIdAndUpdate(id, { $set: patch }, { new: true })
      .lean()
      .catch(() => null);
    return doc ? toRecord(doc as Record<string, unknown>) : null;
  }
  const record = mem.get(id);
  if (!record) return null;
  Object.assign(record, patch);
  return record;
}

export async function deleteModel(id: string): Promise<boolean> {
  if (isDbConnected()) {
    const doc = await AiModel.findByIdAndDelete(id)
      .lean()
      .catch(() => null);
    return Boolean(doc);
  }
  return mem.delete(id);
}

export async function countModels(): Promise<number> {
  if (isDbConnected()) return AiModel.countDocuments();
  return mem.size;
}

function labelFor(modelId: string): string {
  const last = modelId.split('/').pop() ?? modelId;
  return last.replace(/:free$/, '');
}

/** Сид моделей из env при первом запуске (если хранилище пустое). */
export async function seedModelsIfEmpty(): Promise<void> {
  if ((await countModels()) > 0) return;
  const freeIds = config.openRouter.freeModels.length
    ? config.openRouter.freeModels
    : [config.openRouter.freeModel];
  const paidIds = config.openRouter.paidModels.length
    ? config.openRouter.paidModels
    : [config.openRouter.paidModel];

  let order = 0;
  for (const m of freeIds) {
    await createModel({ modelId: m, label: labelFor(m), tier: 'free', enabled: true, order: order++, costTokens: 0 });
  }
  order = 0;
  for (const m of paidIds) {
    await createModel({
      modelId: m,
      label: labelFor(m),
      tier: 'paid',
      enabled: true,
      order: order++,
      costTokens: config.billing.paidAnalysisCost,
    });
  }
  console.log(`[models] seeded from env: ${freeIds.length} free, ${paidIds.length} paid`);
}
