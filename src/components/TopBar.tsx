import { HomeViewMode, SectorId, ThemeMode } from '../types';

interface TopBarProps {
  activeSectorId: SectorId | null;
  homeView: HomeViewMode;
  theme: ThemeMode;
  wrongCount: number;
  onGoHomePlanet: () => void;
  onGoHomeGrid: () => void;
  onOpenProgress: () => void;
  onOpenWrongReview: () => void;
  onToggleTheme: () => void;
}

export function TopBar({
  activeSectorId,
  homeView,
  theme,
  wrongCount,
  onGoHomePlanet,
  onGoHomeGrid,
  onOpenProgress,
  onOpenWrongReview,
  onToggleTheme,
}: TopBarProps) {
  const isOnPlanet = activeSectorId === null && homeView === 'planet';
  const isOnGrid = activeSectorId === null && homeView === 'grid';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/90 dark:bg-[#070B14]/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single text element Brand wordmark */}
        <button
          type="button"
          onClick={onGoHomePlanet}
          className="shrink-0 whitespace-nowrap text-left text-lg font-bold tracking-tight text-slate-900 transition-colors hover:text-sky-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500 dark:text-slate-50 dark:hover:text-cyan-300 dark:focus-visible:outline-cyan-400"
        >
          星際數學領航艦
        </button>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav aria-label="主導覽列" className="hidden items-center gap-6 md:flex">
          <button
            type="button"
            onClick={onGoHomePlanet}
            className={`shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-medium transition-colors ${
              isOnPlanet
                ? 'border-sky-600 text-sky-700 dark:border-cyan-400 dark:text-cyan-300'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100'
            }`}
          >
            星球首頁
          </button>

          <button
            type="button"
            onClick={onGoHomeGrid}
            className={`shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-medium transition-colors ${
              isOnGrid
                ? 'border-sky-600 text-sky-700 dark:border-cyan-400 dark:text-cyan-300'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100'
            }`}
          >
            八區航圖
          </button>

          <button
            type="button"
            onClick={onOpenProgress}
            className="shrink-0 whitespace-nowrap border-b-2 border-transparent py-1 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100"
          >
            進度管理
          </button>

          <button
            type="button"
            onClick={onOpenWrongReview}
            className="shrink-0 whitespace-nowrap border-b-2 border-transparent py-1 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100"
          >
            錯題複習（{wrongCount}）
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="shrink-0">
          {activeSectorId ? (
            <button
              type="button"
              onClick={onGoHomePlanet}
              className="shrink-0 whitespace-nowrap rounded-lg border border-sky-500/40 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-100 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-200 dark:hover:bg-cyan-500/25"
            >
              返回星球首頁
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleTheme}
              className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
            >
              {theme === 'light' ? '切換動感太空' : '切換明亮星球'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
