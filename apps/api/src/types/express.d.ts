import type { PublicUser } from '@ai-image/shared';

// Расширяем Express.Request полем user, которое заполняет middleware requireAuth.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export {};
