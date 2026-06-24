import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, AlertTriangle, Zap, Coins } from 'lucide-react';
import { UploadCard } from '../components/UploadCard';
import { ForecastCard } from '../components/ForecastCard';
import { analyze, ApiError, type AnalyzeInput } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type { AnalysisResult } from '@ai-image/shared';

export function HomePage() {
  const { refresh } = useAuth();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; upgrade?: boolean; topup?: boolean } | null>(null);
  const [lastInput, setLastInput] = useState<AnalyzeInput | null>(null);

  async function run(input: AnalyzeInput) {
    setLoading(true);
    setError(null);
    setLastInput(input);
    try {
      setResult(await analyze(input));
      await refresh(); // обновляем баланс токенов после платного анализа
    } catch (e) {
      if (e instanceof ApiError) setError({ message: e.message, upgrade: e.upgrade, topup: e.topup });
      else setError({ message: 'Не удалось связаться с сервером. Запущен ли API?' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <UploadCard onAnalyze={run} loading={loading} />

      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div className="space-y-2">
              <p>{error.message}</p>
              {error.upgrade && lastInput && (
                <button
                  onClick={() => run({ ...lastInput, tier: 'paid' })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:opacity-90"
                >
                  <Zap className="h-3.5 w-3.5" /> Использовать платную модель
                </button>
              )}
              {error.topup && (
                <Link
                  to="/billing"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:opacity-90"
                >
                  <Coins className="h-3.5 w-3.5" /> Пополнить баланс
                </Link>
              )}
            </div>
          </div>
        )}

        {loading ? <SkeletonCard /> : result ? <ForecastCard result={result} /> : !error && <EmptyState />}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-800/80">
        <Sparkles className="h-6 w-6 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-400">Загрузи скриншот графика — здесь появится разбор</p>
      <p className="max-w-xs text-xs text-slate-600">
        Формат ответа: пара, направление, экспирация, уверенность и описание
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-lg bg-slate-800/70"
          style={{ height: i === 3 ? 56 : 16, width: `${90 - i * 8}%` }}
        >
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
        </div>
      ))}
    </div>
  );
}
