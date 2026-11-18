import { useContext } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Gamepad2,
  Presentation,
  Rocket,
  Star,
} from 'lucide-react';
import { SECTORS, SectorData, getSectorStarStats } from '../data/sectors';
import { AppMode, ProfileRecord, SectorId, TerminalTab, isDarkTheme } from '../types';
import { soundEngine } from '../utils/soundEngine';
import { AudioToggleButtons } from './AudioToggleButtons';
import { PLANET_META } from './PlanetHomeView';
import { ThemeContext } from './ThemeContext';
import { SlideDeckView } from './SlideDeckView';
import { MicroLevelStageView } from './MicroLevelStageView';
import { DotsAndBoxesLab } from './labs/DotsAndBoxesLab';
import { KenKenLab } from './labs/KenKenLab';
import { SymmetryOrigamiLab } from './labs/SymmetryOrigamiLab';
import { NumberlinkLab } from './labs/NumberlinkLab';
import { EquationMatchLab } from './labs/EquationMatchLab';
import { MatchstickClockLab } from './labs/MatchstickClockLab';
import { ExponentRewardLab } from './labs/ExponentRewardLab';
import { VoxelViewsLab } from './labs/VoxelViewsLab';

interface SectorTerminalProps {
  sector: SectorData;
  profile: ProfileRecord;
  mode: AppMode;
  activeTab: TerminalTab;
  activeSubId: string;
  onChangeTab: (tab: TerminalTab) => void;
  onSelectSubId: (subId: string) => void;
  onBackToHome: () => void;
  onSelectSector: (id: SectorId) => void;
  onChangeMode: (mode: AppMode) => void;
  onCompleteSlides: (id: SectorId) => void;
  onAnswerSubQuiz: (
    id: SectorId,
    subId: string,
    qId: string,
    qIdx: number,
    optIdx: number,
    isCorrect: boolean
  ) => void;
  onResetSubQuiz: (id: SectorId, subId: string) => void;
  onCompleteLab: (id: SectorId, bonus: number) => void;
  onFeedback?: (outcome: 'correct' | 'wrong') => void;
}

