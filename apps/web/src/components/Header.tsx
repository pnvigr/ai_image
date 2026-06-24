import { LineChart } from 'lucide-react';
import type { HealthInfo } from '../lib/api';
import { cn } from '../lib/cn';

export function Header({ health }: { health: HealthInfo | null }) {
  const isMock = !health || health.ai === 'mock';
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-indigo-500 shadow-lg shadow-emerald-500/20">
          <LineChart className="h-6 w-6 text-slate-950" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-extrabold leading-tight tracking-tight">
            ChartSense <span className="text-emerald-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400">Образовательный анализ графиков</p>
        </div>
      </div>

      <div
        className={cn(
          'inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-medium',
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
    </header>
  );
}
