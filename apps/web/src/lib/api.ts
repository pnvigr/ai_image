import type {
  AnalysisHistoryItem,
  AnalysisResult,
  AuthResponse,
  LoginInput,
  PublicUser,
  RegisterInput,
  UpdateOutcomeInput,
} from '@ai-image/shared';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

// ── Управление токеном ──
let authToken: string | null = localStorage.getItem('token');

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export function getAuthToken(): string | null {
  return authToken;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) h.Authorization = `Bearer ${authToken}`;
  return h;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  return res.json().catch(() => ({}));
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

// ── Анализ ──
export interface AnalyzeInput {
  imageDataUrl: string;
  pairHint?: string;
  timeframeHint?: string;
  tier?: 'free' | 'paid';
}

export async function analyze(input: AnalyzeInput): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(
      (data.message as string) || (data.error as string) || 'Запрос не выполнен',
      res.status,
      data.upgrade as boolean | undefined,
    );
  }
  return data as unknown as AnalysisResult;
}

// ── Аутентификация ──
export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError((data.message as string) || 'Ошибка регистрации', res.status);
  return data as unknown as AuthResponse;
}

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError((data.message as string) || 'Ошибка входа', res.status);
  return data as unknown as AuthResponse;
}

export async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: headers() });
  if (!res.ok) return null;
  const data = await parseJson(res);
  return (data.user as PublicUser | undefined) ?? null;
}

// ── История анализов ──
export async function listAnalyses(): Promise<AnalysisHistoryItem[]> {
  const res = await fetch(`${API_BASE}/api/analyses`, { headers: headers() });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError((data.message as string) || 'Ошибка загрузки истории', res.status);
  return (data.items as AnalysisHistoryItem[]) ?? [];
}

export async function updateOutcome(id: string, patch: UpdateOutcomeInput): Promise<AnalysisHistoryItem> {
  const res = await fetch(`${API_BASE}/api/analyses/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(patch),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError((data.message as string) || 'Не удалось сохранить', res.status);
  return data.item as AnalysisHistoryItem;
}

export async function deleteAnalysis(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/analyses/${id}`, { method: 'DELETE', headers: headers() });
  if (!res.ok && res.status !== 204) {
    const data = await parseJson(res);
    throw new ApiError((data.message as string) || 'Не удалось удалить', res.status);
  }
}

// ── Health ──
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
