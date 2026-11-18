import { useMemo, useState } from 'react';
import { CheckCircle2, Rocket, Sparkles, TrendingUp } from 'lucide-react';
import { soundEngine } from '../../utils/soundEngine';

interface ExponentRewardLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

interface DecisionChallenge {
  id: string;
  question: string;
  options: string[];
  ans: number;
  exp: string;
}

const CHALLENGES: DecisionChallenge[] = [
  {
    id: 'er-1',
    question:
      '【講義第 7 頁 EX3】Blue 媽媽提供方案 A（第 1 天 1 元，每天變 2 倍）與方案 B（每天固定領 20 元）。如果只領「7 天」，哪個方案總金額較多？多多少元？',
    options: [
      '方案 A 較多，多 13 元',
      '方案 B 較多，多 13 元',
      '方案 B 較多，多 20 元',
      '兩方案剛好一樣多',
    ],
    ans: 1,
    exp: '方案 A 7 天總和＝1+2+4+8+16+32+64＝2⁷−1＝127 元；方案 B＝20×7＝140 元。所以 7 天內方案 B 較多，多 140−127＝13 元！',
  },
  {
    id: 'er-2',
    question:
      '拉動上方模擬器滑桿看看：從「第幾天」結束時，方案 A 的累積總金額正式超越方案 B？',
    options: ['第 6 天', '第 7 天', '第 8 天', '第 9 天'],
    ans: 2,
    exp: '第 7 天結束時 A＝127 元 ＜ B＝140 元；到了第 8 天，A 一口氣領到 128 元，累積達 255 元，正式大幅超越 B 的 160 元！',
  },
  {
    id: 'er-3',
    question:
      '如果媽媽改簽「10 天合約」，第 10 天結束時方案 A 的累積總金額比方案 B 多出幾元？',
    options: ['多 823 元', '多 312 元', '多 511 元', '多 1024 元'],
    ans: 0,
    exp: '方案 A 10 天總和＝1+2+…+512＝2¹⁰−1＝1023 元；方案 B 10 天總和＝20×10＝200 元。相差 1023−200＝823 元！',
  },
];

