import type { Request, Response, NextFunction } from 'express';
import { verifyToken, toPublicUser } from '../lib/auth.js';
import { findUserById } from '../store/users.js';

/** Требует валидный Bearer-токен. Кладёт публичного пользователя в req.user. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authentication required.' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    const user = await findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'User not found.' });
    }
    req.user = toPublicUser(user);
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token.' });
  }
}

/** Мягкая авторизация: если токен есть и валиден — кладёт user в req, иначе пропускает. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(header.slice(7));
      const user = await findUserById(payload.sub);
      if (user) req.user = toPublicUser(user);
    } catch {
      // невалидный токен игнорируем — запрос остаётся анонимным
    }
  }
  next();
}

/** Требует роль admin (используется в Фазе 4). Применять после requireAuth. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Administrator rights required.' });
  }
  next();
}
