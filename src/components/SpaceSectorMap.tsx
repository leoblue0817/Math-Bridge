import { CheckCircle2, Circle, Globe2, Monitor, Rocket, SlidersHorizontal, User } from 'lucide-react';
import { SECTORS, getSectorStarStats, getTotalSystemStars } from '../data/sectors';
import { AppMode, ProfileRecord, SectorId, ThemeMode, isDarkTheme } from '../types';

interface SpaceSectorMapProps {
  profile: ProfileRecord;
  mode: AppMode;
  theme: ThemeMode;
  onSelectSector: (id: SectorId) => void;
  onChangeMode: (mode: AppMode) => void;
  onSwitchToPlanet: () => void;
  onOpenProgressModal: () => void;
}

function SectorOrbitIcon({ sectorId, theme }: { sectorId: SectorId; theme: ThemeMode }) {
  const accentMap: Record<SectorId, string> = {
    s1: '#0284C7',
    s2: '#D97706',
    s3: '#059669',
    s4: '#7C3AED',
    s5: '#E11D48',
    s6: '#0D9488',
    s7: '#EA580C',
    s8: '#2563EB',
  };
  const stroke = accentMap[sectorId];
  const isDark = isDarkTheme(theme);

  return (
    <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true" className="shrink-0">
      <circle
        cx="21"
        cy="21"
        r="18"
        fill={isDark ? 'rgba(15, 23, 42, 0.9)' : '#F1F5F9'}
        stroke={isDark ? '#1E293B' : '#CBD5E1'}
        strokeWidth="1.5"
      />
      <ellipse
        cx="21"
        cy="21"
        rx="15"
        ry="6.5"
        transform="rotate(-22 21 21)"
        fill="none"
        stroke={stroke}
        strokeOpacity="0.55"
        strokeWidth="1.4"
      />
      <circle cx="21" cy="21" r="7.5" fill={stroke} fillOpacity="0.22" stroke={stroke} strokeWidth="1.6" />
      <circle cx="32" cy="15" r="2.2" fill={stroke} />
    </svg>
  );
}

