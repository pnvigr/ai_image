import type {
  AnalysisHistoryItem,
  AnalysisResult,
  AnalyticsResult,
  AuthResponse,
  BillingInfo,
  LoginInput,
  PublicUser,
  RegisterInput,
  TopupRequest,
  UpdateOutcomeInput,
  UserRole,
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
  topup?: boolean;
  constructor(message: string, status: number, opts?: { upgrade?: boolean; topup?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.upgrade = opts?.upgrade;
    this.topup = opts?.topup;
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
      { upgrade: data.upgrade as boolean | undefined, topup: data.topup as boolean | undefined },
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

// ── Биллинг ──
export async function getBillingInfo(): Promise<BillingInfo> {
  const res = await fetch(`${API_BASE}/api/billing/info`);
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError('Не удалось загрузить тарифы', res.status);
  return data as unknown as BillingInfo;
}

export async function requestTopup(packageId: string): Promise<{ request: TopupRequest; message: string }> {
  const res = await fetch(`${API_BASE}/api/billing/topup`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ packageId }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError((data.message as string) || 'Не удалось создать заявку', res.status);
  return data as unknown as { request: TopupRequest; message: string };
}

export async function myTopups(): Promise<TopupRequest[]> {
  const res = await fetch(`${API_BASE}/api/billing/topup/mine`, { headers: headers() });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError('Не удалось загрузить заявки', res.status);
  return (data.items as TopupRequest[]) ?? [];
}

// ── Админка ──
export async function adminListUsers(): Promise<PublicUser[]> {
  const res = await fetch(`${API_BASE}/api/admin/users`, { headers: headers() });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError('Нет доступа', res.status);
  return (data.users as PublicUser[]) ?? [];
}

export async function adminCreditUser(id: string, tokens: number): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}/credit`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ tokens }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError((data.message as string) || 'Ошибка', res.status);
  return data.user as PublicUser;
}

export async function adminSetRole(id: string, role: UserRole): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}/role`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ role }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError((data.message as string) || 'Ошибка', res.status);
  return data.user as PublicUser;
}

export async function adminListTopups(): Promise<TopupRequest[]> {
  const res = await fetch(`${API_BASE}/api/admin/topups`, { headers: headers() });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError('Нет доступа', res.status);
  return (data.items as TopupRequest[]) ?? [];
}

export async function adminFulfillTopup(id: string): Promise<TopupRequest> {
  const res = await fetch(`${API_BASE}/api/admin/topups/${id}/fulfill`, {
    method: 'POST',
    headers: headers(),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError((data.message as string) || 'Ошибка', res.status);
  return data.item as TopupRequest;
}

// ── Аналитика ──
export async function getAnalyticsInsight(): Promise<AnalyticsResult> {
  const res = await fetch(`${API_BASE}/api/analytics/insight`, { method: 'POST', headers: headers() });
  const data = await parseJson(res);
  if (!res.ok) throw new ApiError((data.message as string) || 'Не удалось получить аналитику', res.status);
  return data as unknown as AnalyticsResult;
}
