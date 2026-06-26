import mongoose from 'mongoose';
import { config } from './config.js';

let connected = false;

export function isDbConnected(): boolean {
  return connected;
}

/**
 * Подключение к MongoDB. Если MONGODB_URI не задан или соединение не удалось —
 * приложение продолжает работать без персистентности (история отключена).
 * Это удобно для локального запуска и демо.
 */
export async function connectDb(): Promise<boolean> {
  if (!config.mongoUri) {
    console.warn('[db] MONGODB_URI is not set — running without persistence (history disabled).');
    return false;
  }
  try {
    await mongoose.connect(config.mongoUri);
    connected = true;
    console.log('[db] connected to MongoDB');
    return true;
  } catch (err) {
    console.error('[db] connection failed:', (err as Error).message);
    return false;
  }
}
