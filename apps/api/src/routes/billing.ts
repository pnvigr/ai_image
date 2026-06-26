import { Router } from 'express';
import { CreateTopupSchema, TOKEN_PACKAGES } from '@ai-image/shared';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { createTopup, listTopupsByUser } from '../store/topups.js';

export const billingRouter = Router();

/** Публичная информация о тарифах (для страницы пополнения). */
billingRouter.get('/info', (_req, res) => {
  res.json({
    paidAnalysisCost: config.billing.paidAnalysisCost,
    freeDailyLimit: config.billing.freeDailyLimit,
    supportContact: config.billing.supportContact,
    packages: TOKEN_PACKAGES,
  });
});

/** Создать заявку на пополнение. Реальная оплата имитируется — токены начисляет админ. */
billingRouter.post('/topup', requireAuth, async (req, res) => {
  const parse = CreateTopupSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_request', details: parse.error.flatten() });
  }
  const pkg = TOKEN_PACKAGES.find((p) => p.id === parse.data.packageId);
  if (!pkg) return res.status(404).json({ error: 'unknown_package', message: 'Package not found.' });

  const request = await createTopup({
    userId: req.user!.id,
    userEmail: req.user!.email,
    packageId: pkg.id,
    tokens: pkg.tokens,
  });
  res.status(201).json({
    request,
    message: `Request created. To credit ${pkg.tokens} tokens, contact support: ${config.billing.supportContact}`,
  });
});

billingRouter.get('/topup/mine', requireAuth, async (req, res) => {
  res.json({ items: await listTopupsByUser(req.user!.id) });
});
