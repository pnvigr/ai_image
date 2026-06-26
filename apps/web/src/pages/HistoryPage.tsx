import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Loader2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  History as HistoryIcon,
  AlertTriangle,
} from 'lucide-react';
import {
  computeHistoryStats,
  type AnalysisHistoryItem,
  type Direction,
  type TradeResult,
} from '@ai-image/shared';
import { listAnalyses, updateOutcome, deleteAnalysis, ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/cn';

const DIR: Record<Direction, { label: string; cls: string; Icon: typeof TrendingUp }> = {
  UP: { label: 'UP', cls: 'text-emerald-400 bg-emerald-500/10', Icon: TrendingUp },
  DOWN: { label: 'DOWN', cls: 'text-rose-400 bg-rose-500/10', Icon: TrendingDown },
  NEUTRAL: { label: 'NEUTRAL', cls: 'text-amber-400 bg-amber-500/10', Icon: Minus },
};

export function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listAnalyses()
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load history'))
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

  function replaceItem(updated: AnalysisHistoryItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <HistoryIcon className="h-5 w-5 text-emerald-400" />
        <h2 className="text-lg font-bold tracking-tight">Analysis history</h2>
      </div>

      {/* Win-rate summary — the centerpiece of the research part */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total analyses" value={String(stats.total)} />
        <StatCard label="Entries" value={`${stats.entered}`} hint={`${stats.wins}W / ${stats.losses}L`} />
        <StatCard
          label="Win rate"
          value={stats.winrate === null ? '—' : `${stats.winrate}%`}
          accent={
            stats.winrate === null ? 'text-slate-300' : stats.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'
          }
        />
        <StatCard label="Σ payout" value={stats.totalPayout ? stats.totalPayout.toFixed(2) : '0'} />
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p>
          Win rate is computed over trades with a known outcome. On a small sample it naturally fluctuates
          around a random level — this is the empirical illustration of the thesis: AI provides no stable
          predictive edge.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-16 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-slate-400">
          No analyses yet. Run your first one on the home page — it will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <HistoryRow
              key={item.id}
              item={item}
              onChange={replaceItem}
              onRemove={(id) => setItems((p) => p.filter((i) => i.id !== id))}
              onError={setError}
            />
          ))}
        </div>
      )}
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

function HistoryRow({
  item,
  onChange,
  onRemove,
  onError,
}: {
  item: AnalysisHistoryItem;
  onChange: (updated: AnalysisHistoryItem) => void;
  onRemove: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const dir = DIR[item.direction];
  const [payout, setPayout] = useState(item.payout?.toString() ?? '');
  const [busy, setBusy] = useState(false);

  async function patch(body: Parameters<typeof updateOutcome>[1]) {
    setBusy(true);
    try {
      const updated = await updateOutcome(item.id, body);
      onChange(updated);
      setPayout(updated.payout?.toString() ?? '');
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteAnalysis(item.id);
      onRemove(item.id);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Failed to delete');
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', dir.cls)}>
          <dir.Icon className="h-3.5 w-3.5" />
          {dir.label}
        </span>
        <span className="font-semibold text-slate-100">{item.pair}</span>
        <span className="text-xs text-slate-500">{item.timeframe}</span>
        <span className="text-xs text-slate-500">confidence {Math.round(item.confidence)}%</span>
        {item.mock && (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">DEMO</span>
        )}
        <span className="ml-auto text-xs text-slate-600">
          {item.createdAt ? new Date(item.createdAt).toLocaleString('en-US') : ''}
        </span>
        <button
          onClick={remove}
          disabled={busy}
          className="text-slate-600 transition hover:text-rose-400 disabled:opacity-50"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-slate-400">{item.description}</p>

      {/* Manual outcome */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
        <span className="text-xs font-medium text-slate-400">Entered?</span>
        <Toggle active={item.entered === true} onClick={() => patch({ entered: true })} disabled={busy}>
          Yes
        </Toggle>
        <Toggle active={item.entered === false} onClick={() => patch({ entered: false })} disabled={busy} tone="slate">
          No
        </Toggle>

        {item.entered === true && (
          <>
            <span className="ml-2 text-xs font-medium text-slate-400">Result:</span>
            <Toggle active={item.result === 'win'} onClick={() => patch({ result: 'win' as TradeResult })} disabled={busy} tone="green">
              Win
            </Toggle>
            <Toggle active={item.result === 'loss'} onClick={() => patch({ result: 'loss' as TradeResult })} disabled={busy} tone="red">
              Loss
            </Toggle>

            <span className="ml-2 text-xs font-medium text-slate-400">Payout:</span>
            <input
              type="number"
              inputMode="decimal"
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
              onBlur={() => {
                const v = payout.trim() === '' ? null : Number(payout);
                if (v === null || Number.isFinite(v)) patch({ payout: v });
              }}
              placeholder="0.00"
              disabled={busy}
              className="w-24 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-slate-100 outline-none focus:border-emerald-500/60"
            />
          </>
        )}
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
      </div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  disabled,
  tone = 'emerald',
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'emerald' | 'green' | 'red' | 'slate';
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    emerald: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    green: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    red: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    slate: 'border-slate-500/40 bg-slate-500/15 text-slate-200',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50',
        active ? tones[tone] : 'border-slate-700 text-slate-400 hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  );
}
