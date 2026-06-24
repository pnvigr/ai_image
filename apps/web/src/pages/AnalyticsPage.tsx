import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, Loader2, Sparkles, Lightbulb, AlertTriangle } from 'lucide-react';
import {
  computeHistoryStats,
  computeInstrumentStats,
  type AnalysisHistoryItem,
  type AnalyticsResult,
} from '@ai-image/shared';
import { ApiError, getAnalyticsInsight, listAnalyses } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/cn';

export function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<AnalyticsResult | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listAnalyses()
      .then(setItems)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) {
    return (
      <div className="grid place-items-center py-20 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const stats = computeHistoryStats(items);
  const byInstrument = insight?.byInstrument ?? computeInstrumentStats(items);

  async function loadInsight() {
    setInsightLoading(true);
    setError(null);
    try {
      setInsight(await getAnalyticsInsight());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось получить разбор');
    } finally {
      setInsightLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-emerald-400" />
        <h2 className="text-lg font-bold tracking-tight">Аналитика сделок</h2>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Всего анализов" value={String(stats.total)} />
        <StatCard label="Заходов" value={String(stats.entered)} hint={`${stats.wins}W / ${stats.losses}L`} />
        <StatCard
          label="Винрейт"
          value={stats.winrate === null ? '—' : `${stats.winrate}%`}
          accent={
            stats.winrate === null ? 'text-slate-300' : stats.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'
          }
        />
        <StatCard label="Σ payout" value={stats.totalPayout ? stats.totalPayout.toFixed(2) : '0'} />
      </div>

      {loading ? (
        <div className="grid place-items-center py-12 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-slate-400">
          Нет данных. Сделай анализы на главной и отметь исходы в истории.
        </div>
      ) : (
        <>
          {/* Разбивка по инструментам */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">По инструментам</h3>
            <div className="space-y-2">
              {byInstrument.map((s) => (
                <div
                  key={s.pair}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm"
                >
                  <span className="w-20 font-semibold text-slate-100">{s.pair}</span>
                  <span className="text-xs text-slate-500">анализов {s.total}</span>
                  <span className="text-xs text-slate-500">входов {s.entered}</span>
                  <span className="text-xs text-slate-500">
                    {s.wins}W / {s.losses}L
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          (s.winrate ?? 0) >= 50 ? 'bg-emerald-400' : 'bg-rose-400',
                        )}
                        style={{ width: `${s.winrate ?? 0}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'w-12 text-right text-xs font-semibold',
                        s.winrate === null
                          ? 'text-slate-500'
                          : s.winrate >= 50
                            ? 'text-emerald-400'
                            : 'text-rose-400',
                      )}
                    >
                      {s.winrate === null ? '—' : `${s.winrate}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ИИ-разбор */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                <Sparkles className="h-4 w-4 text-emerald-400" /> Разбор от ИИ
              </h3>
              <button
                onClick={loadInsight}
                disabled={insightLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-indigo-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
              >
                {insightLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Получить разбор'}
              </button>
            </div>

            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {insight ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-slate-200">{insight.insight}</p>
                {insight.recommendations.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-400" /> Попробовать также:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {insight.recommendations.map((r) => (
                        <span
                          key={r}
                          className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {insight.degraded && (
                  <p className="text-xs text-slate-500">
                    (ИИ-провайдер недоступен — показан разбор по локальной статистике.)
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Нажми «Получить разбор», чтобы ИИ проанализировал твои инструменты и предложил другие из списка.
              </p>
            )}
          </div>
        </>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p>
          Рекомендации носят образовательный характер. Различия винрейта между инструментами на малой выборке
          статистически незначимы — это часть вывода работы о том, что ИИ не даёт предсказательного преимущества.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={cn('mt-1 text-2xl font-bold tracking-tight', accent ?? 'text-slate-100')}>{value}</div>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}
