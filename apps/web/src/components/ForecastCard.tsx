import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, type LucideIcon } from 'lucide-react';
import type { AnalysisResult, Direction } from '@ai-image/shared';
import { cn } from '../lib/cn';

const DIRECTION: Record<
  Direction,
  { label: string; text: string; bg: string; ring: string; bar: string; Icon: LucideIcon }
> = {
  UP: {
    label: 'ВВЕРХ',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/30',
    bar: 'bg-emerald-400',
    Icon: TrendingUp,
  },
  DOWN: {
    label: 'ВНИЗ',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    ring: 'ring-rose-500/30',
    bar: 'bg-rose-400',
    Icon: TrendingDown,
  },
  NEUTRAL: {
    label: 'НЕЙТРАЛЬНО',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/30',
    bar: 'bg-amber-400',
    Icon: Minus,
  },
};

function Row({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="select-none">{icon}</span>
      <span className="text-sm font-semibold text-slate-400">{label}:</span>
      <span className="text-sm text-slate-100">{children}</span>
    </div>
  );
}

export function ForecastCard({ result }: { result: AnalysisResult }) {
  const dir = DIRECTION[result.direction];
  const time = result.createdAt ? new Date(result.createdAt) : new Date();
  const confidence = Math.min(100, Math.max(0, Math.round(result.confidence)));

  return (
    <section className="animate-fade-up overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/30 backdrop-blur">
      <div className={cn('flex items-center justify-between border-b border-slate-800 px-5 py-3', dir.bg)}>
        <div className="flex items-center gap-2">
          <dir.Icon className={cn('h-5 w-5', dir.text)} />
          <span className="font-bold tracking-tight text-slate-100">{result.pair}</span>
        </div>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold ring-1', dir.text, dir.bg, dir.ring)}>
          {dir.label}
        </span>
      </div>

      <div className="space-y-3 px-5 py-4">
        <Row icon="⏰" label="Время прогноза">
          {time.toLocaleTimeString('ru-RU')}
        </Row>
        <Row icon="💱" label="Валютная пара">
          {result.pair}
        </Row>
        <Row icon="📈" label="Направление">
          <span className={cn('font-semibold', dir.text)}>{dir.label}</span>
        </Row>
        <Row icon="⏳" label="Экспирация">
          {result.timeframe}
        </Row>
        <Row icon="🤖" label="Модель">
          {result.mock ? 'демо (mock)' : result.model}
        </Row>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span>Уверенность модели</span>
            <span className={cn('font-semibold', dir.text)}>{confidence}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={cn('h-full rounded-full transition-all duration-500', dir.bar)}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 pt-1">
          <span className="select-none">📊</span>
          <p className="text-sm leading-relaxed text-slate-200">
            <span className="font-semibold text-slate-400">Описание: </span>
            {result.description}
          </p>
        </div>

        {result.signals.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {result.signals.map((s, i) => (
              <span
                key={i}
                className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-5 py-2.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          {result.mock ? 'mock (demo)' : result.model}
        </span>
        {result.mock && (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-400">DEMO</span>
        )}
      </div>
    </section>
  );
}
