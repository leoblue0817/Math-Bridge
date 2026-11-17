import { BookMarked, Globe2, LayoutGrid, SlidersHorizontal, Swords } from 'lucide-react';
import { HomeViewMode, SectorId } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface MobileBottomNavProps {
  activeSectorId: SectorId | null;
  homeView: HomeViewMode;
  wrongCount: number;
  isPlanetHome: boolean;
  onGoHomePlanet: () => void;
  onGoHomeGrid: () => void;
  onGoBattle: () => void;
  onOpenProgress: () => void;
  onOpenWrongReview: () => void;
}

export function MobileBottomNav({
  activeSectorId,
  homeView,
  wrongCount,
  isPlanetHome,
  onGoHomePlanet,
  onGoHomeGrid,
  onGoBattle,
  onOpenProgress,
  onOpenWrongReview,
}: MobileBottomNavProps) {
  const isOnPlanet = activeSectorId === null && homeView === 'planet';
  const isOnGrid = activeSectorId === null && homeView === 'grid';
  const isOnBattle = activeSectorId === null && homeView === 'battle';

  const surfaceClass = isPlanetHome ? 'webgl-hud-surface' : 'glass-hud-panel';

  return (
    <nav
      aria-label="手機版底部主導覽列"
      className={`pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 md:hidden dark:border-cyan-500/20 ${surfaceClass}`}
    >
      <div className="mx-auto grid h-14 max-w-md grid-cols-5 items-center px-1">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onGoHomePlanet();
          }}
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-bold transition-colors ${
            isOnPlanet
              ? 'text-sky-600 dark:text-cyan-300'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Globe2 className="h-5 w-5" aria-hidden="true" />
          <span>星系</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onGoHomeGrid();
          }}
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-bold transition-colors ${
            isOnGrid
              ? 'text-sky-600 dark:text-cyan-300'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          <span>航圖</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onGoBattle();
          }}
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-bold transition-colors ${
            isOnBattle
              ? 'text-amber-600 dark:text-amber-300'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Swords className="h-5 w-5" aria-hidden="true" />
          <span>搶答</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onOpenProgress();
          }}
          className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-colors dark:text-slate-400"
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          <span>題庫</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onOpenWrongReview();
          }}
          className="relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-colors dark:text-slate-400"
        >
          <div className="relative">
            <BookMarked className="h-5 w-5" aria-hidden="true" />
            {wrongCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[10px] font-extrabold text-white">
                {wrongCount > 99 ? '99+' : wrongCount}
              </span>
            )}
          </div>
          <span>錯題</span>
        </button>
      </div>
    </nav>
  );
}