function PlanetViewportWindow({ sectorId }: { sectorId: SectorId }) {
  const theme = useContext(ThemeContext);
  const meta = PLANET_META[sectorId];
  const isDark = isDarkTheme(theme);

  return (
    <div
      className={`relative hidden h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border sm:flex ${
        isDark
          ? 'border-slate-700/80 bg-[#040814]'
          : 'border-sky-200 bg-gradient-to-b from-sky-500 to-blue-700'
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 112 96" className="h-full w-full">
        <defs>
          <radialGradient id={`vp-grad-${sectorId}`} cx="34%" cy="32%" r="70%">
            <stop offset="0%" stopColor={meta.colorLight} />
            <stop offset="55%" stopColor={meta.color} />
            <stop offset="100%" stopColor={meta.colorDeep} />
          </radialGradient>
          <clipPath id={`vp-clip-${sectorId}`}>
            <circle cx="56" cy="48" r="24" />
          </clipPath>
        </defs>

        {isDark ? (
          <>
            <circle cx="16" cy="18" r="1.2" fill="#E0F2FE" opacity="0.7" />
            <circle cx="94" cy="22" r="1.5" fill="#FDE68A" opacity="0.8" />
            <circle cx="22" cy="78" r="1" fill="#7DD3FC" opacity="0.6" />
            <circle cx="90" cy="74" r="1.2" fill="#E0F2FE" opacity="0.6" />
          </>
        ) : (
          <g className="animate-cloud-drift" style={{ transformOrigin: '56px 48px' }}>
            <ellipse cx="28" cy="20" rx="14" ry="5" fill="#FFFFFF" fillOpacity="0.6" />
            <ellipse cx="86" cy="74" rx="16" ry="5.5" fill="#FFFFFF" fillOpacity="0.5" />
          </g>
        )}

        <circle
          cx="56"
          cy="48"
          r="32"
          fill="none"
          stroke={isDark ? meta.glowColor : '#FFFFFF'}
          strokeOpacity="0.35"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />

        {meta.hasRing && (
          <ellipse
            cx="56"
            cy="48"
            rx="38"
            ry="10"
            transform="rotate(-20 56 48)"
            fill="none"
            stroke={meta.glowColor}
            strokeOpacity="0.85"
            strokeWidth="3"
          />
        )}

        <circle cx="56" cy="48" r="24" fill={`url(#vp-grad-${sectorId})`} stroke={meta.glowColor} strokeWidth="1" />

        <g clipPath={`url(#vp-clip-${sectorId})`}>
          <g className="animate-planet-axial">
            <ellipse cx="50" cy="41" rx="20" ry="4" fill={meta.bandColor} fillOpacity="0.45" />
            <ellipse cx="62" cy="54" rx="16" ry="3.2" fill={meta.bandColor} fillOpacity="0.3" />
          </g>
        </g>

        <g className="animate-orbit-spin" style={{ transformOrigin: '56px 48px', animationDuration: '9s' }}>
          <circle cx="90" cy="48" r="3.6" fill="#F8FAFC" stroke={meta.glowColor} strokeWidth="1" />
        </g>
        <g
          className="animate-orbit-spin"
          style={{ transformOrigin: '56px 48px', animationDuration: '14s', animationDelay: '-5s' }}
        >
          <polygon points="56,12 60,19 56,17 52,19" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.8" />
        </g>
      </svg>
    </div>
  );
}

export function SectorTerminal({
  sector,
  profile,
  mode,
  activeTab,
  activeSubId,
  onChangeTab,
  onSelectSubId,
  onBackToHome,
  onSelectSector,
  onChangeMode,
  onCompleteSlides,
  onAnswerSubQuiz,
  onResetSubQuiz,
  onCompleteLab,
  onFeedback,
}: SectorTerminalProps) {
  const secProgress = profile.sectors[sector.id];
  const starStats = getSectorStarStats(sector, secProgress);
  const progressPct = Math.round((starStats.earned / starStats.total) * 100);
  const meta = PLANET_META[sector.id];

  const currentIdx = SECTORS.findIndex((s) => s.id === sector.id);
  const prevSector = currentIdx > 0 ? SECTORS[currentIdx - 1] : null;
  const nextSector = currentIdx < SECTORS.length - 1 ? SECTORS[currentIdx + 1] : null;

  const questNodes: {
    id: TerminalTab;
    stepNum: string;
    label: string;
    subLabel: string;
    icon: typeof Presentation;
    done: boolean;
  }[] = [
    {
      id: 'slides',
      stepNum: '01',
      label: '單元簡報',
      subLabel: secProgress.slides ? '已過關 ★' : '觀念解碼',
      icon: Presentation,
      done: secProgress.slides,
    },
    {
      id: 'drill',
      stepNum: '02',
      label: '實戰演練',
      subLabel: `8 題 · 已奪 ${starStats.subDone}/${starStats.subTotal} 星`,
      icon: Compass,
      done: starStats.subDone === starStats.subTotal,
    },
    {
      id: 'lab',
      stepNum: '03',
      label: '創意對戰',
      subLabel: secProgress.lab ? '已過關 ★' : sector.creativeName,
      icon: Gamepad2,
      done: secProgress.lab,
    },
  ];

  const renderLab = () => {
    const done = secProgress.lab;
    const finish = (bonus: number) => onCompleteLab(sector.id, bonus);

    switch (sector.id) {
      case 's1':
        return <DotsAndBoxesLab isCompleted={done} onComplete={finish} />;
      case 's2':
        return <KenKenLab isCompleted={done} onComplete={finish} />;
      case 's3':
        return <SymmetryOrigamiLab isCompleted={done} onComplete={finish} />;
      case 's4':
        return <NumberlinkLab isCompleted={done} onComplete={finish} />;
      case 's5':
        return <EquationMatchLab isCompleted={done} onComplete={finish} />;
      case 's6':
        return <MatchstickClockLab isCompleted={done} onComplete={finish} />;
      case 's7':
        return <ExponentRewardLab isCompleted={done} onComplete={finish} />;
      case 's8':
        return <VoxelViewsLab isCompleted={done} onComplete={finish} />;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 pt-3 sm:space-y-6 sm:px-6 sm:pt-6">
      {/* Planet Cockpit Viewport Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5 md:p-6 dark:border-slate-800 dark:bg-[#0D1424]/95 dark:shadow-none">
        <div className="flex flex-col justify-between gap-4 sm:gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <PlanetViewportWindow sectorId={sector.id} />

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-600 dark:text-cyan-300 dark:hover:text-cyan-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>返回星圖</span>
                </button>
                <span aria-hidden="true">/</span>
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {sector.code}
                </span>
                <span aria-hidden="true">·</span>
                <span>{sector.planetFlavor}</span>
                <span aria-hidden="true">·</span>
                <span>探索者：{profile.name}</span>
              </div>

              <h1 className="text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl dark:text-white">
                <span className="block">{sector.planetName}</span>
                <span className="mt-1 block text-base font-bold text-sky-700 md:text-lg dark:text-cyan-300">
                  {sector.topicName}
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">{sector.desc}</p>
            </div>
          </div>

          {/* Right: Star Progress Bar + Mode & Audio Controls */}
          <div className="flex shrink-0 flex-col gap-2.5 lg:items-end">
            <div className="w-full min-w-[230px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-[#080D1A]">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>星球突破推進</span>
                </span>
                <span className="font-mono text-slate-900 tabular-nums dark:text-white">
                  {starStats.earned} / {starStats.total} 顆星（{progressPct}%）
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: starStats.allDone ? '#10B981' : meta.color,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <AudioToggleButtons compact />

              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-[#080D1A]">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onChangeMode('student');
                  }}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    mode === 'student'
                      ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  學生練習
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onChangeMode('projector');
                  }}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    mode === 'projector'
                      ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  教室投影
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Streamlined 3-Station Quest Route Stepper */}
      <div
        role="tablist"
        aria-label="星球闖關航線"
        className="relative rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-[#0D1424]/95 dark:shadow-none"
      >
        {(() => {
          const beamPct = activeTab === 'slides' ? 16 : activeTab === 'drill' ? 50 : 84;
          return (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-[44px] right-20 left-20 hidden h-1.5 rounded-full bg-slate-200 sm:block dark:bg-slate-800"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400 transition-all duration-500"
                style={{ width: `${beamPct}%` }}
              />
              <div
                className="absolute -top-2.5 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-cyan-300 bg-slate-950 text-cyan-300 shadow-md transition-all duration-500"
                style={{ left: `${beamPct}%` }}
              >
                <Rocket className="h-3.5 w-3.5 rotate-45" />
              </div>
            </div>
          );
        })()}

        <div className="relative z-10 grid grid-cols-3 gap-2.5 sm:gap-4">
          {questNodes.map((node) => {
            const Icon = node.icon;
            const isActive = activeTab === node.id;
            return (
              <button
                key={node.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onChangeTab(node.id);
                }}
                className={`group flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
                  isActive
                    ? 'border-sky-500 bg-sky-50/90 shadow-md dark:border-cyan-400 dark:bg-[#111D35] dark:shadow-none'
                    : node.done
                    ? 'border-emerald-300/80 bg-emerald-50/60 hover:border-emerald-400 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                    : 'border-slate-200 bg-slate-50/90 hover:border-slate-300 dark:border-slate-800 dark:bg-[#080D1A] dark:hover:border-slate-700'
                }`}
              >
                <div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-105 ${
                    isActive
                      ? 'border-sky-500 bg-sky-600 text-white dark:border-cyan-300 dark:bg-cyan-500 dark:text-slate-950'
                      : node.done
                      ? 'border-emerald-400 bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950'
                      : 'border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {node.done && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-sm">
                      <CheckCircle2 className="h-3 w-3" aria-label="已完成" />
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 sm:text-sm dark:text-white">
                    <span className="mr-1 font-mono text-sky-700 dark:text-cyan-300">{node.stepNum}</span>
                    {node.label}
                  </div>
                  <div
                    className={`mt-0.5 truncate text-[11px] font-semibold ${
                      node.done
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : isActive
                        ? 'text-sky-700 dark:text-cyan-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {node.subLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Module Viewport */}
      <div>
        {activeTab === 'slides' && (
          <SlideDeckView
            sector={sector}
            isCompleted={secProgress.slides}
            onComplete={() => onCompleteSlides(sector.id)}
            onGoNextTab={() => onChangeTab('drill')}
          />
        )}

        {activeTab === 'drill' && (
          <MicroLevelStageView
            sector={sector}
            progress={secProgress}
            mode={mode}
            activeSubId={activeSubId}
            onSelectSubId={(subId) => onSelectSubId(subId)}
            onAnswerSubQuiz={(subId, qId, qIdx, optIdx, isCorrect) =>
              onAnswerSubQuiz(sector.id, subId, qId, qIdx, optIdx, isCorrect)
            }
            onResetSubQuiz={(subId) => onResetSubQuiz(sector.id, subId)}
            onGoNextTab={() => onChangeTab('lab')}
            onQuizOutcome={onFeedback}
          />
        )}

        {activeTab === 'lab' && renderLab()}
      </div>

      {/* Prev / Next Sector Quick Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-sm dark:border-slate-800">
        {prevSector ? (
          <button
            type="button"
            onClick={() => {
              soundEngine.playWarp();
              onSelectSector(prevSector.id);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-sky-400 sm:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span>上一星球：{prevSector.shortTitle}</span>
          </button>
        ) : (
          <div />
        )}

        {nextSector && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playWarp();
              onSelectSector(nextSector.id);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-sky-400 sm:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400"
          >
            <span>下一星球：{nextSector.shortTitle}</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
