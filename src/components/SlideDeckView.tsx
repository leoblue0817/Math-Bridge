import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { SectorData } from '../data/sectors';
import { soundEngine } from '../utils/soundEngine';
import { QuestionMedia } from './QuestionMedia';
import { SectorMiniExplorer } from './TeachInteractiveView';

interface SlideDeckViewProps {
  sector: SectorData;
  isCompleted: boolean;
  onComplete: () => void;
  onGoNextTab: () => void;
}

export function SlideDeckView({
  sector,
  isCompleted,
  onComplete,
  onGoNextTab,
}: SlideDeckViewProps) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [revealedBlanks, setRevealedBlanks] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const deckRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const slides = sector.slides;
  const current = slides[slideIdx];

  const prevSlide = useCallback(() => {
    setSlideIdx((i) => {
      if (i > 0) soundEngine.playSlideFlip();
      return Math.max(0, i - 1);
    });
  }, []);

  const nextSlide = useCallback(() => {
    setSlideIdx((i) => {
      if (i < slides.length - 1) soundEngine.playSlideFlip();
      return Math.min(slides.length - 1, i + 1);
    });
  }, [slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      else if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevSlide, nextSlide]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!deckRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await deckRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setIsFullscreen((v) => !v);
    }
  };

  const toggleBlank = (key: string) => {
    soundEngine.playClick();
    setRevealedBlanks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      ref={deckRef}
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartXRef.current === null) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
        const deltaX = endX - touchStartXRef.current;
        touchStartXRef.current = null;
        if (Math.abs(deltaX) < 52) return;
        if (deltaX < 0) nextSlide();
        else prevSlide();
      }}
      className={`flex flex-col justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 md:p-8 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none ${
        isFullscreen ? 'min-h-dvh overflow-y-auto' : 'min-h-[420px] sm:min-h-[460px]'
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold text-sky-700 dark:text-cyan-400">
              {sector.code} · 單元簡報
            </span>
            <span aria-hidden="true">·</span>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="簡報頁碼">
              {slides.map((s, idx) => (
                <button
                  key={s.title}
                  type="button"
                  role="tab"
                  aria-selected={idx === slideIdx}
                  onClick={() => {
                    soundEngine.playSlideFlip();
                    setSlideIdx(idx);
                  }}
                  className={`h-7 min-w-[28px] rounded-lg px-2 font-mono text-xs font-bold transition-all ${
                    idx === slideIdx
                      ? 'bg-sky-600 text-white shadow-sm dark:bg-cyan-500 dark:text-slate-950'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <span className="hidden font-mono tabular-nums sm:inline">
              （支援鍵盤 ← → 換頁）
            </span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500/60 dark:hover:text-white"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>結束全螢幕</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>教室全螢幕投影</span>
              </>
            )}
          </button>
        </div>

        <div key={slideIdx} className="animate-card-pop py-5 md:py-7">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{current.subtitle}</p>
          <h2 className="mt-1.5 text-2xl font-bold text-slate-900 md:text-3xl dark:text-white">
            {current.title}
          </h2>

          <ul className="mt-5 space-y-3 sm:mt-6 sm:space-y-3.5">
            {current.bullets.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800 sm:gap-3.5 sm:px-5 sm:py-3.5 sm:text-base md:text-lg dark:border-slate-800/90 dark:bg-[#080D1A] dark:text-slate-100"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 font-mono text-xs font-bold text-sky-700 tabular-nums dark:bg-cyan-500/15 dark:text-cyan-300">
                  0{i + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {current.diagramId && (
            <div className="mt-5">
              <QuestionMedia diagramId={current.diagramId} />
            </div>
          )}

          {current.hasInteractiveExplorer && (
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-cyan-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                <span>互動實驗室 · 動手拖曳或點擊卡片，親眼驗證數學規律！</span>
              </div>
              <SectorMiniExplorer sectorId={sector.id} />
            </div>
          )}

          {current.blanks && current.blanks.length > 0 && (
            <div className="mt-6 space-y-3 rounded-xl border border-sky-200 bg-sky-50/80 p-4 sm:p-5 dark:border-cyan-500/30 dark:bg-cyan-500/10">
              <div className="text-xs font-semibold text-sky-800 dark:text-cyan-300">
                課堂互動翻牌填空 · 點擊空白卡揭曉講義解答
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {current.blanks.map((blank, bIdx) => {
                  const key = `${slideIdx}-${bIdx}`;
                  const isOpen = Boolean(revealedBlanks[key]);
                  return (
                    <div
                      key={key}
                      className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080D1A]"
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {blank.prompt}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleBlank(key)}
                        className={`inline-flex min-h-[44px] items-center justify-between gap-2 rounded-lg px-3.5 py-2 text-left text-sm font-bold transition-all active:scale-[0.98] ${
                          isOpen
                            ? 'animate-card-pop border border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                            : 'border border-amber-300/70 bg-amber-50/70 text-amber-800 hover:border-amber-400 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300'
                        }`}
                      >
                        <span>{isOpen ? blank.answer : '點擊翻牌揭曉答案'}</span>
                        <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:gap-4 sm:pt-5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={slideIdx === 0}
            onClick={prevSlide}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span>上一頁</span>
          </button>

          <button
            type="button"
            disabled={slideIdx >= slides.length - 1}
            onClick={nextSlide}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
          >
            <span>下一頁</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onComplete();
            }}
            className={`min-h-[44px] flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors sm:flex-initial ${
              isCompleted
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                : 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300'
            }`}
          >
            {isCompleted ? '✓ 簡報已完成（+20分）' : '完成單元簡報（+20分）'}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onGoNextTab();
            }}
            className="min-h-[44px] flex-1 whitespace-nowrap rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 sm:flex-initial dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          >
            前往實戰演練（8 題）→
          </button>
        </div>
      </div>
    </div>
  );
}
