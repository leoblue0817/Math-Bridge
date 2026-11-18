import { useMemo, useState } from 'react';
import { CheckCircle2, Flame, RotateCcw, Sparkles, Zap } from 'lucide-react';
import { soundEngine } from '../../utils/soundEngine';

interface EquationMatchLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

interface MatchPair {
  id: string;
  leftExpr: string;
  rightExpr: string;
  ruleTip: string;
}

interface WaveConfig {
  id: string;
  title: string;
  subtitle: string;
  pairs: MatchPair[];
}

const WAVES: WaveConfig[] = [
  {
    id: 'w1',
    title: '第一波 · 加減法去括號與結合律',
    subtitle: '括號前面是「＋」直接拆；括號前面是「－」拆開裡面要變號（＋變－、－變＋）',
    pairs: [
      {
        id: 'p1',
        leftExpr: '350 − (150 + 48)',
        rightExpr: '350 − 150 − 48',
        ruleTip: '連續減去兩數的總和＝先減 150 再減 48（＝152）',
      },
      {
        id: 'p2',
        leftExpr: '420 − (120 − 35)',
        rightExpr: '420 − 120 + 35',
        ruleTip: '少減 35 就要補回來！－( ) 拆括號裡面的減號變加號（＝335）',
      },
      {
        id: 'p3',
        leftExpr: '186 + (14 + 79)',
        rightExpr: '186 + 14 + 79',
        ruleTip: '括號前是加號，直接去掉括號先湊 200 最快（＝279）',
      },
      {
        id: 'p4',
        leftExpr: '600 − 128 − 72',
        rightExpr: '600 − (128 + 72)',
        ruleTip: '連減兩數可以先把減數加起來再一次減（＝400）',
      },
    ],
  },
  {
    id: 'w2',
    title: '第二波 · 乘法分配律奧義',
    subtitle: '把共同乘數提出來，或把 99、102 拆成整百加減來心算！',
    pairs: [
      {
        id: 'p5',
        leftExpr: '25 × (40 + 4)',
        rightExpr: '25 × 40 + 25 × 4',
        ruleTip: '分配律展開：1000 + 100 = 1100',
      },
      {
        id: 'p6',
        leftExpr: '37 × 25 + 37 × 75',
        rightExpr: '37 × (25 + 75)',
        ruleTip: '逆用分配律提出共同的 37，湊整百得 3700',
      },
      {
        id: 'p7',
        leftExpr: '99 × 46',
        rightExpr: '(100 − 1) × 46',
        ruleTip: '把 99 想成 100 少 1：4600 − 46 = 4554',
      },
      {
        id: 'p8',
        leftExpr: '18 × 65 − 18 × 15',
        rightExpr: '18 × (65 − 15)',
        ruleTip: '提出共同乘數 18：18 × 50 = 900',
      },
    ],
  },
  {
    id: 'w3',
    title: '第三波 · 連除與綜合去括號對決',
    subtitle: '注意連除合併時括號內「÷ 要變 ×」，以及除號在括號後的規則',
    pairs: [
      {
        id: 'p9',
        leftExpr: '720 ÷ (9 × 8)',
        rightExpr: '720 ÷ 9 ÷ 8',
        ruleTip: '除以兩數之積＝連續除以這兩個數（＝10）',
      },
      {
        id: 'p10',
        leftExpr: '360 ÷ 12 × 3',
        rightExpr: '360 ÷ (12 ÷ 3)',
        ruleTip: '先除 12 再乘 3，等於除以 (12 ÷ 3)＝除以 4（＝90）',
      },
      {
        id: 'p11',
        leftExpr: '(48 + 36) ÷ 6',
        rightExpr: '48 ÷ 6 + 36 ÷ 6',
        ruleTip: '括號在左邊時，除以 6 可以對被除數分別分配（＝14）',
      },
      {
        id: 'p12',
        leftExpr: '125 × 32 × 25',
        rightExpr: '(125 × 8) × (4 × 25)',
        ruleTip: '把 32 拆成 8×4：湊出 1000 × 100 = 100000！',
      },
    ],
  },
];

