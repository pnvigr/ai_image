import type { UserRole } from '@ai-image/shared';
import { config } from '../config.js';
import { isDbConnected } from '../db.js';
import { UserModel } from '../models/User.js';

/** Внутреннее представление пользователя (с passwordHash). Наружу не отдаём. */
export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  tokensBalance: number;
  createdAt?: string;
}

// ── In-memory фоллбэк (когда нет MongoDB) ──
// Позволяет демонстрировать вход/регистрацию без БД. Данные живут до перезапуска.
const memByEmail = new Map<string, UserRecord>();
let memSeq = 1;

function toRecord(doc: Record<string, unknown>): UserRecord {
  const createdAt = doc.createdAt;
  return {
    id: String(doc._id),
    email: String(doc.email),
    passwordHash: String(doc.passwordHash),
    role: doc.role as UserRole,
    tokensBalance: (doc.tokensBalance as number) ?? 0,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : (createdAt as string | undefined),
  };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = email.toLowerCase();
  if (isDbConnected()) {
    const doc = await UserModel.findOne({ email: normalized }).lean();
    return doc ? toRecord(doc as Record<string, unknown>) : null;
  }
  return memByEmail.get(normalized) ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  if (isDbConnected()) {
    const doc = await UserModel.findById(id)
      .lean()
      .catch(() => null);
    return doc ? toRecord(doc as Record<string, unknown>) : null;
  }
  for (const user of memByEmail.values()) {
    if (user.id === id) return user;
  }
  return null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  role?: UserRole;
}): Promise<UserRecord> {
  const email = input.email.toLowerCase();
  const role =
    input.role ?? (config.admin.email && email === config.admin.email ? 'admin' : 'user');
  if (isDbConnected()) {
    const doc = await UserModel.create({ email, passwordHash: input.passwordHash, role });
    return toRecord(doc.toObject() as Record<string, unknown>);
  }
  const record: UserRecord = {
    id: String(memSeq++),
    email,
    passwordHash: input.passwordHash,
    role,
    tokensBalance: 0,
    createdAt: new Date().toISOString(),
  };
  memByEmail.set(email, record);
  return record;
}

/** Начислить (delta>0) или списать (delta<0) токены. Баланс не уходит ниже 0. */
export async function adjustTokens(userId: string, delta: number): Promise<UserRecord | null> {
  if (isDbConnected()) {
    const doc = await UserModel.findByIdAndUpdate(userId, { $inc: { tokensBalance: delta } }, { new: true })
      .lean()
      .catch(() => null);
    return doc ? toRecord(doc as Record<string, unknown>) : null;
  }
  for (const user of memByEmail.values()) {
    if (user.id === userId) {
      user.tokensBalance = Math.max(0, user.tokensBalance + delta);
      return user;
    }
  }
  return null;
}

export async function setUserRole(userId: string, role: UserRole): Promise<UserRecord | null> {
  if (isDbConnected()) {
    const doc = await UserModel.findByIdAndUpdate(userId, { $set: { role } }, { new: true })
      .lean()
      .catch(() => null);
    return doc ? toRecord(doc as Record<string, unknown>) : null;
  }
  for (const user of memByEmail.values()) {
    if (user.id === userId) {
      user.role = role;
      return user;
    }
  }
  return null;
}

export async function listUsers(): Promise<UserRecord[]> {
  if (isDbConnected()) {
    const docs = await UserModel.find().sort({ createdAt: -1 }).limit(500).lean();
    return docs.map((d) => toRecord(d as Record<string, unknown>));
  }
  return [...memByEmail.values()];
}
