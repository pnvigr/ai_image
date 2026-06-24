import type { Request, Response, NextFunction } from 'express';
import { verifyToken, toPublicUser } from '../lib/auth.js';
import { findUserById } from '../store/users.js';

/** Требует валидный Bearer-токен. Кладёт публичного пользователя в req.user. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Требуется вход в систему.' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    const user = await findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Пользователь не найден.' });
    }
    req.user = toPublicUser(user);
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: 'Невалидный или просроченный токен.' });
  }
}

/** Требует роль admin (используется в Фазе 4). Применять после requireAuth. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Нужны права администратора.' });
  }
  next();
}
