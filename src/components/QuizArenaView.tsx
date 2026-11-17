import { useState } from 'react';
import { CheckCircle2, Eye, RotateCcw, XCircle } from 'lucide-react';
import { SectorData } from '../data/sectors';
import { AppMode, SectorProgress } from '../types';
import { QuestionMedia } from './QuestionMedia';

interface QuizArenaViewProps {
  sector: SectorData;
  progress: SectorProgress;
  mode: AppMode;
  onAnswer: (qIdx: number, optIdx: number, isCorrect: boolean) => void;
  onNext: () => void;
  onReset: () => void;
  onGoNextTab: () => void;
}

export function QuizArenaView({
  sector,
  progress,
  mode,
  onAnswer,
  onNext,
  onReset,
  onGoNextTab,
}: QuizArenaViewProps) {
  const [projectorReveal, setProjectorReveal] = useState(false);

  const passThreshold = Math.ceil(sector.quizzes.length * 0.6);
  const currentQ = sector.quizzes[progress.quizIdx];
  const selectedOpt = currentQ ? progress.answers[progress.quizIdx] : undefined;
  const hasAnswered = selectedOpt !== undefined;

  if (progress.quizIdx >= sector.quizzes.length) {
    const passed = progress.quizScore >= passThreshold;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${
            passed
              ? 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300'
              : 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
          }`}
        >
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {passed ? '題目演練過關！' : '再練習一次衝過及格門檻吧'}
        </h2>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
          本次答對{' '}
          <span className="font-mono font-bold text-sky-700 tabular-nums dark:text-cyan-300">
            {progress.quizScore} / {sector.quizzes.length}
          </span>{' '}
          題（及格門檻 {passThreshold} 題）
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setProjectorReveal(false);
              onReset();
            }}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>重新演練本區題庫</span>
          </button>
          <button
            type="button"
            onClick={onGoNextTab}
            className="whitespace-nowrap rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          >
            前往創意對戰 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 text-sm dark:border-slate-800">
        <span className="font-mono font-semibold text-sky-700 tabular-nums dark:text-cyan-300">
          第 {progress.quizIdx + 1} / {sector.quizzes.length} 題
        </span>
        <span className="font-mono text-slate-600 tabular-nums dark:text-slate-300">
          {mode === 'projector'
            ? '課堂投影模式（可隱藏解析逐步講解）'
            : `目前答對：${progress.quizScore} 題（達 ${passThreshold} 題過關）`}
        </span>
      </div>

      {/* 題目與幾何/立體配圖 */}
      <div className="grid grid-cols-1 items-center gap-6 rounded-xl border border-slate-200 bg-slate-50 p-5 lg:grid-cols-12 dark:border-slate-800 dark:bg-[#080D1A]">
        <div
          className={`${
            currentQ.diagramId || currentQ.imageUrl ? 'lg:col-span-7' : 'lg:col-span-12'
          } text-base leading-relaxed font-medium text-slate-900 md:text-lg dark:text-white`}
        >
          {currentQ.q}
        </div>
        {(currentQ.diagramId || currentQ.imageUrl) && (
          <div className="lg:col-span-5">
            <QuestionMedia diagramId={currentQ.diagramId} imageUrl={currentQ.imageUrl} />
          </div>
        )}
      </div>

      {/* 選項 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {currentQ.options.map((opt, optIdx) => {
          const isCorrect = optIdx === currentQ.ans;
          const isPicked = selectedOpt === optIdx;
          const showResult = hasAnswered || (mode === 'projector' && projectorReveal);

          let cls =
            'border-slate-200 bg-white text-slate-900 hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:bg-[#080D1A] dark:text-slate-100 dark:hover:border-cyan-400/70 dark:hover:bg-cyan-500/10';
          if (showResult) {
            if (isCorrect) {
              cls =
                'border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-white';
            } else if (isPicked) {
              cls =
                'border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-400 dark:bg-rose-500/20 dark:text-rose-100';
            } else {
              cls =
                'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-500';
            }
          }

          return (
            <button
              key={optIdx}
              type="button"
              data-sfx="custom"
              disabled={hasAnswered}
              onClick={() => onAnswer(progress.quizIdx, optIdx, isCorrect)}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors md:text-base ${cls}`}
            >
              <span>
                <span className="mr-2 font-mono font-bold text-slate-500 dark:text-slate-400">
                  ({String.fromCharCode(65 + optIdx)})
                </span>
                {opt}
              </span>
              {showResult && isCorrect && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              )}
              {showResult && isPicked && !isCorrect && (
                <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {mode === 'projector' && !hasAnswered && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setProjectorReveal((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>{projectorReveal ? '隱藏正解與解析' : '投影揭曉正解與詳解'}</span>
          </button>
        </div>
      )}

      {(hasAnswered || (mode === 'projector' && projectorReveal)) && (
        <div
          className={`rounded-xl border p-4 text-sm leading-relaxed ${
            selectedOpt === currentQ.ans || (mode === 'projector' && projectorReveal && !hasAnswered)
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100'
              : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100'
          }`}
        >
          <div className="mb-1 font-bold">
            {hasAnswered
              ? selectedOpt === currentQ.ans
                ? '✓ 答對了（＋15 分）'
                : '✕ 答錯了（已自動收錄至錯題複習艙），請看詳解'
              : '題目詳解'}
          </div>
          <p>{currentQ.exp}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => {
            setProjectorReveal(false);
            onReset();
          }}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          重新作答本區題庫
        </button>

        {(hasAnswered || mode === 'projector') && (
          <button
            type="button"
            onClick={() => {
              setProjectorReveal(false);
              onNext();
            }}
            className="whitespace-nowrap rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          >
            {progress.quizIdx + 1 >= sector.quizzes.length ? '查看演練總結 →' : '下一題 →'}
          </button>
        )}
      </div>
    </div>
  );
}
