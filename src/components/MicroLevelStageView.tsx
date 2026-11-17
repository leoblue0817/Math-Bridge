import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  Flame,
  FlaskConical,
  RotateCcw,
  Star,
} from 'lucide-react';
import { SectorData, getSubLessonQuestions } from '../data/sectors';
import { AppMode, SectorProgress, createEmptySubLevelProgress } from '../types';
import { soundEngine } from '../utils/soundEngine';
import { QuestionMedia } from './QuestionMedia';
import { SectorMiniExplorer } from './TeachInteractiveView';

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
  const activeSubIndex = Math.max(
    0,
    sector.subLessons.findIndex((s) => s.id === activeSubId)
  );
  const activeSub = sector.subLessons[activeSubIndex] ?? sector.subLessons[0];
  const subProgress = progress.subLevels?.[activeSub.id] ?? createEmptySubLevelProgress();
  const questions = getSubLessonQuestions(sector, activeSub);

  const [qPos, setQPos] = useState(0);
  const [projectorReveal, setProjectorReveal] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [comboStreak, setComboStreak] = useState(0);
  const [shakeCard, setShakeCard] = useState(false);

  const getChosenForQuestion = (qId: string, qIdx: number, sp = subProgress) => {
    if (sp.answersById && sp.answersById[qId] !== undefined) {
      return sp.answersById[qId];
    }
    return sp.answers[qIdx];
  };

  // Sync question step when switching sub-lessons
  useEffect(() => {
    const subQuestions = getSubLessonQuestions(sector, activeSub);
    const firstUnanswered = subQuestions.findIndex((item) => {
      const idx = sector.quizzes.findIndex((qq) => qq.id === item.id);
      return getChosenForQuestion(item.id, idx) === undefined;
    });
    if (firstUnanswered >= 0) {
      setQPos(firstUnanswered);
    } else {
      setQPos(subQuestions.length);
    }
    setProjectorReveal(false);
    setComboStreak(0);
    setShakeCard(false);
  }, [activeSub.id]);

  const totalQ = questions.length;
  const isSummaryView = qPos >= totalQ;
  const q = questions[qPos] ?? questions[0];
  const currentQIdx = q ? sector.quizzes.findIndex((item) => item.id === q.id) : 0;
  const chosen = q ? getChosenForQuestion(q.id, currentQIdx) : undefined;
  const hasAnswered = chosen !== undefined;

  const correctCount = questions.filter((item) => {
    const idx = sector.quizzes.findIndex((qq) => qq.id === item.id);
    return getChosenForQuestion(item.id, idx) === item.ans;
  }).length;
  const passThreshold = Math.ceil(totalQ * 0.6);
  const passed = correctCount >= passThreshold;

  const nextSub =
    activeSubIndex < sector.subLessons.length - 1
      ? sector.subLessons[activeSubIndex + 1]
      : null;

  const handleSelectOption = (optIdx: number) => {
    if (hasAnswered || !q) return;
    soundEngine.unlockIfNeeded();
    const isCorrect = optIdx === q.ans;
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
    onAnswerSubQuiz(activeSub.id, q.id, currentQIdx, optIdx, isCorrect);
    onQuizOutcome?.(isCorrect ? 'correct' : 'wrong');
  };

  const handleResetCurrent = () => {
    soundEngine.playClick();
    onResetSubQuiz(activeSub.id);
    setQPos(0);
    setProjectorReveal(false);
    setComboStreak(0);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Lesson Connected Path Stepper */}
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            小節微關卡探索路徑 · 點選各站逐一挑戰 5 題奪星（答對 {passThreshold}/{totalQ} 題即通關）
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowExplorer((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400"
          >
            <FlaskConical className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" aria-hidden="true" />
            <span>本區互動實驗器與酷知識</span>
            {showExplorer ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-8 left-8 hidden h-1 -translate-y-1/2 rounded-full bg-slate-200 sm:block dark:bg-slate-800"
          />
          <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {sector.subLessons.map((sub, idx) => {
              const sp = progress.subLevels?.[sub.id] ?? createEmptySubLevelProgress();
              const subQs = getSubLessonQuestions(sector, sub);
              const answeredInSub = subQs.filter((item) => {
                const qi = sector.quizzes.findIndex((qq) => qq.id === item.id);
                return getChosenForQuestion(item.id, qi, sp) !== undefined;
              }).length;
              const isSelected = sub.id === activeSub.id;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectSubId(sub.id)}
                  className={`relative flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/95 ring-2 ring-sky-400/35 dark:border-cyan-400 dark:bg-[#111E36] dark:ring-cyan-400/25'
                      : sp.completed
                      ? 'border-emerald-300 bg-emerald-50/90 hover:border-emerald-400 dark:border-emerald-500/40 dark:bg-[#0D1F22]'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-[#080D1A] dark:hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-700 dark:text-cyan-300">
                      <span>關卡 {sub.code}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 tabular-nums dark:text-slate-400">
                        {answeredInSub}/{subQs.length} 題
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-white">
                      {idx + 1}. {sub.title}
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] font-semibold ${
                        sp.completed
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : isSelected
                          ? 'text-sky-700 dark:text-cyan-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {sp.completed ? '已奪星通關 ★' : isSelected ? '正在挑戰中' : '點擊進入關卡'}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {sp.completed ? (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-sm">
                        <Star className="h-4 w-4 fill-current" aria-label="已獲得星星" />
                      </span>
                    ) : (
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border font-mono text-xs font-bold ${
                          isSelected
                            ? 'border-sky-500 bg-sky-600 text-white dark:border-cyan-400 dark:bg-cyan-500 dark:text-slate-950'
                            : 'border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Interactive Sandbox + Cool Fact */}
        {showExplorer && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <SectorMiniExplorer sectorId={sector.id} />
            <div className="rounded-xl border border-purple-200 bg-purple-50/90 p-4 dark:border-purple-500/35 dark:bg-purple-500/10">
              <div className="text-xs font-semibold text-purple-800 dark:text-amber-300">
                {sector.coolFactTitle}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {sector.coolFactBody}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Active Micro-Level: Focused Key Summary + Dedicated Interactive 5-Question Quiz Arena */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Left: Micro-Lesson Key Summary */}
        <aside className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 lg:col-span-5 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
          <div className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-2.5 py-1 font-mono text-xs font-bold text-sky-700 dark:bg-cyan-500/15 dark:text-cyan-300">
            <span>小節 {activeSub.code}</span>
            {subProgress.completed && (
              <span className="text-emerald-700 dark:text-emerald-300">· ★ 已通關</span>
            )}
          </div>
          <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
            {activeSub.summaryTitle}
          </h2>

          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {activeSub.summaryItems.map((item, idx) => (
              <li
                key={idx}
                className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-800/80 dark:bg-[#080D1A]"
              >
                <span className="mt-0.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-300">
                  0{idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Right: Micro-Quiz Arena with Combo Streak & Checkpoint Nodes */}
        <section
          className={`rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 lg:col-span-7 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none ${
            shakeCard ? 'animate-wrong-shake border-rose-400 dark:border-rose-500' : ''
          }`}
        >
          {isSummaryView ? (
            <div className="flex h-full flex-col justify-between space-y-5 text-center sm:p-4">
              <div className="space-y-3">
                <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
                  小節 {activeSub.code} · {activeSub.title} 結算
                </div>
                <div className="mx-auto flex max-w-xs items-center justify-center gap-2">
                  {questions.map((item, i) => {
                    const qi = sector.quizzes.findIndex((qq) => qq.id === item.id);
                    const ansPicked = getChosenForQuestion(item.id, qi);
                    const ok = ansPicked === item.ans;
                    return (
                      <span
                        key={item.id}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border font-mono text-xs font-bold ${
                          ok
                            ? 'border-emerald-400 bg-emerald-500 text-white'
                            : 'border-rose-400 bg-rose-500/15 text-rose-600 dark:text-rose-300'
                        }`}
                      >
                        {ok ? '✓' : i + 1}
                      </span>
                    );
                  })}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  答對 {correctCount} / {totalQ} 題
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {passed || subProgress.completed
                    ? '恭喜通關本小節！已點亮本關小節星星，並累積 +30 分小節獎勵！'
                    : `需答對至少 ${passThreshold} 題才能獲得本小節星星，點擊下方重新挑戰一次吧！`}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetCurrent}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>重新練習本小節</span>
                </button>

                {nextSub ? (
                  <button
                    type="button"
                    onClick={() => onSelectSubId(nextSub.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                  >
                    <span>下一小節：{nextSub.code} {nextSub.title}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onGoNextTab();
                    }}
                    className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                  >
                    前往創意對戰 →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Top Question Bar + Live Combo Streak Meter */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-mono font-bold text-sky-700 tabular-nums dark:text-cyan-400">
                    關卡題目 {qPos + 1} / {totalQ}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    已答對{' '}
                    <strong className="font-mono text-amber-600 tabular-nums dark:text-amber-300">
                      {correctCount}
                    </strong>{' '}
                    / {passThreshold} 奪星
                  </span>

                  {comboStreak >= 1 && (
                    <span
                      key={comboStreak}
                      className="animate-combo-pop inline-flex items-center gap-1 rounded-md border border-amber-400/50 bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-extrabold text-amber-800 dark:bg-amber-400/20 dark:text-amber-200"
                    >
                      <Flame className="h-3 w-3 text-orange-500" aria-hidden="true" />
                      <span>連擊 x{comboStreak}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {mode === 'projector' && !hasAnswered && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setProjectorReveal((v) => !v);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{projectorReveal ? '隱藏提示' : '投影揭曉正解'}</span>
                    </button>
                  )}

                  {/* Interactive 5-Checkpoint Mission Dots */}
                  {totalQ > 1 && (
                    <div className="flex items-center gap-1.5">
                      {questions.map((item, i) => {
                        const qi = sector.quizzes.findIndex((qq) => qq.id === item.id);
                        const picked = getChosenForQuestion(item.id, qi);
                        const answeredItem = picked !== undefined;
                        const rightItem = answeredItem && picked === item.ans;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setQPos(i);
                              setProjectorReveal(false);
                            }}
                            title={`切換至第 ${i + 1} 題`}
                            className={`h-9 w-9 rounded-lg font-mono text-xs font-bold tabular-nums transition-transform sm:h-7 sm:w-7 ${
                              i === qPos
                                ? 'scale-105 bg-sky-600 text-white ring-2 ring-sky-400/40 dark:bg-cyan-500 dark:text-slate-950'
                                : answeredItem
                                ? rightItem
                                  ? 'border border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                  : 'border border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                : 'border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                            }`}
                          >
                            {answeredItem ? (rightItem ? '✓' : '✕') : i + 1}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Question Text & Optional Diagram */}
              <div>
                <h3
                  className={`font-bold leading-relaxed text-slate-900 dark:text-white ${
                    mode === 'projector' ? 'text-xl md:text-2xl' : 'text-lg'
                  }`}
                >
                  {q.q}
                </h3>

                {(q.diagramId || q.imageUrl) && (
                  <div className="mt-4">
                    <QuestionMedia diagramId={q.diagramId} imageUrl={q.imageUrl} />
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {q.options.map((opt, idx) => {
                  const isCorrectOpt = idx === q.ans;
                  const isChosen = chosen === idx;

                  let styleClass =
                    'border-slate-200 bg-slate-50 text-slate-800 hover:border-sky-400 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-200 dark:hover:border-cyan-500/60';
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
                      className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${styleClass}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current/25 font-mono text-xs font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Next Step */}
              {(hasAnswered || (mode === 'projector' && projectorReveal)) && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#080D1A]">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {hasAnswered
                      ? chosen === q.ans
                        ? `回答正確（+15分${comboStreak >= 2 ? ` · ${comboStreak} 連擊！` : ''}）`
                        : '答題未中（已為你存入錯題複習艙，看看詳解吧！）'
                      : '教師投影詳解'}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{q.exp}</p>

                  {hasAnswered && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setQPos((p) => p + 1);
                          setProjectorReveal(false);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                      >
                        <span>{qPos + 1 >= totalQ ? '查看小節結算' : '下一題'}</span>
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!hasAnswered && totalQ > 0 && subProgress.completed && (
                <div className="flex items-center justify-end gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>本小節星星已點亮，可隨時重練！</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
