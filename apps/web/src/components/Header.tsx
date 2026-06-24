import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, LogOut, History as HistoryIcon, Coins, Shield } from 'lucide-react';
import { getHealth, type HealthInfo } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/cn';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthInfo | null>(null);

  useEffect(() => {
    getHealth().then(setHealth);
  }, []);

  const isMock = !health || health.ai === 'mock';

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Link to="/" className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-indigo-500 shadow-lg shadow-emerald-500/20">
          <LineChart className="h-6 w-6 text-slate-950" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-extrabold leading-tight tracking-tight">
            ChartSense <span className="text-emerald-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400">Образовательный анализ графиков</p>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
            isMock
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          )}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                isMock ? 'bg-amber-400' : 'bg-emerald-400',
              )}
            />
            <span
              className={cn('relative inline-flex h-2 w-2 rounded-full', isMock ? 'bg-amber-400' : 'bg-emerald-400')}
            />
          </span>
          {isMock ? 'DEMO · mock-режим' : `LIVE · ${health?.model ?? 'model'}`}
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/billing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
              title="Баланс токенов"
            >
              <Coins className="h-4 w-4" /> {user.tokensBalance}
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <HistoryIcon className="h-4 w-4" /> История
            </Link>
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-300 transition hover:bg-slate-800"
              >
                <Shield className="h-4 w-4" /> Админка
              </Link>
            )}
            <span className="hidden max-w-[10rem] truncate text-sm text-slate-300 sm:inline">{user.email}</span>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" /> Выйти
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Вход
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-gradient-to-r from-emerald-400 to-indigo-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            >
              Регистрация
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
