import { Router } from 'express';
import { CreditTokensSchema, SetRoleSchema, CreateModelSchema, UpdateModelSchema } from '@ai-image/shared';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { toPublicUser } from '../lib/auth.js';
import { adjustTokens, listUsers, setUserRole } from '../store/users.js';
import { getTopup, listAllTopups, setTopupStatus } from '../store/topups.js';
import { createModel, deleteModel, listModels, updateModel } from '../store/models.js';

export const adminRouter = Router();

// Все админ-роуты требуют авторизации и роли admin.
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', async (_req, res) => {
  const users = (await listUsers()).map(toPublicUser);
  res.json({ users });
});

adminRouter.post('/users/:id/credit', async (req, res) => {
  const parse = CreditTokensSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const updated = await adjustTokens(req.params.id, parse.data.tokens);
  if (!updated) return res.status(404).json({ error: 'not_found', message: 'Пользователь не найден.' });
  res.json({ user: toPublicUser(updated) });
});

adminRouter.post('/users/:id/role', async (req, res) => {
  const parse = SetRoleSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const updated = await setUserRole(req.params.id, parse.data.role);
  if (!updated) return res.status(404).json({ error: 'not_found', message: 'Пользователь не найден.' });
  res.json({ user: toPublicUser(updated) });
});

adminRouter.get('/topups', async (_req, res) => {
  res.json({ items: await listAllTopups() });
});

/** Подтвердить заявку: начислить токены пользователю и пометить fulfilled. */
adminRouter.post('/topups/:id/fulfill', async (req, res) => {
  const topup = await getTopup(req.params.id);
  if (!topup) return res.status(404).json({ error: 'not_found', message: 'Заявка не найдена.' });
  if (topup.status !== 'pending') {
    return res.status(409).json({ error: 'already_processed', message: 'Заявка уже обработана.' });
  }
  await adjustTokens(topup.userId, topup.tokens);
  const updated = await setTopupStatus(topup.id, 'fulfilled');
  res.json({ item: updated });
});

// ── Управление моделями ИИ ──
adminRouter.get('/models', async (_req, res) => {
  res.json({ models: await listModels() });
});

adminRouter.post('/models', async (req, res) => {
  const parse = CreateModelSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  res.status(201).json({ model: await createModel(parse.data) });
});

adminRouter.patch('/models/:id', async (req, res) => {
  const parse = UpdateModelSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const model = await updateModel(req.params.id, parse.data);
  if (!model) return res.status(404).json({ error: 'not_found', message: 'Модель не найдена.' });
  res.json({ model });
});

adminRouter.delete('/models/:id', async (req, res) => {
  const ok = await deleteModel(req.params.id);
  if (!ok) return res.status(404).json({ error: 'not_found', message: 'Модель не найдена.' });
  res.status(204).end();
});
