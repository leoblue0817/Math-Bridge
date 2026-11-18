import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  ChevronUp,
  GripHorizontal,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
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

interface OffsetPoint {
  x: number;
  y: number;
}

const FAIRY_OFFSET_STORAGE_KEY = 'math_voyager_fairy_offset_v1';

function loadSavedOffset(): OffsetPoint {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  try {
    const raw = window.localStorage.getItem(FAIRY_OFFSET_STORAGE_KEY);
    if (!raw) return { x: 0, y: 0 };
    const parsed = JSON.parse(raw) as Partial<OffsetPoint>;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number' && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // ignore storage errors
  }
  return { x: 0, y: 0 };
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
  const [offset, setOffset] = useState<OffsetPoint>(loadSavedOffset);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  const isDark = isDarkTheme(theme);

  const clampOffsetToViewport = useCallback((candidate: OffsetPoint): OffsetPoint => {
    if (typeof window === 'undefined' || !containerRef.current) return candidate;
    const rect = containerRef.current.getBoundingClientRect();
    // Base position (without current offset)
    const baseLeft = rect.left - offset.x;
    const baseTop = rect.top - offset.y;
    const margin = 8;
    const minX = margin - baseLeft;
    const maxX = window.innerWidth - margin - (baseLeft + rect.width);
    const minY = margin - baseTop;
    const maxY = window.innerHeight - margin - (baseTop + rect.height);
    return {
      x: Math.round(Math.max(minX, Math.min(maxX, candidate.x))),
      y: Math.round(Math.max(minY, Math.min(maxY, candidate.y))),
    };
  }, [offset.x, offset.y]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAIRY_OFFSET_STORAGE_KEY, JSON.stringify(offset));
    } catch {
      // ignore storage errors
    }
  }, [offset]);

  useEffect(() => {
    const handleResize = () => {
      setOffset((prev) => clampOffsetToViewport(prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampOffsetToViewport]);

  // Re-clamp when switching open/closed card sizes so expanded card doesn't overflow screen edges
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setOffset((prev) => clampOffsetToViewport(prev));
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen, clampOffsetToViewport]);

  const handleDragPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // Do not start drag from interactive action buttons inside the drag header
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-drag="true"]')) return;

    dragSessionRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
      moved: false,
    };
    suppressNextClickRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    if (!session.moved && Math.hypot(dx, dy) < 6) return;

    if (!session.moved) {
      session.moved = true;
      suppressNextClickRef.current = true;
      setIsDragging(true);
    }

    const next = clampOffsetToViewport({
      x: session.originX + dx,
      y: session.originY + dy,
    });
    setOffset(next);
  };

  const handleDragPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragSessionRef.current = null;
    setIsDragging(false);
  };

  const resetPosition = () => {
    setOffset({ x: 0, y: 0 });
  };

  const tips = useMemo(() => {
    const list: string[] = [];

    if (lastQuizOutcome === 'wrong') {
      list.push('答錯沒關係！這題已經自動放進「錯題複習艙」，先看詳解抓住關鍵規律，隨時都能再挑戰！');
    } else if (lastQuizOutcome === 'correct') {
      list.push('太準了！答題思路非常清晰，繼續保持這個節奏把 8 題實戰星星全數點亮吧！');
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
      list.push(`《${activeSector.planetName}》單元簡報支援鍵盤 ← → 換頁，別忘了動手玩內嵌互動實驗並點擊翻牌解答！`);
    } else if (activeTab === 'drill' && activeSubLesson) {
      list.push(activeSubLesson.fairyTip);
    } else if (activeTab === 'lab') {
      list.push(`歡迎來到《${activeSector.creativeName}》！先觀察規則與關鍵位置再出手喔。`);
    }

    activeSector.fairyHints.forEach((h) => list.push(h));

    if (mode === 'projector') {
      list.push('教室投影提示：討論題目時可先請同學口頭發表策略，再按「投影揭曉正解」核對做法。');
    }

    return list;
  }, [activeSector, activeTab, activeSubLesson, lastQuizOutcome, mode, totalEarnedStars, totalSystemStars]);

  const currentTip = tips[tipSeed % tips.length] ?? tips[0];
  // Default resting positions cleanly clear the bottom Star-System Control Dock on both mobile and desktop
  const positionClass = isPlanetHome
    ? 'fixed right-2.5 bottom-[calc(146px+env(safe-area-inset-bottom))] z-30 md:right-5 md:bottom-[104px]'
    : hasMobileBottomNav
    ? 'fixed right-3 bottom-[calc(70px+env(safe-area-inset-bottom))] z-30 md:right-5 md:bottom-5'
    : 'fixed right-3 bottom-4 z-40 md:right-5 md:bottom-5';
  const surfaceClass = isPlanetHome ? 'webgl-hud-surface' : 'glass-hud-corner';
  const hasMoved = offset.x !== 0 || offset.y !== 0;

  return (
    <div
      ref={containerRef}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
      className={`${positionClass} select-none ${isDragging ? 'cursor-grabbing' : ''}`}
    >
      {!isOpen ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={handleDragPointerUp}
            onDoubleClick={resetPosition}
            onClick={() => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                return;
              }
              setIsOpen(true);
            }}
            title="點擊展開提示 · 按住拖曳可移動位置（雙擊復位）"
            aria-label="展開Blue老師小精靈提示，支援按住拖曳移動位置"
            className={`${surfaceClass} inline-flex min-h-[38px] touch-none items-center gap-1.5 rounded-2xl px-2.5 py-1 text-xs font-bold text-slate-900 shadow-md transition-colors hover:border-sky-400/60 dark:text-white dark:hover:border-cyan-400/50 ${
              isDragging ? 'cursor-grabbing ring-2 ring-sky-400/70' : 'cursor-grab'
            }`}
          >
            <GripHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400" aria-hidden="true" />
            <FairySprite isDark={isDark} compact />
            <span className="hidden whitespace-nowrap sm:inline">Blue老師小叮嚀</span>
            <span className="whitespace-nowrap text-[11px] font-extrabold sm:hidden">小叮嚀</span>
            <ChevronUp className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" aria-hidden="true" />
          </button>

          {hasMoved && (
            <button
              type="button"
              onClick={resetPosition}
              title="回到預設位置"
              aria-label="將小叮嚀移回預設位置"
              className={`${surfaceClass} flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 shadow-md hover:text-sky-600 dark:text-slate-300 dark:hover:text-cyan-300`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <aside
          aria-label="Blue老師課堂巡遊小精靈"
          className={`${surfaceClass} w-[305px] max-w-[calc(100vw-2.5rem)] rounded-2xl p-3.5 shadow-xl`}
        >
          <div
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={handleDragPointerUp}
            title="按住頂列可自由拖曳移動位置"
            className={`flex touch-none items-start justify-between gap-2 rounded-xl pb-0.5 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <div className="flex items-center gap-2">
              <FairySprite isDark={isDark} />
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  <span>Blue老師小叮嚀</span>
                  <GripHorizontal className="ml-0.5 h-3 w-3 text-slate-400" aria-hidden="true" />
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {activeSector ? `${activeSector.planetName} · 巡航支援` : '3D 星系探險 · 可拖曳移動'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1" data-no-drag="true">
              {hasMoved && (
                <button
                  type="button"
                  onClick={resetPosition}
                  title="回到預設位置"
                  aria-label="回到預設位置"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-sky-600 sm:h-7 sm:w-7 dark:hover:bg-slate-800 dark:hover:text-cyan-300"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="收合小精靈提示氣泡"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:h-7 sm:w-7 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
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
      )}
    </div>
  );
}
