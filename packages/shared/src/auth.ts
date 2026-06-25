import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Некорректный email').max(120),
  password: z.string().min(6, 'Минимум 6 символов').max(100),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Некорректный email').max(120),
  password: z.string().min(1, 'Введите пароль').max(100),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export type UserRole = 'user' | 'admin';

/** Публичный профиль пользователя — без passwordHash. */
export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  tokensBalance: number;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}