export function SpaceSectorMap({
  profile,
  mode,
  theme,
  onSelectSector,
  onChangeMode,
  onSwitchToPlanet,
  onOpenProgressModal,
}: SpaceSectorMapProps) {
  const totalTasks = getTotalSystemStars(SECTORS);

  const clearedSectorsCount = SECTORS.filter((sec) => {
    return getSectorStarStats(sec, profile.sectors[sec.id]).allDone;
  }).length;

  const completedTasksCount = SECTORS.reduce((acc, sec) => {
    return acc + getSectorStarStats(sec, profile.sectors[sec.id]).earned;
  }, 0);

  const energyPct = Math.round((completedTasksCount / totalTasks) * 100);

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-3 pt-4 sm:space-y-8 sm:px-6 sm:pt-6">
      {/* Cockpit Hero & Classroom Mode Toolbar */}
      <section className="glass-hud-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-2">
            <div className="text-xs font-bold text-sky-700 dark:text-cyan-400">
              小六升國一銜接數學 · 八區航圖總覽（學生：{profile.name}）
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl dark:text-white">
              探索 8 大數學星球，完成簡報、8 題實戰演練與創意對戰
            </h1>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base dark:text-slate-300">
              每個星域都配有互動實驗簡報、基礎＋進階共 8 題實戰演練，以及點格對決、KenKen 算獨、摺摺稱奇、數連 Numberlink、等值連線＆火眼金睛、電子鐘火柴棒、指數獎勵倍增戰與神秘三視圖等創意對決。
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 self-start lg:w-auto lg:items-end">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSwitchToPlanet}
                className="glass-hud-tile inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 hover:border-sky-400 sm:min-h-0 dark:text-slate-100"
              >
                <Globe2 className="h-3.5 w-3.5 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
                <span>返回太陽系星圖</span>
              </button>
              <button
                type="button"
                onClick={onOpenProgressModal}
                className="glass-hud-tile inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 hover:border-sky-400 sm:min-h-0 dark:text-slate-100"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>進度管理</span>
              </button>
            </div>

            <div className="inline-flex w-full rounded-xl border border-white/60 bg-white/50 p-1 backdrop-blur-md sm:w-auto dark:border-slate-700/80 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => onChangeMode('student')}
                className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-colors sm:min-h-0 sm:flex-initial ${
                  mode === 'student'
                    ? 'bg-sky-600 text-white shadow-sm dark:bg-cyan-500 dark:text-slate-950'
                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span>學生自學模式</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('projector')}
                className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-colors sm:min-h-0 sm:flex-initial ${
                  mode === 'projector'
                    ? 'bg-amber-500 text-white shadow-sm dark:bg-amber-400 dark:text-slate-950'
                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                <span>教室投影模式</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Column Cockpit Telemetry Strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/50 pt-6 md:grid-cols-4 dark:border-slate-700/50">
          <div className="glass-hud-tile rounded-2xl px-4 py-3.5">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">已通關星域</div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-slate-900 tabular-nums dark:text-white">
              {clearedSectorsCount} / 8
            </div>
          </div>

          <div className="glass-hud-tile rounded-2xl px-4 py-3.5">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">已收集星星</div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-sky-700 tabular-nums dark:text-cyan-300">
              {completedTasksCount} / {totalTasks}
            </div>
          </div>

          <div className="glass-hud-tile rounded-2xl px-4 py-3.5">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">領航艦推進能源</div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-700 tabular-nums dark:text-emerald-300">
              {energyPct}%
            </div>
          </div>

          <div className="glass-hud-tile rounded-2xl px-4 py-3.5">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">累積探索積分</div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-amber-600 tabular-nums dark:text-amber-300">
              {profile.totalScore} 分
            </div>
          </div>
        </div>
      </section>

      {/* 8-Sector Grid */}
      <section aria-label="8 大數學銜接星域">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">星域任務總覽</h2>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            完成單元簡報、8 題實戰演練與創意對戰即可點亮該區全部 4 顆星星
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {SECTORS.map((sec) => {
            const p = profile.sectors[sec.id];
            const stats = getSectorStarStats(sec, p);
            const allDone = stats.allDone;

            const tasks = [
              { label: '簡報', done: p.slides },
              { label: `實戰${stats.subDone}/${stats.subTotal}`, done: stats.subDone === stats.subTotal },
              { label: '創意', done: p.lab },
            ];

            return (
              <article
                key={sec.id}
                className={`glass-hud-panel iso-node-card flex flex-col justify-between rounded-3xl p-5 ${
                  allDone
                    ? 'border-emerald-400/70'
                    : 'hover:border-sky-400 dark:hover:border-cyan-400/70'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-sky-700 dark:text-cyan-400">
                          {sec.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">★{stats.earned}/{stats.total}</span>
                      </div>
                      <h3 className="mt-1.5 text-lg font-extrabold leading-snug text-slate-900 dark:text-white">
                        <span className="block">{sec.planetName}</span>
                        <span className="mt-0.5 block text-sm font-bold text-sky-700 dark:text-cyan-300">
                          {sec.topicName}
                        </span>
                      </h3>
                    </div>
                    <SectorOrbitIcon sectorId={sec.id} theme={theme} />
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {sec.desc}
                  </p>

                  <div className="mt-3 border-t border-slate-100 pt-3 text-xs font-medium text-amber-700 dark:border-slate-800/80 dark:text-amber-300">
                    創意課程：{sec.creativeName}
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    {tasks.map((t) => (
                      <div
                        key={t.label}
                        className={`flex items-center justify-center gap-1 py-1 font-medium ${
                          t.done
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {t.done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate">{t.label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectSector(sec.id)}
                    className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      allDone
                        ? 'border border-emerald-500/40 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25'
                        : 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400'
                    }`}
                  >
                    <Rocket className="h-4 w-4" aria-hidden="true" />
                    <span>{allDone ? '複習星球任務' : stats.earned > 0 ? '繼續探索星球' : '進入星球任務'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
