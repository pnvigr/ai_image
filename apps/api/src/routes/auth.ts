import { Router } from 'express';
import { RegisterSchema, LoginSchema, UpdatePreferencesSchema, type AuthResponse } from '@ai-image/shared';
import { config } from '../config.js';
import { createUser, findUserByEmail, setPreferredModel, setUserRole } from '../store/users.js';
import { hashPassword, verifyPassword, signToken, toPublicUser } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const { email, password } = parse.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'email_taken', message: 'Этот email уже зарегистрирован.' });
  }

  const user = await createUser({ email, passwordHash: await hashPassword(password) });
  const body: AuthResponse = { token: signToken(user), user: toPublicUser(user) };
  return res.status(201).json(body);
});

authRouter.post('/login', async (req, res) => {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const { email, password } = parse.data;

  let user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Неверный email или пароль.' });
  }

  // Бутстрап администратора: email из ADMIN_EMAIL автоматически получает роль admin.
  if (config.admin.email && user.email === config.admin.email && user.role !== 'admin') {
    user = (await setUserRole(user.id, 'admin')) ?? user;
  }

  const body: AuthResponse = { token: signToken(user), user: toPublicUser(user) };
  return res.json(body);
});

authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

// Обновление настроек (выбранная платная модель запоминается на сервере).
authRouter.patch('/me', requireAuth, async (req, res) => {
  const parse = UpdatePreferencesSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const updated = await setPreferredModel(req.user!.id, parse.data.preferredModelId);
  if (!updated) return res.status(404).json({ error: 'not_found', message: 'Пользователь не найден.' });
  return res.json({ user: toPublicUser(updated) });
});
