import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Coins, Loader2, CheckCircle2, Clock, XCircle, Send, Info } from 'lucide-react';
import type { BillingInfo, TokenPackage, TopupRequest } from '@ai-image/shared';
import { ApiError, getBillingInfo, myTopups, requestTopup } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/cn';

const STATUS: Record<TopupRequest['status'], { label: string; cls: string; Icon: typeof Clock }> = {
  pending: { label: 'pending', cls: 'text-amber-300', Icon: Clock },
  fulfilled: { label: 'credited', cls: 'text-emerald-300', Icon: CheckCircle2 },
  rejected: { label: 'rejected', cls: 'text-rose-300', Icon: XCircle },
};

export function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getBillingInfo().then(setInfo).catch(() => undefined);
    if (user) myTopups().then(setTopups).catch(() => undefined);
  }, [user]);

  if (authLoading) {
    return (
      <div className="grid place-items-center py-20 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  async function buy(pkg: TokenPackage) {
    setBusy(pkg.id);
    setError(null);
    setMessage(null);
    try {
      const r = await requestTopup(pkg.id);
      setMessage(r.message);
      setTopups(await myTopups());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create request');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-bold tracking-tight">Tokens</h2>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm">
          Balance: <span className="font-bold text-emerald-300">{user.tokensBalance}</span> tokens
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        <p>
          The free tier is limited to {info?.freeDailyLimit ?? '—'} analyses per day. The paid model spends
          tokens ({info?.paidAnalysisCost ?? 1} per analysis). In this educational project payment is
          simulated: after placing a request, contact support — an administrator credits the tokens.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {info?.packages.map((pkg) => (
          <div key={pkg.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-3xl font-bold text-slate-100">{pkg.tokens}</div>
            <div className="text-xs text-slate-500">tokens{pkg.bonus ? ` · ${pkg.bonus}` : ''}</div>
            <div className="mt-3 text-lg font-semibold text-emerald-300">{pkg.priceLabel}</div>
            <button
              onClick={() => buy(pkg)}
              disabled={busy !== null}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
            >
              {busy === pkg.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" /> Order
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {info && (
        <p className="text-center text-sm text-slate-400">
          Support for crediting: <span className="font-medium text-slate-200">{info.supportContact}</span>
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">My requests</h3>
        {topups.length === 0 ? (
          <p className="text-sm text-slate-500">No requests yet.</p>
        ) : (
          <div className="space-y-2">
            {topups.map((t) => {
              const s = STATUS[t.status];
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-sm"
                >
                  <span className="text-slate-300">
                    {t.tokens} tokens <span className="text-slate-600">· package {t.packageId}</span>
                  </span>
                  <span className={cn('inline-flex items-center gap-1.5 font-medium', s.cls)}>
                    <s.Icon className="h-4 w-4" /> {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
