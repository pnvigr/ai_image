import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageUp, X, Loader2, Sparkles, ClipboardPaste, Gift, Coins } from 'lucide-react';
import type { AiModelInfo } from '@ai-image/shared';
import { cn } from '../lib/cn';

const TIMEFRAMES = ['30 сек', '1 минута', '3 минуты', '5 минут', '15 минут'];

interface SubmitInput {
  imageDataUrl: string;
  pairHint?: string;
  timeframeHint?: string;
}

export function UploadCard({
  onAnalyze,
  loading,
  tier,
  onTierChange,
  freeCount,
  paidModels,
  paidModelId,
  onPaidModelChange,
}: {
  onAnalyze: (input: SubmitInput) => void;
  loading: boolean;
  tier: 'free' | 'paid';
  onTierChange: (t: 'free' | 'paid') => void;
  freeCount: number;
  paidModels: AiModelInfo[];
  paidModelId: string | null;
  onPaidModelChange: (id: string) => void;
}) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [pairHint, setPairHint] = useState('');
  const [timeframeHint, setTimeframeHint] = useState('3 минуты');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback((file: File | undefined | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Вставка скриншота из буфера обмена (Ctrl+V) — удобно после «ножниц».
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []);
      const file = items.find((i) => i.type.startsWith('image/'))?.getAsFile();
      if (file) readFile(file);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [readFile]);

  const selectedPaid = paidModels.find((m) => m.modelId === paidModelId);
  const paidCost = selectedPaid ? selectedPaid.costTokens || 1 : 1;

  function submit() {
    if (!imageDataUrl || loading) return;
    onAnalyze({
      imageDataUrl,
      pairHint: pairHint.trim() || undefined,
      timeframeHint: timeframeHint.trim() || undefined,
    });
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/20 backdrop-blur">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
        <ImageUp className="h-4 w-4 text-emerald-400" /> Скриншот графика
      </h2>

      {!imageDataUrl ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            readFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition',
            dragOver
              ? 'border-emerald-400 bg-emerald-500/5'
              : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/40',
          )}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-800">
            <ImageUp className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-slate-200">Перетащи скриншот сюда или нажми</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ClipboardPaste className="h-3.5 w-3.5" /> можно вставить из буфера (Ctrl+V) · PNG, JPG
            </p>
          </div>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-slate-800">
          <img src={imageDataUrl} alt="Скриншот графика" className="max-h-72 w-full bg-slate-950 object-contain" />
          <button
            type="button"
            onClick={() => setImageDataUrl(null)}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/80 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label="Убрать изображение"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => readFile(e.target.files?.[0])} />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Пара (необязательно)</span>
          <input
            value={pairHint}
            onChange={(e) => setPairHint(e.target.value)}
            placeholder="напр. GBP/USD"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Экспирация</span>
          <select
            value={timeframeHint}
            onChange={(e) => setTimeframeHint(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
          >
            {TIMEFRAMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Выбор тарифа/модели */}
      <div className="mt-4">
        <span className="mb-1.5 block text-xs font-medium text-slate-400">Модель</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onTierChange('free')}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition',
              tier === 'free'
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800',
            )}
          >
            <Gift className="h-4 w-4" /> Бесплатно
          </button>
          <button
            type="button"
            onClick={() => onTierChange('paid')}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition',
              tier === 'paid'
                ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800',
            )}
          >
            <Coins className="h-4 w-4" /> Платно
          </button>
        </div>

        {tier === 'free' ? (
          <p className="mt-2 text-xs text-slate-500">
            Сервер сам подберёт рабочую модель{freeCount > 0 ? ` из ${freeCount} бесплатных` : ''}.
          </p>
        ) : paidModels.length > 0 ? (
          <select
            value={paidModelId ?? ''}
            onChange={(e) => onPaidModelChange(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
          >
            {paidModels.map((m) => (
              <option key={m.id} value={m.modelId}>
                {m.label} · {m.costTokens || 1} ток.
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-2 text-xs text-amber-400/80">Платные модели не настроены администратором.</p>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!imageDataUrl || loading || (tier === 'paid' && paidModels.length === 0)}
        className={cn(
          'mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition',
          !imageDataUrl || loading || (tier === 'paid' && paidModels.length === 0)
            ? 'cursor-not-allowed bg-slate-800 text-slate-500'
            : 'bg-gradient-to-r from-emerald-400 to-indigo-500 text-slate-950 hover:opacity-90 active:scale-[0.99]',
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Анализирую…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Анализировать{tier === 'paid' ? ` · ${paidCost} ток.` : ''}
          </>
        )}
      </button>
    </section>
  );
}