function shuffleWithOrder<T>(arr: T[], seedOffset: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = (i * 7 + seedOffset) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function EquationMatchLab({ isCompleted, onComplete }: EquationMatchLabProps) {
  const [waveIdx, setWaveIdx] = useState(0);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [waveCleared, setWaveCleared] = useState<Record<string, boolean>>({});
  const [combo, setCombo] = useState(0);
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);
  const [lastTip, setLastTip] = useState<string>('先點擊左欄「含括號／原算式」，再射擊右欄對應的「等值算式」發射雷射！');
  const [seedBump, setSeedBump] = useState(3);

  const wave = WAVES[waveIdx];

  const rightCards = useMemo(() => {
    return shuffleWithOrder(wave.pairs, waveIdx * 5 + seedBump);
  }, [wave, waveIdx, seedBump]);

  const handleSelectLeft = (id: string) => {
    if (matchedIds.includes(id)) return;
    soundEngine.playClick();
    setWrongPair(null);
    setSelectedLeft((prev) => (prev === id ? null : id));
  };

  const handleShootRight = (rightId: string) => {
    if (matchedIds.includes(rightId) || !selectedLeft) return;
    soundEngine.unlockIfNeeded();

    if (selectedLeft === rightId) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      soundEngine.playCorrect(nextCombo);
      const pair = wave.pairs.find((p) => p.id === rightId);
      if (pair) setLastTip(`雷射命中！${pair.leftExpr} ＝ ${pair.rightExpr}（${pair.ruleTip}）`);

      const nextMatched = [...matchedIds, rightId];
      setMatchedIds(nextMatched);
      setSelectedLeft(null);
      setWrongPair(null);

      if (nextMatched.length === wave.pairs.length) {
        const nextWaveMap = { ...waveCleared, [wave.id]: true };
        setWaveCleared(nextWaveMap);
        const allWavesDone = WAVES.every((w) => nextWaveMap[w.id]);
        if (allWavesDone && !isCompleted) {
          onComplete(60);
        }
      }
    } else {
      setCombo(0);
      soundEngine.playWrong();
      setWrongPair({ left: selectedLeft, right: rightId });
      setLastTip('算式數值不相等喔！注意括號前是加、減、乘還是除號，再核對一次！');
      setTimeout(() => setWrongPair(null), 550);
    }
  };

  const switchWave = (idx: number) => {
    soundEngine.playClick();
    setWaveIdx(idx);
    setSelectedLeft(null);
    setMatchedIds([]);
    setWrongPair(null);
    setSeedBump((s) => s + 1);
    setLastTip('請選取左側算式並與右側等值算式進行雷射配對！');
  };

  const allDone = WAVES.every((w) => waveCleared[w.id]);

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm sm:space-y-6 sm:p-6 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 5 奧術拆括號星雲
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
            等值算式連線射擊（無負數 · 小六心算對決）
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
            配對含有括號與去括號後數值完全相等的算式，完成三波算式射擊即可奪下星星！
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {combo >= 2 && (
            <span className="animate-combo-pop inline-flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-100 px-3 py-1.5 font-mono text-xs font-extrabold text-amber-800 dark:bg-amber-400/20 dark:text-amber-200">
              <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
              <span>雷射連擊 x{combo}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => switchWave(waveIdx)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>重置本波</span>
          </button>
        </div>
      </div>

      {/* Wave Tabs */}
      <div className="flex flex-wrap gap-2">
        {WAVES.map((w, idx) => (
          <button
            key={w.id}
            type="button"
            onClick={() => switchWave(idx)}
            className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold ${
              idx === waveIdx
                ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                : waveCleared[w.id]
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {waveCleared[w.id] ? '✓ ' : ''}
            {w.title}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-300">
        {wave.subtitle}
      </div>

      {/* Two-Column Laser Matching Arena */}
      <div className="relative rounded-2xl border border-slate-200 bg-slate-900 p-4 sm:p-6 dark:border-slate-800 dark:bg-[#080D1A]">
        {/* SVG Laser Beams showing matched rows */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
        >
          {matchedIds.map((id) => {
            const lIdx = wave.pairs.findIndex((p) => p.id === id);
            const rIdx = rightCards.findIndex((p) => p.id === id);
            if (lIdx < 0 || rIdx < 0) return null;
            const y1 = 15 + lIdx * 23;
            const y2 = 15 + rIdx * 23;
            return (
              <g key={`beam-${id}`}>
                <line
                  x1="44"
                  y1={y1}
                  x2="56"
                  y2={y2}
                  stroke="#22D3EE"
                  strokeWidth="1.2"
                  strokeDasharray="2 1"
                  opacity="0.85"
                />
                <circle cx="44" cy={y1} r="1.4" fill="#34D399" />
                <circle cx="56" cy={y2} r="1.4" fill="#34D399" />
              </g>
            );
          })}
        </svg>

        <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-12">
          {/* Left Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-cyan-300">左側核心算式（先點選）</div>
            {wave.pairs.map((pair) => {
              const isMatched = matchedIds.includes(pair.id);
              const isSelected = selectedLeft === pair.id;
              const isWrong = wrongPair?.left === pair.id;
              return (
                <button
                  key={pair.id}
                  type="button"
                  data-sfx="custom"
                  disabled={isMatched}
                  onClick={() => handleSelectLeft(pair.id)}
                  className={`flex min-h-[52px] w-full items-center justify-between rounded-xl border px-4 py-3 font-mono text-sm font-bold transition-all sm:text-base ${
                    isMatched
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                      : isWrong
                      ? 'animate-wrong-shake border-rose-500 bg-rose-500/20 text-rose-200'
                      : isSelected
                      ? 'scale-[1.02] border-cyan-400 bg-cyan-500/25 text-white ring-2 ring-cyan-400/50'
                      : 'border-slate-700 bg-slate-950/90 text-slate-100 hover:border-cyan-400/70'
                  }`}
                >
                  <span>{pair.leftExpr}</span>
                  <Zap
                    className={`h-4 w-4 shrink-0 ${
                      isMatched ? 'text-emerald-300' : isSelected ? 'text-cyan-300' : 'text-slate-500'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-amber-300">右側等值目標（點擊射擊配對）</div>
            {rightCards.map((pair) => {
              const isMatched = matchedIds.includes(pair.id);
              const isWrong = wrongPair?.right === pair.id;
              return (
                <button
                  key={`r-${pair.id}`}
                  type="button"
                  data-sfx="custom"
                  disabled={isMatched || !selectedLeft}
                  onClick={() => handleShootRight(pair.id)}
                  className={`flex min-h-[52px] w-full items-center justify-between rounded-xl border px-4 py-3 font-mono text-sm font-bold transition-all sm:text-base ${
                    isMatched
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                      : isWrong
                      ? 'animate-wrong-shake border-rose-500 bg-rose-500/20 text-rose-200'
                      : selectedLeft
                      ? 'cursor-crosshair border-amber-400/60 bg-slate-950/90 text-amber-100 hover:border-amber-300 hover:bg-amber-500/15'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400'
                  }`}
                >
                  <span>{pair.rightExpr}</span>
                  {isMatched && <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feedback & Wave Progression */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-[#080D1A]">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          <span>{lastTip}</span>
        </div>

        {matchedIds.length === wave.pairs.length && waveIdx < WAVES.length - 1 && (
          <button
            type="button"
            onClick={() => switchWave(waveIdx + 1)}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950"
          >
            前往下一波 →
          </button>
        )}
      </div>

      {(allDone || isCompleted) && (
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>等值算式連線射擊過關（＋60分已領取）</span>
        </div>
      )}
    </div>
  );
}
