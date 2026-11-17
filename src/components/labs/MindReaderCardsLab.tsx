import { useMemo, useState } from 'react';
import { CheckCircle2, Eye, RotateCcw, Sparkles, Trophy } from 'lucide-react';

interface MindReaderCardsLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

interface MagicCard {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  powerLabel: string;
  value: number;
  nums: number[];
}

const MAGIC_CARDS: MagicCard[] = [
  {
    id: 'A',
    powerLabel: '2⁰ = 1',
    value: 1,
    nums: [1, 25, 17, 9, 19, 3, 11, 31, 27, 13, 5, 23, 15, 21, 29, 7],
  },
  {
    id: 'B',
    powerLabel: '2¹ = 2',
    value: 2,
    nums: [10, 22, 2, 18, 7, 26, 11, 31, 27, 3, 14, 23, 15, 19, 30, 6],
  },
  {
    id: 'C',
    powerLabel: '2² = 4',
    value: 4,
    nums: [4, 28, 20, 12, 21, 5, 13, 31, 29, 14, 6, 23, 15, 22, 30, 7],
  },
  {
    id: 'D',
    powerLabel: '2³ = 8',
    value: 8,
    nums: [8, 28, 24, 12, 25, 9, 13, 31, 29, 14, 10, 27, 15, 26, 30, 11],
  },
  {
    id: 'E',
    powerLabel: '2⁴ = 16',
    value: 16,
    nums: [16, 28, 24, 20, 25, 17, 21, 31, 29, 22, 18, 27, 23, 26, 30, 19],
  },
];

const CHALLENGE_TARGETS = [13, 21, 27, 19, 29];

