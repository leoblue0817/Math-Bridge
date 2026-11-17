import { Moon, Sun } from 'lucide-react';
import { HomeViewMode, SectorId, THEME_META, ThemeMode, isDarkTheme } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface TopBarProps {
  activeSectorId: SectorId | null;
  homeView: HomeViewMode;
  theme: ThemeMode;
  wrongCount: number;
  onGoHomePlanet: () => void;
  onGoHomeGrid: () => void;
  onGoBattle: () => void;
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
  onGoBattle,
  onOpenProgress,
  onOpenWrongReview,
  onToggleTheme,
}: TopBarProps) {
  const isOnPlanet = activeSectorId === null && homeView === 'planet';
  const isOnGrid = activeSectorId === null && homeView === 'grid';
  const isOnBattle = activeSectorId === null && homeView === 'battle';
  const themeMeta = THEME_META[theme];
  const isDark = isDarkTheme(theme);

  return (
    <header className="sticky top-1.5 z-30 mx-auto w-full max-w-[1600px] px-2.5 sm:top-2.5 sm:px-5">
      <div className="glass-hud-panel flex items-center justify-between gap-2 rounded-2xl px-3.5 py-1.5 sm:gap-6 sm:px-5 sm:py-2.5">
        {/* Zone 1: Single text element Brand wordmark */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onGoHomePlanet();
          }}
          className="min-h-[38px] shrink-0 whitespace-nowrap text-left text-sm font-extrabold tracking-tight text-slate-900 transition-colors hover:text-sky-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500 sm:text-lg dark:text-slate-50 dark:hover:text-cyan-300 dark:focus-visible:outline-cyan-400"
        >
          星際數學領航艦
        </button>

        {/* Zone 2: 5 concise single-line nav links (Desktop & Tablet) */}
        <nav aria-label="主導覽列" className="hidden items-center gap-6 md:flex">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onGoHomePlanet();
            }}
            className={`shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-semibold transition-colors ${
              isOnPlanet
                ? 'border-sky-600 text-sky-700 dark:border-cyan-400 dark:text-cyan-300'
                : 'border-transparent text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
            }`}
          >
            微縮主星
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onGoHomeGrid();
            }}
            className={`shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-semibold transition-colors ${
              isOnGrid
                ? 'border-sky-600 text-sky-700 dark:border-cyan-400 dark:text-cyan-300'
                : 'border-transparent text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
            }`}
          >
            八區航圖
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onGoBattle();
            }}
            className={`shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-semibold transition-colors ${
              isOnBattle
                ? 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-300'
                : 'border-transparent text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
            }`}
          >
            線上對戰
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenProgress();
            }}
            className="shrink-0 whitespace-nowrap border-b-2 border-transparent py-1 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
          >
            進度與題庫
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenWrongReview();
            }}
            className="shrink-0 whitespace-nowrap border-b-2 border-transparent py-1 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
          >
            錯題複習（{wrongCount}）
          </button>
        </nav>

        {/* Zone 3: Click-to-cycle Day/Night space lighting button OR Return Home */}
        <div className="shrink-0">
          {activeSectorId ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onGoHomePlanet();
              }}
              className="min-h-[38px] shrink-0 whitespace-nowrap rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-900 transition-colors hover:bg-sky-500/25 sm:px-4 sm:text-sm dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200 dark:hover:bg-cyan-500/25"
            >
              <span className="sm:hidden">返回主星</span>
              <span className="hidden sm:inline">返回微縮主星</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onToggleTheme();
              }}
              title="點按切換「星夜極光」／「星晝晨光」星際日夜光源"
              className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-sky-300/70 bg-white/80 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm transition-colors hover:border-sky-500 sm:px-3 dark:border-cyan-400/35 dark:bg-slate-900/75 dark:text-slate-100 dark:hover:border-cyan-300"
            >
              {isDark ? (
                <Moon className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              )}
              <span className="sm:hidden">{themeMeta.shortLabel} ↻</span>
              <span className="hidden sm:inline">光源：{themeMeta.shortLabel} ↻</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
