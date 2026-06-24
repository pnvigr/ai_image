import { AlertTriangle } from 'lucide-react';

export function Disclaimer() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <p>
        <span className="font-semibold text-amber-300">Образовательный проект.</span> ИИ не предсказывает
        рынок: любой «прогноз» — это разбор картинки, а не гарантия. Реальный винрейт определяется рынком и
        условиями платформы. Не является финансовой рекомендацией.
      </p>
    </div>
  );
}
