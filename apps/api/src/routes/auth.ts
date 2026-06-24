import { Router } from 'express';
import { RegisterSchema, LoginSchema, type AuthResponse } from '@ai-image/shared';
import { createUser, findUserByEmail } from '../store/users.js';
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

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Неверный email или пароль.' });
  }

  const body: AuthResponse = { token: signToken(user), user: toPublicUser(user) };
  return res.json(body);
});

authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});