export function ExponentRewardLab({ isCompleted, onComplete }: ExponentRewardLabProps) {
  const [days, setDays] = useState(7);
  const [picked, setPicked] = useState<Record<string, number>>({});

  const dailyData = useMemo(() => {
    const rows: {
      day: number;
      aDaily: number;
      aCum: number;
      bDaily: number;
      bCum: number;
    }[] = [];
    let aCum = 0;
    let bCum = 0;
    for (let d = 1; d <= 10; d += 1) {
      const aDaily = 2 ** (d - 1);
      const bDaily = 20;
      aCum += aDaily;
      bCum += bDaily;
      rows.push({ day: d, aDaily, aCum, bDaily, bCum });
    }
    return rows;
  }, []);

  const currentRow = dailyData[days - 1];
  const diff = currentRow.aCum - currentRow.bCum;
  const maxCum = dailyData[days - 1].aCum > dailyData[days - 1].bCum ? dailyData[days - 1].aCum : dailyData[days - 1].bCum;

  const correctCount = CHALLENGES.filter((ch) => picked[ch.id] === ch.ans).length;
  const allCleared = correctCount === CHALLENGES.length;

  const handlePick = (ch: DecisionChallenge, idx: number) => {
    if (picked[ch.id] !== undefined) return;
    soundEngine.unlockIfNeeded();
    const ok = idx === ch.ans;
    if (ok) soundEngine.playCorrect(correctCount + 1);
    else soundEngine.playWrong();

    const next = { ...picked, [ch.id]: idx };
    setPicked(next);
    const nextCorrect = CHALLENGES.filter((item) => next[item.id] === item.ans).length;
    if (nextCorrect === CHALLENGES.length && !isCompleted) {
      onComplete(60);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm sm:space-y-6 sm:p-6 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 7 超光速指數奇點
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
            指數獎勵倍增戰（2 的乘方爆發力決策）
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
            互動模擬「每天定額 20 元」與「第 1 天 1 元、每天翻倍（2ⁿ⁻¹）」的累積曲線，完成 3 題關鍵決策分析即通關！
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900">
          <TrendingUp className="h-4 w-4 text-amber-500" aria-hidden="true" />
          <span>決策答對：</span>
          <span className="font-mono text-sky-700 tabular-nums dark:text-cyan-300">
            {correctCount} / {CHALLENGES.length}
          </span>
        </div>
      </div>

      {/* Interactive Day Slider + Live Bar Comparison */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-900 p-4 text-slate-100 sm:p-6 dark:border-slate-800 dark:bg-[#080D1A]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <span className="text-sm font-bold">
              合約天數模擬器：第 <strong className="font-mono text-amber-300">{days}</strong> 天結束
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[1, 4, 7, 8, 10].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setDays(d);
                }}
                className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold ${
                  days === d
                    ? 'bg-cyan-500 text-slate-950'
                    : 'border border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-400'
                }`}
              >
                {d}天
              </button>
            ))}
          </div>
        </div>

        <input
          type="range"
          min={1}
          max={10}
          value={days}
          aria-label="選擇模擬天數"
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
              <span>方案 A：每天倍增（2^{days - 1}）</span>
              <span className="font-mono">當日 +{currentRow.aDaily} 元</span>
            </div>
            <div className="mt-1 font-mono text-3xl font-extrabold text-white tabular-nums">
              {currentRow.aCum} 元
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${Math.max(4, Math.round((currentRow.aCum / maxCum) * 100))}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span>方案 B：每天固定領 20 元</span>
              <span className="font-mono">當日 +20 元</span>
            </div>
            <div className="mt-1 font-mono text-3xl font-extrabold text-white tabular-nums">
              {currentRow.bCum} 元
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-300"
                style={{ width: `${Math.max(4, Math.round((currentRow.bCum / maxCum) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Daily Spark Bars 1..days */}
        <div className="grid grid-cols-5 gap-2 pt-1 sm:grid-cols-10">
          {dailyData.slice(0, days).map((r) => (
            <div
              key={r.day}
              className="rounded-lg border border-slate-800 bg-slate-950/80 p-2 text-center font-mono text-[11px]"
            >
              <div className="text-slate-400">D{r.day}</div>
              <div className="mt-0.5 font-bold text-cyan-300">+{r.aDaily}</div>
              <div className="text-[10px] text-amber-300">累計{r.aCum}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-200">
          <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          {diff > 0
            ? `第 ${days} 天結束時，方案 A 已反超方案 B，多領 ${diff} 元！（公式：2^${days} − 1 ＝ ${currentRow.aCum}）`
            : diff < 0
            ? `第 ${days} 天結束時，方案 B 仍領先方案 A ${Math.abs(diff)} 元！再往後拉看看黃金交叉點！`
            : '雙方剛好平手！'}
        </div>
      </div>

      {/* 3 Interactive Challenges */}
      <div className="space-y-4">
        {CHALLENGES.map((ch, qIdx) => {
          const chosen = picked[ch.id];
          const answered = chosen !== undefined;
          return (
            <div
              key={ch.id}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#080D1A]"
            >
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                挑戰 {qIdx + 1}：{ch.question}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ch.options.map((opt, idx) => {
                  const isRight = idx === ch.ans;
                  const isChosen = chosen === idx;
                  let cls =
                    'border-slate-200 bg-white text-slate-800 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
                  if (answered) {
                    if (isRight) {
                      cls =
                        'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200';
                    } else if (isChosen) {
                      cls =
                        'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200';
                    }
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      data-sfx="custom"
                      disabled={answered}
                      onClick={() => handlePick(ch, idx)}
                      className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${cls}`}
                    >
                      ({String.fromCharCode(65 + idx)}) {opt}
                    </button>
                  );
                })}
              </div>

              {answered && (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  {chosen === ch.ans ? '✓ 答對了！' : '✕ 看看解析：'} {ch.exp}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(allCleared || isCompleted) && (
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>指數獎勵倍增戰過關（＋60分已領取）</span>
        </div>
      )}
    </div>
  );
}
