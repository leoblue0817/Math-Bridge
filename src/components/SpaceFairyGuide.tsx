import { useMemo, useState } from 'react';
import { MessageCircle, RefreshCw, Sparkles, X } from 'lucide-react';
import { SectorData, SubLesson } from '../data/sectors';
import { AppMode, TerminalTab, ThemeMode } from '../types';

interface SpaceFairyGuideProps {
  theme: ThemeMode;
  mode: AppMode;
  activeSector: SectorData | null;
  activeTab: TerminalTab;
  activeSubLesson: SubLesson | null;
  lastQuizOutcome: 'correct' | 'wrong' | null;
  totalEarnedStars: number;
  totalSystemStars: number;
}

function FairySprite({ isDark }: { isDark: boolean }) {
  return (
    <svg width="46" height="46" viewBox="0 0 64 64" className="animate-fairy-float shrink-0" aria-hidden="true">
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
  activeSector,
  activeTab,
  activeSubLesson,
  lastQuizOutcome,
  totalEarnedStars,
  totalSystemStars,
}: SpaceFairyGuideProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [tipSeed, setTipSeed] = useState(0);
  const isDark = theme === 'dark';

  const tips = useMemo(() => {
    const list: string[] = [];

    if (lastQuizOutcome === 'wrong') {
      list.push('答錯沒關係！這題已經自動放進「錯題複習艙」，先看詳解抓住關鍵規律，隨時都能再挑戰！');
    } else if (lastQuizOutcome === 'correct') {
      list.push('太準了！答題思路非常清晰，繼續保持這個節奏把小節星星全數點亮吧！');
    }

    if (!activeSector) {
      list.push(
        `歡迎來到星際數學太陽系！目前已收集 ${totalEarnedStars} / ${totalSystemStars} 顆星星，點選軌道上的任意行星就能展開冒險！`
      );
      list.push('滑鼠移到任何行星或右側星球列表上，軌道會自動暫停讓你輕鬆點擊出發。');
      list.push('點選上方「錯題複習艙」可以專攻曾經卡關的題目，把星星補齊喔！');
      if (mode === 'projector') {
        list.push('教室投影模式啟動中：點擊任一星球即可進入全螢幕簡報與課堂即時互動！');
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

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed right-5 bottom-5 z-40 inline-flex items-center gap-2 rounded-2xl border border-sky-300 bg-white/95 px-3.5 py-2 text-xs font-bold text-slate-900 shadow-lg backdrop-blur-md transition-transform hover:scale-105 dark:border-cyan-400/50 dark:bg-[#0D1424]/95 dark:text-white"
        aria-label="展開Blue老師小精靈提示"
      >
        <FairySprite isDark={isDark} />
        <div className="text-left">
          <div className="text-[11px] font-semibold text-sky-700 dark:text-cyan-300">課堂巡遊小精靈</div>
          <div>Blue老師小叮嚀</div>
        </div>
      </button>
    );
  }

  return (
    <aside
      aria-label="Blue老師課堂巡遊小精靈"
      className="fixed right-5 bottom-5 z-40 w-[305px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-sky-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-cyan-500/40 dark:bg-[#0D1424]/95"
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
              {activeSector ? `${activeSector.shortTitle} · 巡航支援` : '太陽系星圖 · 課堂巡遊中'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="收合小精靈提示氣泡"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-200">
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
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-sky-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-cyan-300"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            <span>換一則叮嚀</span>
          </button>
        )}
      </div>
    </aside>
  );
}
