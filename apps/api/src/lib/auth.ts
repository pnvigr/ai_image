import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { PublicUser, UserRole } from '@ai-image/shared';
import { config } from '../config.js';
import type { UserRecord } from '../store/users.js';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
}

export function signToken(user: UserRecord): string {
  const payload: JwtPayload = { sub: user.id, role: user.role };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresInSeconds });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

/** Преобразует внутреннюю запись в публичный профиль (без passwordHash). */
export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    tokensBalance: user.tokensBalance,
    preferredModelId: user.preferredModelId ?? null,
    createdAt: user.createdAt,
  };
}
