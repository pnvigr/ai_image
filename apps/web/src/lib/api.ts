import type { AnalysisResult } from '@ai-image/shared';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export interface AnalyzeInput {
  imageDataUrl: string;
  pairHint?: string;
  timeframeHint?: string;
  tier?: 'free' | 'paid';
}

export class ApiError extends Error {
  status: number;
  upgrade?: boolean;
  constructor(message: string, status: number, upgrade?: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.upgrade = upgrade;
  }
}

export async function analyze(input: AnalyzeInput): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.message || data?.error || 'Запрос не выполнен', res.status, data?.upgrade);
  }
  return data as AnalysisResult;
}

export interface HealthInfo {
  status: string;
  db: 'connected' | 'disabled';
  ai: 'openrouter' | 'mock';
  model: string;
}

export async function getHealth(): Promise<HealthInfo | null> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) return null;
    return (await res.json()) as HealthInfo;
  } catch {
    return null;
  }
}
