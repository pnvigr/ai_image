import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Check, ShieldCheck, Users, Cpu, Plus, Trash2, Power } from 'lucide-react';
import type { AiModelInfo, ModelTier, PublicUser, TopupRequest, UserRole } from '@ai-image/shared';
import {
  ApiError,
  adminCreateModel,
  adminCreditUser,
  adminDeleteModel,
  adminFulfillTopup,
  adminListModels,
  adminListTopups,
  adminListUsers,
  adminSetRole,
  adminUpdateModel,
} from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/cn';

export function AdminPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [models, setModels] = useState<AiModelInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const [u, t, m] = await Promise.all([adminListUsers(), adminListTopups(), adminListModels()]);
      setUsers(u);
      setTopups(t);
      setModels(m);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load');
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') void reload();
  }, [user]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-indigo-400" />
        <h2 className="text-lg font-bold tracking-tight">Admin</h2>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* AI models */}
      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
          <Cpu className="h-4 w-4" /> AI models ({models.length})
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Free models are tried in order (by `order`) until one succeeds. Paid models are chosen by the user.
        </p>
        <CreateModelForm onCreated={reload} onError={setError} />
        <div className="mt-3 space-y-2">
          {models.map((m) => (
            <ModelRow key={m.id} m={m} onChanged={reload} onError={setError} />
          ))}
        </div>
      </section>

      {/* Top-up requests */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Top-up requests</h3>
        {topups.length === 0 ? (
          <p className="text-sm text-slate-500">No requests.</p>
        ) : (
          <div className="space-y-2">
            {topups.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm"
              >
                <span className="font-medium text-slate-200">{t.userEmail ?? t.userId}</span>
                <span className="text-slate-500">
                  {t.tokens} tokens · {t.packageId}
                </span>
                <span
                  className={cn(
                    'ml-auto rounded-full px-2 py-0.5 text-xs font-medium',
                    t.status === 'fulfilled'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : t.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-300'
                        : 'bg-rose-500/10 text-rose-300',
                  )}
                >
                  {t.status}
                </span>
                {t.status === 'pending' && (
                  <button
                    onClick={async () => {
                      try {
                        await adminFulfillTopup(t.id);
                        await reload();
                      } catch (e) {
                        setError(e instanceof ApiError ? e.message : 'Error');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:opacity-90"
                  >
                    <Check className="h-3.5 w-3.5" /> Credit
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users */}
      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
          <Users className="h-4 w-4" /> Users ({users.length})
        </h3>
        <div className="space-y-2">
          {users.map((u) => (
            <UserRow key={u.id} u={u} onChanged={reload} onError={setError} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CreateModelForm({ onCreated, onError }: { onCreated: () => Promise<void>; onError: (m: string) => void }) {
  const [modelId, setModelId] = useState('');
  const [label, setLabel] = useState('');
  const [tier, setTier] = useState<ModelTier>('free');
  const [cost, setCost] = useState('0');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!modelId.trim() || !label.trim()) return;
    setBusy(true);
    try {
      await adminCreateModel({
        modelId: modelId.trim(),
        label: label.trim(),
        tier,
        costTokens: Number(cost) || 0,
      });
      setModelId('');
      setLabel('');
      setCost('0');
      await onCreated();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <input
        value={modelId}
        onChange={(e) => setModelId(e.target.value)}
        placeholder="modelId (openrouter)"
        className="min-w-[14rem] flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-500/60"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Name"
        className="w-32 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-500/60"
      />
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value as ModelTier)}
        className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100 outline-none"
      >
        <option value="free">free</option>
        <option value="paid">paid</option>
      </select>
      {tier === 'paid' && (
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          title="Cost in tokens"
          className="w-20 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-500/60"
        />
      )}
      <button
        onClick={add}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-indigo-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:opacity-90 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Add
      </button>
    </div>
  );
}

function ModelRow({
  m,
  onChanged,
  onError,
}: {
  m: AiModelInfo;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function update(patch: { enabled?: boolean; order?: number; costTokens?: number }) {
    setBusy(true);
    try {
      await adminUpdateModel(m.id, patch);
      await onChanged();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await adminDeleteModel(m.id);
      await onChanged();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Error');
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border bg-slate-900/50 px-4 py-3 text-sm',
        m.enabled ? 'border-slate-800' : 'border-slate-800/60 opacity-60',
      )}
    >
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-xs font-semibold',
          m.tier === 'paid' ? 'bg-indigo-500/15 text-indigo-300' : 'bg-emerald-500/15 text-emerald-300',
        )}
      >
        {m.tier}
      </span>
      <span className="font-medium text-slate-200">{m.label}</span>
      <span className="text-xs text-slate-500">{m.modelId}</span>

      <div className="ml-auto flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-slate-500">
          order
          <input
            type="number"
            defaultValue={m.order}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v !== m.order) void update({ order: v });
            }}
            className="w-14 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-slate-100 outline-none focus:border-emerald-500/60"
          />
        </label>
        {m.tier === 'paid' && (
          <label className="flex items-center gap-1 text-xs text-slate-500">
            price
            <input
              type="number"
              defaultValue={m.costTokens}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v !== m.costTokens) void update({ costTokens: v });
              }}
              className="w-16 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-slate-100 outline-none focus:border-emerald-500/60"
            />
          </label>
        )}
        <button
          onClick={() => update({ enabled: !m.enabled })}
          disabled={busy}
          title={m.enabled ? 'Disable' : 'Enable'}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50',
            m.enabled
              ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
              : 'border-slate-600 text-slate-400 hover:bg-slate-800',
          )}
        >
          <Power className="h-3.5 w-3.5" /> {m.enabled ? 'on' : 'off'}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="text-slate-600 transition hover:text-rose-400 disabled:opacity-50"
          aria-label="Delete model"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function UserRow({
  u,
  onChanged,
  onError,
}: {
  u: PublicUser;
  onChanged: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [delta, setDelta] = useState('');
  const [busy, setBusy] = useState(false);

  async function credit() {
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) return;
    setBusy(true);
    try {
      await adminCreditUser(u.id, Math.trunc(n));
      setDelta('');
      await onChanged();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleRole() {
    const next: UserRole = u.role === 'admin' ? 'user' : 'admin';
    setBusy(true);
    try {
      await adminSetRole(u.id, next);
      await onChanged();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm">
      <span className="font-medium text-slate-200">{u.email}</span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-xs font-semibold',
          u.role === 'admin' ? 'bg-indigo-500/15 text-indigo-300' : 'bg-slate-700/50 text-slate-300',
        )}
      >
        {u.role}
      </span>
      <span className="text-slate-400">
        balance: <span className="font-semibold text-emerald-300">{u.tokensBalance}</span>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <input
          type="number"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="±tokens"
          disabled={busy}
          className="w-24 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-slate-100 outline-none focus:border-emerald-500/60"
        />
        <button
          onClick={credit}
          disabled={busy}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          Credit
        </button>
        <button
          onClick={toggleRole}
          disabled={busy}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          {u.role === 'admin' ? '→ user' : '→ admin'}
        </button>
      </div>
    </div>
  );
}
