import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Check, ShieldCheck, Users } from 'lucide-react';
import type { PublicUser, TopupRequest, UserRole } from '@ai-image/shared';
import {
  ApiError,
  adminCreditUser,
  adminFulfillTopup,
  adminListTopups,
  adminListUsers,
  adminSetRole,
} from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/cn';

export function AdminPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const [u, t] = await Promise.all([adminListUsers(), adminListTopups()]);
      setUsers(u);
      setTopups(t);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ошибка загрузки');
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
        <h2 className="text-lg font-bold tracking-tight">Админка</h2>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Заявки на пополнение</h3>
        {topups.length === 0 ? (
          <p className="text-sm text-slate-500">Заявок нет.</p>
        ) : (
          <div className="space-y-2">
            {topups.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm"
              >
                <span className="font-medium text-slate-200">{t.userEmail ?? t.userId}</span>
                <span className="text-slate-500">
                  {t.tokens} токенов · {t.packageId}
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
                        setError(e instanceof ApiError ? e.message : 'Ошибка');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:opacity-90"
                  >
                    <Check className="h-3.5 w-3.5" /> Зачислить
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
          <Users className="h-4 w-4" /> Пользователи ({users.length})
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
      onError(e instanceof ApiError ? e.message : 'Ошибка');
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
      onError(e instanceof ApiError ? e.message : 'Ошибка');
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
        баланс: <span className="font-semibold text-emerald-300">{u.tokensBalance}</span>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <input
          type="number"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="±токены"
          disabled={busy}
          className="w-24 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-slate-100 outline-none focus:border-emerald-500/60"
        />
        <button
          onClick={credit}
          disabled={busy}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          Начислить
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
