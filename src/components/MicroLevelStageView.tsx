import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  Flame,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Star,
} from 'lucide-react';
import { QuizQuestion, SectorData, SubLesson, getSubLessonQuestions } from '../data/sectors';
import { AppMode, SectorProgress, createEmptySubLevelProgress } from '../types';
import { soundEngine } from '../utils/soundEngine';
import { QuestionMedia } from './QuestionMedia';

interface MicroLevelStageViewProps {
  sector: SectorData;
  progress: SectorProgress;
  mode: AppMode;
  activeSubId: string;
  onSelectSubId: (subId: string) => void;
  onAnswerSubQuiz: (
    subId: string,
    qId: string,
    qIdx: number,
    optIdx: number,
    isCorrect: boolean
  ) => void;
  onResetSubQuiz: (subId: string) => void;
  onGoNextTab: () => void;
  onQuizOutcome?: (outcome: 'correct' | 'wrong') => void;
}

interface FlattenedQuestion {
  globalIdx: number;
  sub: SubLesson;
  subIdx: number;
  q: QuizQuestion;
  quizIdx: number;
}

export function MicroLevelStageView({
  sector,
  progress,
  mode,
  activeSubId,
  onSelectSubId,
  onAnswerSubQuiz,
  onResetSubQuiz,
  onGoNextTab,
  onQuizOutcome,
}: MicroLevelStageViewProps) {
  const flatQuestions = useMemo<FlattenedQuestion[]>(() => {
    const list: FlattenedQuestion[] = [];
    sector.subLessons.forEach((sub, subIdx) => {
      const qs = getSubLessonQuestions(sector, sub);
      qs.forEach((q) => {
        const quizIdx = sector.quizzes.findIndex((qq) => qq.id === q.id);
        list.push({
          globalIdx: list.length,
          sub,
          subIdx,
          q,
          quizIdx,
        });
      });
    });
    return list;
  }, [sector]);

  const getChosen = (item: FlattenedQuestion) => {
    const sp = progress.subLevels?.[item.sub.id] ?? createEmptySubLevelProgress();
    if (sp.answersById && sp.answersById[item.q.id] !== undefined) {
      return sp.answersById[item.q.id];
    }
    return item.quizIdx >= 0 ? sp.answers[item.quizIdx] : undefined;
  };

  const [qPos, setQPos] = useState<number>(() => {
    const firstOpen = flatQuestions.findIndex((item) => getChosen(item) === undefined);
    return firstOpen >= 0 ? firstOpen : flatQuestions.length;
  });
  const [projectorReveal, setProjectorReveal] = useState(false);
  const [showHintPanel, setShowHintPanel] = useState(false);
  const [comboStreak, setComboStreak] = useState(0);
  const [shakeCard, setShakeCard] = useState(false);

  // Sync activeSubId when stepping across segments
  const currentItem = flatQuestions[qPos];
  useEffect(() => {
    if (currentItem && currentItem.sub.id !== activeSubId) {
      onSelectSubId(currentItem.sub.id);
    }
  }, [currentItem, activeSubId, onSelectSubId]);

  const totalQ = flatQuestions.length;
  const isSummaryView = qPos >= totalQ;
  const activeItem = currentItem ?? flatQuestions[0];

  const totalCorrect = flatQuestions.filter((item) => getChosen(item) === item.q.ans).length;
  const totalAnswered = flatQuestions.filter((item) => getChosen(item) !== undefined).length;

  const chosen = activeItem ? getChosen(activeItem) : undefined;
  const hasAnswered = chosen !== undefined;

  const handleSelectOption = (optIdx: number) => {
    if (hasAnswered || !activeItem) return;
    soundEngine.unlockIfNeeded();
    const isCorrect = optIdx === activeItem.q.ans;
    if (isCorrect) {
      const nextStreak = comboStreak + 1;
      setComboStreak(nextStreak);
      soundEngine.playCorrect(nextStreak);
    } else {
      setComboStreak(0);
      setShakeCard(true);
      soundEngine.playWrong();
      setTimeout(() => setShakeCard(false), 450);
    }
    onAnswerSubQuiz(activeItem.sub.id, activeItem.q.id, activeItem.quizIdx, optIdx, isCorrect);
    onQuizOutcome?.(isCorrect ? 'correct' : 'wrong');
  };

  const handleJumpToSegment = (sub: SubLesson) => {
    soundEngine.playClick();
    onSelectSubId(sub.id);
    const firstIdx = flatQuestions.findIndex((item) => item.sub.id === sub.id);
    if (firstIdx >= 0) {
      setQPos(firstIdx);
      setProjectorReveal(false);
    }
  };

  const handleResetAll = () => {
    soundEngine.playClick();
    sector.subLessons.forEach((sub) => onResetSubQuiz(sub.id));
    setQPos(0);
    setProjectorReveal(false);
    setComboStreak(0);
  };

  return (
    <div className="space-y-5">
      {/* Segmented 8-Question Cockpit Track */}
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            單頁 {totalQ} 題實戰演練 · 基礎核心（1–4 題）與進階應用（5–8 題），每段答對 3/4 題即奪星！
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowHintPanel((v) => !v);
              }}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:border-amber-400 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200"
            >
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{showHintPanel ? '收合觀念提示' : '查看觀念提示'}</span>
              {showHintPanel ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>重練 8 題</span>
            </button>
          </div>
        </div>

        {/* 2-Segment Star Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sector.subLessons.map((sub, idx) => {
            const subItems = flatQuestions.filter((it) => it.sub.id === sub.id);
            const subRight = subItems.filter((it) => getChosen(it) === it.q.ans).length;
            const subAnswered = subItems.filter((it) => getChosen(it) !== undefined).length;
            const sp = progress.subLevels?.[sub.id] ?? createEmptySubLevelProgress();
            const isActiveSeg = !isSummaryView && activeItem?.sub.id === sub.id;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleJumpToSegment(sub)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                  isActiveSeg
                    ? 'border-sky-500 bg-sky-50/95 ring-2 ring-sky-400/35 dark:border-cyan-400 dark:bg-[#111E36] dark:ring-cyan-400/25'
                    : sp.completed
                    ? 'border-emerald-300 bg-emerald-50/85 hover:border-emerald-400 dark:border-emerald-500/40 dark:bg-[#0D1F22]'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-[#080D1A]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-sky-700 dark:text-cyan-300">
                    <span>第 {idx + 1} 段 · {sub.code}</span>
                    <span className="text-slate-400">·</span>
                    <span className="tabular-nums text-slate-600 dark:text-slate-300">
                      答對 {subRight}/{subItems.length}（已作答 {subAnswered}/{subItems.length}）
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-white">
                    {sub.title}
                  </div>
                </div>

                {sp.completed ? (
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-sm">
                    <Star className="h-4 w-4 fill-current" aria-label="已獲得星星" />
                  </span>
                ) : (
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white font-mono text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {idx === 0 ? '1–4' : '5–8'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 8 Clickable Question Jump Nodes */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {flatQuestions.map((item, idx) => {
              const ans = getChosen(item);
              const answered = ans !== undefined;
              const right = answered && ans === item.q.ans;
              const active = !isSummaryView && idx === qPos;
              return (
                <button
                  key={item.q.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setQPos(idx);
                    setProjectorReveal(false);
                  }}
                  title={`第 ${idx + 1} 題（${item.sub.title}）`}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-bold tabular-nums transition-all ${
                    active
                      ? 'scale-105 bg-sky-600 text-white ring-2 ring-sky-400/40 dark:bg-cyan-500 dark:text-slate-950'
                      : answered
                      ? right
                        ? 'border border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'border border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  {answered ? (right ? '✓' : '✕') : idx + 1}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="font-mono text-slate-600 tabular-nums dark:text-slate-300">
              進度 {totalAnswered}/{totalQ} · 正確 {totalCorrect} 題
            </span>
            {comboStreak >= 2 && (
              <span
                key={comboStreak}
                className="animate-combo-pop inline-flex items-center gap-1 rounded-md border border-amber-400/50 bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-extrabold text-amber-800 dark:bg-amber-400/20 dark:text-amber-200"
              >
                <Flame className="h-3 w-3 text-orange-500" aria-hidden="true" />
                <span>{comboStreak} 連擊！</span>
              </span>
            )}
          </div>
        </div>

        {/* Collapsible Instant Concept Hint + Cool Fact */}
        {showHintPanel && activeItem && (
          <div className="animate-card-pop mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2 dark:border-slate-800">
            <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 dark:border-cyan-500/30 dark:bg-cyan-500/10">
              <div className="text-xs font-bold text-sky-800 dark:text-cyan-300">
                {activeItem.sub.summaryTitle}
              </div>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                {activeItem.sub.summaryItems.map((line, i) => (
                  <li key={i}>• {line}</li>
                ))}
              </ul>
              <div className="mt-2.5 rounded-lg bg-white/80 px-3 py-2 text-xs text-amber-800 dark:bg-slate-950/60 dark:text-amber-200">
                <strong>Blue 老師叮嚀：</strong>
                {activeItem.sub.fairyTip}
              </div>
            </div>

            <div className="rounded-xl border border-purple-200 bg-purple-50/85 p-4 dark:border-purple-500/35 dark:bg-purple-500/10">
              <div className="text-xs font-bold text-purple-800 dark:text-amber-300">
                {sector.coolFactTitle}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                {sector.coolFactBody}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Question Arena / Summary */}
      <section
        className={`rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none ${
          shakeCard ? 'animate-wrong-shake border-rose-400 dark:border-rose-500' : ''
        }`}
      >
        {isSummaryView ? (
          <div className="animate-card-pop space-y-5 py-4 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-cyan-300">
              <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>{sector.shortTitle} · {totalQ} 題實戰演練結算</span>
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              總共答對 {totalCorrect} / {totalQ} 題
            </h2>

            <div className="mx-auto flex max-w-md flex-wrap justify-center gap-2">
              {flatQuestions.map((item, i) => {
                const picked = getChosen(item);
                const ok = picked === item.q.ans;
                return (
                  <button
                    key={item.q.id}
                    type="button"
                    onClick={() => setQPos(i)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border font-mono text-xs font-bold ${
                      ok
                        ? 'border-emerald-400 bg-emerald-500 text-white'
                        : 'border-rose-400 bg-rose-500/15 text-rose-600 dark:text-rose-300'
                    }`}
                  >
                    {ok ? '✓' : i + 1}
                  </button>
                );
              })}
            </div>

            <p className="mx-auto max-w-lg text-sm text-slate-600 dark:text-slate-300">
              點擊上方題號可重看詳解！基礎核心與進階應用各答對 3 題以上即可同時點亮兩顆實戰星星。
            </p>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>全部重練</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onGoNextTab();
                }}
                className="min-h-[44px] rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
              >
                前往創意對戰 →
              </button>
            </div>
          </div>
        ) : activeItem ? (
          <div key={activeItem.q.id} className="animate-card-pop space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="rounded-md bg-sky-100 px-2.5 py-1 font-mono text-sky-800 dark:bg-cyan-500/15 dark:text-cyan-300">
                  第 {qPos + 1} / {totalQ} 題 · {activeItem.sub.title}
                </span>
              </div>

              {mode === 'projector' && !hasAnswered && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setProjectorReveal((v) => !v);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{projectorReveal ? '隱藏正解' : '投影揭曉正解'}</span>
                </button>
              )}
            </div>

            <div>
              <h3
                className={`font-bold leading-relaxed text-slate-900 dark:text-white ${
                  mode === 'projector' ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'
                }`}
              >
                {activeItem.q.q}
              </h3>

              {(activeItem.q.diagramId || activeItem.q.imageUrl) && (
                <div className="mt-4">
                  <QuestionMedia diagramId={activeItem.q.diagramId} imageUrl={activeItem.q.imageUrl} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeItem.q.options.map((opt, idx) => {
                const isCorrectOpt = idx === activeItem.q.ans;
                const isChosen = chosen === idx;

                let styleClass =
                  'border-slate-200 bg-slate-50 text-slate-800 hover:border-sky-400 hover:bg-sky-50/40 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-200 dark:hover:border-cyan-500/60';
                if (hasAnswered) {
                  if (isCorrectOpt) {
                    styleClass =
                      'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-200';
                  } else if (isChosen) {
                    styleClass =
                      'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-400 dark:bg-rose-500/15 dark:text-rose-200';
                  } else {
                    styleClass =
                      'border-slate-200 bg-slate-50/50 text-slate-400 dark:border-slate-800/60 dark:bg-[#080D1A]/60 dark:text-slate-500';
                  }
                } else if (mode === 'projector' && projectorReveal && isCorrectOpt) {
                  styleClass =
                    'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-400/15 dark:text-amber-200';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    data-sfx="custom"
                    disabled={hasAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.99] sm:text-base ${styleClass}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/25 font-mono text-xs font-bold">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {(hasAnswered || (mode === 'projector' && projectorReveal)) && (
              <div className="animate-card-pop space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#080D1A]">
                <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                  <span>
                    {hasAnswered
                      ? chosen === activeItem.q.ans
                        ? `✓ 回答正確（+15分${comboStreak >= 2 ? ` · ${comboStreak} 連擊！` : ''}）`
                        : '✕ 答題未中（已存入錯題複習艙，看看詳解吧！）'
                      : '教師投影詳解'}
                  </span>
                  {progress.subLevels?.[activeItem.sub.id]?.completed && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>本段已奪星</span>
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {activeItem.q.exp}
                </p>

                {hasAnswered && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setQPos((p) => p + 1);
                        setProjectorReveal(false);
                      }}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                    >
                      <span>{qPos + 1 >= totalQ ? '查看 8 題結算' : '下一題'}</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
