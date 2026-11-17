import { useMemo, useState } from 'react';
import { ChevronUp, MessageCircle, RefreshCw, Sparkles, X } from 'lucide-react';
import { SectorData, SubLesson } from '../data/sectors';
import { AppMode, TerminalTab, ThemeMode, isDarkTheme } from '../types';

interface SpaceFairyGuideProps {
  theme: ThemeMode;
  mode: AppMode;
  isPlanetHome?: boolean;
  hasMobileBottomNav?: boolean;
  activeSector: SectorData | null;
  activeTab: TerminalTab;
  activeSubLesson: SubLesson | null;
  lastQuizOutcome: 'correct' | 'wrong' | null;
  totalEarnedStars: number;
  totalSystemStars: number;
}

function FairySprite({ isDark, compact = false }: { isDark: boolean; compact?: boolean }) {
  const size = compact ? 26 : 44;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="animate-fairy-float shrink-0" aria-hidden="true">
      {/* Translucent Star Wings */}
      <path
        d="M 22 30 Q 4 14 8 34 Q 12 44 24 38 Z"
        fill={isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.45)'}
        stroke="#38BDF8"
        strokeWidth="1.5"
      />
      <path
        d="M 42 30 Q 60 14 56 34 Q 52 44 40 38 Z"
        fill={isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.45)'}
        stroke="#38BDF8"
        strokeWidth="1.5"
      />
      {/* Antenna Star */}
      <line x1="32" y1="15" x2="32" y2="7" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="6" r="3" fill="#FBBF24" />
      {/* Space Helmet & Body */}
      <circle cx="32" cy="26" r="12" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" />
      <rect x="24" y="21" width="16" height="9" rx="4.5" fill="#0F172A" />
      {/* Glowing Eyes */}
      <circle cx="28" cy="25.5" r="1.6" fill="#38BDF8" />
      <circle cx="36" cy="25.5" r="1.6" fill="#38BDF8" />
      {/* Cape / Body */}
      <path d="M 23 37 L 41 37 L 44 52 L 20 52 Z" fill="#0284C7" stroke="#7DD3FC" strokeWidth="1.5" />
      {/* Wand */}
      <line x1="43" y1="44" x2="54" y2="33" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" />
      <polygon points="55,28 57,32 61,32 58,35 59,39 55,37 51,39 52,35 49,32 53,32" fill="#FBBF24" />
    </svg>
  );
}

export function SpaceFairyGuide({
  theme,
  mode,
  isPlanetHome = false,
  hasMobileBottomNav = false,
  activeSector,
  activeTab,
  activeSubLesson,
  lastQuizOutcome,
  totalEarnedStars,
  totalSystemStars,
}: SpaceFairyGuideProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (isPlanetHome) return false;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return false;
    return true;
  });
  const [tipSeed, setTipSeed] = useState(0);
  const isDark = isDarkTheme(theme);

  const tips = useMemo(() => {
    const list: string[] = [];

    if (lastQuizOutcome === 'wrong') {
      list.push('答錯沒關係！這題已經自動放進「錯題複習艙」，先看詳解抓住關鍵規律，隨時都能再挑戰！');
    } else if (lastQuizOutcome === 'correct') {
      list.push('太準了！答題思路非常清晰，繼續保持這個節奏把小節星星全數點亮吧！');
    }

    if (!activeSector) {
      list.push(
        `歡迎來到 3D 星際探險星系！目前已收集 ${totalEarnedStars} / ${totalSystemStars} 顆星星，可拖曳 360° 環視宇宙、滾輪縮放，點擊 8 顆公轉星球飛近登陸！`
      );
      list.push('點擊右上角日夜光源按鈕，可以在「星夜極光」與「星晝晨光」之間自由切換宇宙照明！');
      list.push('點選「錯題複習艙」可以專攻曾經卡關的題目，把星星補齊喔！');
      if (mode === 'projector') {
        list.push('教室投影模式啟動中：點擊任一 3D 星球飛近特寫，再按下「立即降落探索」進入全螢幕簡報！');
      }
      return list;
    }

    if (activeTab === 'slides') {
      list.push(`《${activeSector.shortTitle}》單元簡報支援鍵盤 ← → 換頁，別忘了點擊藍框揭曉講義填空解答！`);
    } else if (activeTab === 'warmup') {
      list.push(activeSector.warmup.hint);
    } else if (activeTab === 'micro' && activeSubLesson) {
      list.push(activeSubLesson.fairyTip);
    } else if (activeTab === 'lab') {
      list.push(`歡迎來到《${activeSector.creativeName}》！先觀察對手的必勝格局或關鍵位置再出手喔。`);
    }

    activeSector.fairyHints.forEach((h) => list.push(h));

    if (mode === 'projector') {
      list.push('教室投影提示：討論題目時可先請同學口頭發表策略，再按「投影揭曉正解」核對做法。');
    }

    return list;
  }, [activeSector, activeTab, activeSubLesson, lastQuizOutcome, mode, totalEarnedStars, totalSystemStars]);

  const currentTip = tips[tipSeed % tips.length] ?? tips[0];
  const positionClass = isPlanetHome
    ? 'fixed right-2.5 bottom-[calc(146px+env(safe-area-inset-bottom))] z-30 md:right-4 md:bottom-3.5'
    : hasMobileBottomNav
    ? 'fixed right-3 bottom-[calc(70px+env(safe-area-inset-bottom))] z-30 md:right-5 md:bottom-5'
    : 'fixed right-3 bottom-4 z-40 md:right-5 md:bottom-5';
  const surfaceClass = isPlanetHome ? 'webgl-hud-surface' : 'glass-hud-corner';

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${positionClass} ${surfaceClass} inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl px-3 py-1 text-xs font-bold text-slate-900 shadow-md transition-colors hover:border-sky-400/60 dark:text-white dark:hover:border-cyan-400/50`}
        aria-label="展開Blue老師小精靈提示"
      >
        <FairySprite isDark={isDark} compact />
        <span className="hidden whitespace-nowrap sm:inline">Blue老師小叮嚀</span>
        <span className="whitespace-nowrap text-[11px] font-extrabold sm:hidden">小叮嚀</span>
        <ChevronUp className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" aria-hidden="true" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Blue老師課堂巡遊小精靈"
      className={`${positionClass} ${surfaceClass} w-[305px] max-w-[calc(100vw-2.5rem)] rounded-2xl p-3.5 shadow-xl`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FairySprite isDark={isDark} />
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              <span>Blue老師小叮嚀</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {activeSector ? `${activeSector.shortTitle} · 巡航支援` : '3D 星系探險 · 課堂巡遊中'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="收合小精靈提示氣泡"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:h-7 sm:w-7 sm:rounded-lg dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2.5 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-700/60 dark:bg-slate-950/55 dark:text-slate-200">
        {currentTip}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <MessageCircle className="h-3 w-3" aria-hidden="true" />
          <span>{mode === 'projector' ? '教室投影提示模式' : '個人探索指引'}</span>
        </span>
        {tips.length > 1 && (
          <button
            type="button"
            onClick={() => setTipSeed((s) => s + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1 font-semibold text-sky-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-cyan-300"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            <span>換一則叮嚀</span>
          </button>
        )}
      </div>
    </aside>
  );
}