export function MindReaderCardsLab({ isCompleted, onComplete }: MindReaderCardsLabProps) {
  const [labMode, setLabMode] = useState<'magic' | 'challenge'>('magic');
  const [selectedCards, setSelectedCards] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);

  const [roundIdx, setRoundIdx] = useState(0);
  const [guessPick, setGuessPick] = useState<Record<string, boolean>>({});
  const [roundFeedback, setRoundFeedback] = useState<'idle' | 'ok' | 'err'>('idle');
  const [clearedCount, setClearedCount] = useState(0);

  const chosenList = useMemo(
    () => MAGIC_CARDS.filter((c) => selectedCards[c.id]),
    [selectedCards]
  );

  const magicSum = useMemo(
    () => chosenList.reduce((acc, c) => acc + c.value, 0),
    [chosenList]
  );

  const targetNum = CHALLENGE_TARGETS[roundIdx % CHALLENGE_TARGETS.length];

  const toggleMagicCard = (id: string) => {
    setRevealed(false);
    setSelectedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetMagic = () => {
    setSelectedCards({});
    setRevealed(false);
  };

  const toggleChallengeCard = (id: string) => {
    setRoundFeedback('idle');
    setGuessPick((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const verifyChallenge = () => {
    const sum = MAGIC_CARDS.reduce((acc, c) => acc + (guessPick[c.id] ? c.value : 0), 0);
    if (sum === targetNum) {
      setRoundFeedback('ok');
      const nextCleared = clearedCount + 1;
      setClearedCount(nextCleared);
      if (nextCleared >= 3 && !isCompleted) {
        onComplete(60);
      }
    } else {
      setRoundFeedback('err');
    }
  };

  const nextChallengeRound = () => {
    setRoundIdx((i) => i + 1);
    setGuessPick({});
    setRoundFeedback('idle');
  };

  const handleRevealMagic = () => {
    setRevealed(true);
    if (magicSum > 0 && !isCompleted) {
      onComplete(60);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm sm:space-y-6 sm:p-6 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 2 指數與二進位密碼
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
            懂你的心－二進位魔術卡（A～E）
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
            在心裡想一個 1～31 的整數，勾選包含該數字的卡片，就能瞬間透過 2 的次方算出答案！
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLabMode('magic')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              labMode === 'magic'
                ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>魔術讀心模式</span>
          </button>
          <button
            type="button"
            onClick={() => setLabMode('challenge')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              labMode === 'challenge'
                ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>逆向配對挑戰</span>
          </button>
        </div>
      </div>

      {labMode === 'magic' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {MAGIC_CARDS.map((card) => {
              const active = Boolean(selectedCards[card.id]);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => toggleMagicCard(card.id)}
                  className={`flex flex-col rounded-xl border p-3.5 text-left transition-colors ${
                    active
                      ? 'border-sky-500 bg-sky-50 dark:border-cyan-400 dark:bg-cyan-500/15'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-[#080D1A] dark:hover:border-slate-600'
                  }`}
                >
                  <div className="mb-2.5 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                    <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                      卡片 {card.id}
                    </span>
                    <span className="text-xs font-semibold text-sky-700 dark:text-cyan-300">
                      {active ? '✓ 有包含' : '點擊選取'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {card.nums.map((num) => (
                      <div
                        key={num}
                        className={`rounded py-1.5 text-center font-mono text-xs font-semibold tabular-nums ${
                          active
                            ? 'bg-sky-200/70 text-sky-950 dark:bg-cyan-500/20 dark:text-cyan-100'
                            : 'bg-white text-slate-800 dark:bg-slate-900/90 dark:text-slate-200'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  {revealed && (
                    <div className="mt-2.5 border-t border-slate-200 pt-2 text-center font-mono text-xs font-semibold text-amber-700 tabular-nums dark:border-slate-800 dark:text-amber-300">
                      代表權重：{card.powerLabel}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-5 md:flex-row md:items-center dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                已選取卡片：{' '}
                <span className="font-mono font-semibold text-sky-700 dark:text-cyan-300">
                  {chosenList.length > 0 ? chosenList.map((c) => c.id).join(' + ') : '尚未選取'}
                </span>
              </div>
              {revealed ? (
                <div className="text-base font-semibold text-slate-900 dark:text-white">
                  你心中想的數字是：
                  <span className="ml-2 font-mono text-3xl font-bold text-amber-600 tabular-nums dark:text-amber-300">
                    {magicSum}
                  </span>
                  {magicSum > 0 && (
                    <span className="mt-1 block font-mono text-sm text-emerald-700 tabular-nums sm:mt-0 sm:ml-3 sm:inline dark:text-emerald-300">
                      （拆解：{chosenList.map((c) => c.value).join(' ＋ ')} ＝ {magicSum}）
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  選好所有包含你心中數字的卡片後，按下「揭曉心中數字」見證奇蹟！
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={resetMagic}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>重選</span>
              </button>
              <button
                type="button"
                onClick={handleRevealMagic}
                disabled={chosenList.length === 0}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span>揭曉心中數字</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-300">
            <div className="mb-1 font-bold text-sky-700 dark:text-cyan-300">
              魔術秘密揭曉（二進位與 2 的次方）
            </div>
            <p>
              仔細觀察每張卡片最小的數字：A 是 <span className="font-mono font-bold text-slate-900 dark:text-white">1 (2⁰)</span>、B 是{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">2 (2¹)</span>、C 是{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">4 (2²)</span>、D 是{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">8 (2³)</span>、E 是{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">16 (2⁴)</span>。任何 1～31 的整數都能唯一寫成這五個 2 的次方相加！
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 p-5 md:flex-row md:items-center dark:border-amber-500/30 dark:bg-amber-500/10">
            <div>
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                逆向二進位挑戰 · 第 {roundIdx + 1} 題 · 已答對 {clearedCount} 題（累積 3 題過關）
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                請選出哪幾張卡片會包含數字{' '}
                <span className="mx-1 font-mono text-3xl text-amber-700 tabular-nums dark:text-amber-300">
                  {targetNum}
                </span>
                ？（提示：把目標拆成 16、8、4、2、1 的和）
              </div>
            </div>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>已完成（+60分）</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {MAGIC_CARDS.map((card) => {
              const picked = Boolean(guessPick[card.id]);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => toggleChallengeCard(card.id)}
                  className={`rounded-xl border p-4 text-center transition-colors ${
                    picked
                      ? 'border-sky-500 bg-sky-50 text-slate-900 dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="font-mono text-xl font-bold">卡片 {card.id}</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-sky-700 tabular-nums dark:text-cyan-300">
                    代表數字 {card.value}（{card.powerLabel}）
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {picked ? '✓ 已放入答案' : '點擊選取'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="text-sm text-slate-700 dark:text-slate-200">
              目前相加總和：{' '}
              <span className="font-mono text-xl font-bold text-sky-700 tabular-nums dark:text-cyan-300">
                {MAGIC_CARDS.reduce((acc, c) => acc + (guessPick[c.id] ? c.value : 0), 0)}
              </span>
              {roundFeedback === 'ok' && (
                <span className="ml-3 font-semibold text-emerald-700 dark:text-emerald-300">
                  ✓ 完全正確！這就是 {targetNum} 的二進位組合！
                </span>
              )}
              {roundFeedback === 'err' && (
                <span className="ml-3 font-semibold text-rose-700 dark:text-rose-300">
                  ✕ 還不對喔，試著先減去最大的 2 的次方看看！
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {roundFeedback === 'ok' ? (
                <button
                  type="button"
                  onClick={nextChallengeRound}
                  className="min-h-[44px] rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950"
                >
                  挑戰下一題 →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={verifyChallenge}
                  className="min-h-[44px] rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950"
                >
                  檢查組合
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
