import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Disclaimer } from './Disclaimer';

export function Layout() {
  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <Header />
      <Disclaimer />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-2 border-t border-slate-800/60 pt-4 text-center text-xs text-slate-600">
        ChartSense AI · дипломный проект · образовательная демонстрация. ИИ не предсказывает рынок.
      </footer>
    </div>
  );
}
