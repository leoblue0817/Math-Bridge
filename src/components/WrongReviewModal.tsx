import { useMemo, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { SECTORS, SectorData, getSectorQuestionById } from '../data/sectors';
import { ProfileRecord, SectorId } from '../types';
import { soundEngine } from '../utils/soundEngine';
import { QuestionMedia } from './QuestionMedia';

interface WrongReviewModalProps {
  profile: ProfileRecord;
  sectorsSource?: SectorData[];
  onClose: () => void;
  onResolveWrong: (sectorId: SectorId, qId: string, qIdx: number) => void;
}

export function WrongReviewModal({
  profile,
  sectorsSource = SECTORS,
  onClose,
  onResolveWrong,
}: WrongReviewModalProps) {
  const wrongItems = useMemo(() => {
    const list: {
      sectorId: SectorId;
      sectorTitle: string;
      qId: string;
      qIdx: number;
      q: string;
      diagramId?: string;
      imageUrl?: string;
      options: string[];
      ans: number;
      exp: string;
    }[] = [];

    sectorsSource.forEach((sec) => {
      const sp = profile.sectors[sec.id];
      const seenIds = new Set<string>();

      const wIds = sp.wrongQuestionIds ?? [];
      wIds.forEach((qId) => {
        const quiz = getSectorQuestionById(sec, qId);
        if (quiz && !seenIds.has(quiz.id)) {
          seenIds.add(quiz.id);
          const qIdx = sec.quizzes.findIndex((item) => item.id === quiz.id);
          list.push({
            sectorId: sec.id,
            sectorTitle: sec.shortTitle,
            qId: quiz.id,
            qIdx,
            ...quiz,
          });
        }
      });

      const wList = sp.wrongQuestions ?? [];
      wList.forEach((qIdx) => {
        const quiz = sec.quizzes[qIdx];
        if (quiz && !seenIds.has(quiz.id)) {
          seenIds.add(quiz.id);
          list.push({
            sectorId: sec.id,
            sectorTitle: sec.shortTitle,
            qId: quiz.id,
            qIdx,
            ...quiz,
          });
        }
      });
    });

    return list;
  }, [profile, sectorsSource]);

  const [pickedMap, setPickedMap] = useState<Record<string, number>>({});

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wrong-review-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-[#FAF7F2] p-6 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#0D1424] dark:text-slate-100">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 id="wrong-review-title" className="text-xl font-bold">
              錯題複習艙
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              學生：{profile.name} · 只要在這裡重新答對，題目就會自動移出錯題待複習清單（＋5 分）。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="關閉錯題複習"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {wrongItems.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <div className="mt-3 text-base font-bold">目前沒有待複習錯題！</div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                到各主題星球完成「小節微關卡」時，如果有答錯的題目會自動收錄到這裡喔。
              </p>
            </div>
          ) : (
            wrongItems.map((item) => {
              const key = `${item.sectorId}-${item.qId}`;
              const picked = pickedMap[key];
              const answered = picked !== undefined;
              const isCorrect = picked === item.ans;

              return (
                <div
                  key={key}
                  className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#080D1A]"
                >
                  <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
                    {item.sectorTitle} · 題號 {item.qId.toUpperCase()}
                  </div>
                  <div className="text-sm font-semibold leading-relaxed md:text-base">{item.q}</div>

                  {(item.diagramId || item.imageUrl) && (
                    <QuestionMedia diagramId={item.diagramId} imageUrl={item.imageUrl} />
                  )}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {item.options.map((opt, optIdx) => {
                      const rightOpt = optIdx === item.ans;
                      const chosen = picked === optIdx;
                      let cls =
                        'border-slate-200 bg-slate-50 text-slate-800 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
                      if (answered) {
                        if (rightOpt) {
                          cls =
                            'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/20 dark:text-white';
                        } else if (chosen) {
                          cls =
                            'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          data-sfx="custom"
                          onClick={() => {
                            soundEngine.unlockIfNeeded();
                            setPickedMap((prev) => ({ ...prev, [key]: optIdx }));
                            if (rightOpt) {
                              soundEngine.playCorrect(1);
                              setTimeout(() => {
                                onResolveWrong(item.sectorId, item.qId, item.qIdx);
                              }, 900);
                            } else {
                              soundEngine.playWrong();
                            }
                          }}
                          className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium ${cls}`}
                        >
                          <span>
                            ({String.fromCharCode(65 + optIdx)}) {opt}
                          </span>
                          {answered && rightOpt && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          )}
                          {answered && chosen && !rightOpt && (
                            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {answered && (
                    <div
                      className={`rounded-lg p-3 text-xs leading-relaxed ${
                        isCorrect
                          ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200'
                          : 'bg-rose-50 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200'
                      }`}
                    >
                      {isCorrect ? '✓ 答對了！即將從錯題本移出並 ＋5 分。' : `✕ 詳解：${item.exp}`}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
