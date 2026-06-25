import type { TopupStatus } from '@ai-image/shared';
import { isDbConnected } from '../db.js';
import { TopupRequestModel } from '../models/TopupRequest.js';

export interface TopupRecord {
  id: string;
  userId: string;
  userEmail?: string;
  packageId: string;
  tokens: number;
  status: TopupStatus;
  createdAt: string;
}

// In-memory фоллбэк (когда нет MongoDB).
const mem = new Map<string, TopupRecord>();
let seq = 1;

function toRecord(doc: Record<string, unknown>): TopupRecord {
  const createdAt = doc.createdAt;
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    userEmail: doc.userEmail as string | undefined,
    packageId: String(doc.packageId),
    tokens: Number(doc.tokens),
    status: (doc.status as TopupStatus) ?? 'pending',
    createdAt:
      createdAt instanceof Date ? createdAt.toISOString() : String(createdAt ?? new Date().toISOString()),
  };
}

export async function createTopup(input: {
  userId: string;
  userEmail?: string;
  packageId: string;
  tokens: number;
}): Promise<TopupRecord> {
  if (isDbConnected()) {
    const doc = await TopupRequestModel.create({ ...input, status: 'pending' });
    return toRecord(doc.toObject() as Record<string, unknown>);
  }
  const record: TopupRecord = {
    id: String(seq++),
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...input,
  };
  mem.set(record.id, record);
  return record;
}

export async function listTopupsByUser(userId: string): Promise<TopupRecord[]> {
  if (isDbConnected()) {
    const docs = await TopupRequestModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return docs.map((d) => toRecord(d as Record<string, unknown>));
  }
  return [...mem.values()]
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAllTopups(): Promise<TopupRecord[]> {
  if (isDbConnected()) {
    const docs = await TopupRequestModel.find().sort({ createdAt: -1 }).limit(500).lean();
    return docs.map((d) => toRecord(d as Record<string, unknown>));
  }
  return [...mem.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTopup(id: string): Promise<TopupRecord | null> {
  if (isDbConnected()) {
    const doc = await TopupRequestModel.findById(id)
      .lean()
      .catch(() => null);
    return doc ? toRecord(doc as Record<string, unknown>) : null;
  }
  return mem.get(id) ?? null;
}

export async function setTopupStatus(id: string, status: TopupStatus): Promise<TopupRecord | null> {
  if (isDbConnected()) {
    const doc = await TopupRequestModel.findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .lean()
      .catch(() => null);
    return doc ? toRecord(doc as Record<string, unknown>) : null;
  }
  const record = mem.get(id);
  if (!record) return null;
  record.status = status;
  return record;
}
