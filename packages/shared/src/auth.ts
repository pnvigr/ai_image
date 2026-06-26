import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email').max(120),
  password: z.string().min(6, 'At least 6 characters').max(100),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email').max(120),
  password: z.string().min(1, 'Enter your password').max(100),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export type UserRole = 'user' | 'admin';

/** Публичный профиль пользователя — без passwordHash. */
export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  tokensBalance: number;
  preferredModelId?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

/** Обновление настроек пользователя (например, выбранная платная модель). */
export const UpdatePreferencesSchema = z.object({
  preferredModelId: z.string().max(120).nullable(),
});
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
