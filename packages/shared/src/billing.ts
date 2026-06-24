import { z } from 'zod';

/** Пакет токенов для «перепродажи». Оплата в дипломном проекте имитируется. */
export interface TokenPackage {
  id: string;
  tokens: number;
  priceLabel: string;
  bonus?: string;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'starter', tokens: 50, priceLabel: '299 ₽' },
  { id: 'standard', tokens: 200, priceLabel: '999 ₽', bonus: '+20 бонусом' },
  { id: 'pro', tokens: 1000, priceLabel: '3 990 ₽', bonus: '+150 бонусом' },
];

export interface BillingInfo {
  paidAnalysisCost: number;
  freeDailyLimit: number;
  supportContact: string;
  packages: TokenPackage[];
}

export type TopupStatus = 'pending' | 'fulfilled' | 'rejected';

export interface TopupRequest {
  id: string;
  userId: string;
  userEmail?: string;
  packageId: string;
  tokens: number;
  status: TopupStatus;
  createdAt: string;
}

/** Заявка пользователя на пополнение (выбор пакета). */
export const CreateTopupSchema = z.object({
  packageId: z.string().min(1).max(40),
});
export type CreateTopupInput = z.infer<typeof CreateTopupSchema>;

/** Админ: начисление/списание токенов (delta может быть отрицательной). */
export const CreditTokensSchema = z.object({
  tokens: z.number().int().min(-1_000_000).max(1_000_000),
});

/** Админ: смена роли пользователя. */
export const SetRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});
