import { Star, X } from 'lucide-react';
import { SpaceAchievementBadge } from '../data/achievements';
import { SpaceBadgeIcon } from './SpaceBadgeIcon';

export interface CelebrationPayload {
  id: number;
  title: string;
  subtitle: string;
  bonusText: string;
  badge?: SpaceAchievementBadge;
}

interface CelebrationBurstProps {
  celebration: CelebrationPayload | null;
  onDismiss: () => void;
}

export function CelebrationBurst({ celebration, onDismiss }: CelebrationBurstProps) {
  if (!celebration) return null;

  const rays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <div
      key={celebration.id}
      role="status"
      aria-live="polite"
      className="animate-starburst-pop fixed top-20 left-1/2 z-50 w-[400px] max-w-[calc(100vw-2rem)] -translate-x-1/2"
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-amber-400/70 dark:bg-[#0D1628]/95">
        {/* Radial SVG Starburst Glow */}
        <svg
          viewBox="0 0 120 120"
          className="pointer-events-none absolute -top-6 -left-6 h-28 w-28 opacity-40"
          aria-hidden="true"
        >
          {rays.map((deg) => (
            <line
              key={deg}
              x1="60"
              y1="60"
              x2={60 + 52 * Math.cos((deg * Math.PI) / 180)}
              y2={60 + 52 * Math.sin((deg * Math.PI) / 180)}
              stroke={celebration.badge ? celebration.badge.accentHex : '#FBBF24'}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ))}
        </svg>

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {celebration.badge ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <SpaceBadgeIcon badge={celebration.badge} unlocked={true} size="sm" isDark={true} />
              </div>
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-md">
                <Star className="h-6 w-6 fill-current" aria-hidden="true" />
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {celebration.title}
                </span>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-800 tabular-nums dark:bg-amber-400/20 dark:text-amber-300">
                  {celebration.bonusText}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                {celebration.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="關閉過關祝賀通知"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
