import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
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

interface JudgeItem {
  id: string;
  tag: string;
  leftExpr: string;
  rightExpr: string;
  isEqual: boolean;
  explanation: string;
}

const WAVES: WaveConfig[] = [
  {
    id: 'w1',
    title: '第一波 · 湊整與連減去括號',
    subtitle: '講義題型 1 & 3：拆數找好朋友，並記住括號前是「－」時，去括號裡面加減互換！',
    pairs: [
      {
        id: 'p1',
        leftExpr: '500 − (180 + 120)',
        rightExpr: '500 − 180 − 120',
        ruleTip: '減去兩數總和＝連減兩數（＝200）',
      },
      {
        id: 'p2',
        leftExpr: '500 − (240 − 40)',
        rightExpr: '500 − 240 + 40',
        ruleTip: '折價少扣 40 要補加回來（＝300）',
      },
      {
        id: 'p3',
        leftExpr: '900 − 238 − 162',
        rightExpr: '900 − (238 + 162)',
        ruleTip: '逆用添括號把 238 與 162 湊整 400（＝500）',
      },
      {
        id: 'p4',
        leftExpr: '125 × 32 × 25',
        rightExpr: '(125 × 8) × (4 × 25)',
        ruleTip: '把 32 拆成 8×4：1000 × 100 ＝ 100,000',
      },
    ],
  },
  {
    id: 'w2',
    title: '第二波 · 乘法分配律雙向術',
    subtitle: '講義題型 2：正向拆成整百加減，或逆向提取公因數（小心孤單項藏著 ×1）！',
    pairs: [
      {
        id: 'p5',
        leftExpr: '103 × 25',
        rightExpr: '(100 + 3) × 25',
        ruleTip: '正向拆開：2500 + 75 ＝ 2,575',
      },
      {
        id: 'p6',
        leftExpr: '99 × 47',
        rightExpr: '(100 − 1) × 47',
        ruleTip: '正向拆開：4700 − 47 ＝ 4,653',
      },
      {
        id: 'p7',
        leftExpr: '37 × 64 + 37 × 36',
        rightExpr: '37 × (64 + 36)',
        ruleTip: '逆向提取公因數 37，湊出 37 × 100 ＝ 3,700',
      },
      {
        id: 'p8',
        leftExpr: '86 × 101 − 86',
        rightExpr: '86 × (101 − 1)',
        ruleTip: '把最後的 86 看成 86×1，提出得 86 × 100 ＝ 8,600',
      },
    ],
  },
  {
    id: 'w3',
    title: '第三波 · 連除去括號與拆數',
    subtitle: '講義題型 4：括號前是「÷」時裡面乘除互換，也能逆用添括號湊整 100！',
    pairs: [
      {
        id: 'p9',
        leftExpr: '360 ÷ (10 × 6)',
        rightExpr: '360 ÷ 10 ÷ 6',
        ruleTip: '除以兩數之積＝連續除以兩數（＝6）',
      },
      {
        id: 'p10',
        leftExpr: '240 ÷ (30 ÷ 3)',
        rightExpr: '240 ÷ 30 × 3',
        ruleTip: '除數縮小 3 倍、份數放大 3 倍（＝24）',
      },
      {
        id: 'p11',
        leftExpr: '6800 ÷ 25 ÷ 4',
        rightExpr: '6800 ÷ (25 × 4)',
        ruleTip: '逆用添括號湊整 100：6800 ÷ 100 ＝ 68',
      },
      {
        id: 'p12',
        leftExpr: '630 ÷ 18',
        rightExpr: '630 ÷ 9 ÷ 2',
        ruleTip: '把 18 拆成 9×2 變連除：70 ÷ 2 ＝ 35',
      },
    ],
  },
];

const JUDGE_ITEMS: JudgeItem[] = [
  {
    id: 'j1',
    tag: '講義 p.7 · 第 1 題',
    leftExpr: '392 ＋ (125 － 43)',
    rightExpr: '392 ＋ 125 － 43',
    isEqual: true,
    explanation: '正確（＝）！括號前面是「＋」號，去掉括號裡面完全不變號。',
  },
  {
    id: 'j2',
    tag: '講義 p.7 · 第 2 題',
    leftExpr: '500 － (180 － 60)',
    rightExpr: '500 － 180 － 60',
    isEqual: false,
    explanation: '不相等（≠）！括號前是「－」號，裡面要變號，應改寫為 500 － 180 ＋ 60 ＝ 380。',
  },
  {
    id: 'j3',
    tag: '講義 p.7 · 第 3 題',
    leftExpr: '600 ÷ (50 ÷ 2)',
    rightExpr: '600 ÷ 50 × 2',
    isEqual: true,
    explanation: '正確（＝）！括號前是「÷」號，裡面的「÷」變「×」，兩邊結果都是 24。',
  },
  {
    id: 'j4',
    tag: '講義 p.7 · 第 4 題',
    leftExpr: '480 ÷ (12 × 4)',
    rightExpr: '480 ÷ 12 × 4',
    isEqual: false,
    explanation: '不相等（≠）！除以兩數之積等於連除，正確應為 480 ÷ 12 ÷ 4 ＝ 10。',
  },
  {
    id: 'j5',
    tag: '講義 p.7 · 第 5 題',
    leftExpr: '750 － 240 － 160',
    rightExpr: '750 － (240 ＋ 160)',
    isEqual: true,
    explanation: '正確（＝）！連減兩數可逆用添括號，把減數先加起來再一次減，兩邊都是 350。',
  },
  {
    id: 'j6',
    tag: '講義 p.7 · 第 6 題',
    leftExpr: '25 × (40 ＋ 4)',
    rightExpr: '25 × 40 ＋ 4',
    isEqual: false,
    explanation: '不相等（≠）！分配律每一項都要乘以 25，不可漏乘後面的 4，應為 25 × 40 ＋ 25 × 4 ＝ 1100。',
  },
  {
    id: 'j7',
    tag: '銜接陷阱 · 結合律',
    leftExpr: '(24 ÷ 6) ÷ 2',
    rightExpr: '24 ÷ (6 ÷ 2)',
    isEqual: false,
    explanation: '不相等（≠）！除法沒有結合律：左邊 4 ÷ 2 ＝ 2，右邊 24 ÷ 3 ＝ 8，順序絕不能亂換！',
  },
  {
    id: 'j8',
    tag: '講義 p.7 · 綜合巧算',
    leftExpr: '125×79 ＋ 125×22 － 125',
    rightExpr: '125 × (79 ＋ 22 － 1)',
    isEqual: true,
    explanation: '正確（＝）！把最後單獨的 125 看成 125×1，逆向提取公因數得 125 × 100 ＝ 12,500！',
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
  const [activeMode, setActiveMode] = useState<'match' | 'judge'>('match');

  // Mode 1: Laser Equation Matching
  const [waveIdx, setWaveIdx] = useState(0);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [waveCleared, setWaveCleared] = useState<Record<string, boolean>>({});
  const [combo, setCombo] = useState(0);
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);
  const [lastTip, setLastTip] = useState<string>(
    '先點擊左欄「原算式」，再射擊右欄對應的「等值改寫算式」發射雷射！'
  );
  const [seedBump, setSeedBump] = useState(3);

  // Mode 2: 火眼金睛 (= vs ≠)
  const [judgeIdx, setJudgeIdx] = useState(0);
  const [judgeAnswers, setJudgeAnswers] = useState<Record<string, boolean>>({});
  const [judgeCombo, setJudgeCombo] = useState(0);
  const [judgeShake, setJudgeShake] = useState(false);

  const wave = WAVES[waveIdx];

  const rightCards = useMemo(() => {
    return shuffleWithOrder(wave.pairs, waveIdx * 5 + seedBump);
  }, [wave, waveIdx, seedBump]);

  const matchAllDone = WAVES.every((w) => waveCleared[w.id]);

  const judgeAnsweredCount = Object.keys(judgeAnswers).length;
  const judgeCorrectCount = JUDGE_ITEMS.filter(
    (item) => judgeAnswers[item.id] !== undefined && judgeAnswers[item.id] === item.isEqual
  ).length;
  const judgeAllCorrect = judgeCorrectCount === JUDGE_ITEMS.length;

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
      setLastTip('算式數值不相等喔！記得口訣「加、乘在前直接去；減、除在前裡面變！」');
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

  const currentJudge = JUDGE_ITEMS[judgeIdx];
  const currentJudgeChoice = judgeAnswers[currentJudge.id];
  const isCurrentJudgeAnswered = currentJudgeChoice !== undefined;
  const isCurrentJudgeRight = isCurrentJudgeAnswered && currentJudgeChoice === currentJudge.isEqual;

  const handleJudgeChoice = (choiceIsEqual: boolean) => {
    if (isCurrentJudgeAnswered) return;
    soundEngine.unlockIfNeeded();

    const isRight = choiceIsEqual === currentJudge.isEqual;
    const nextAnswers = { ...judgeAnswers, [currentJudge.id]: choiceIsEqual };
    setJudgeAnswers(nextAnswers);

    if (isRight) {
      const nextCombo = judgeCombo + 1;
      setJudgeCombo(nextCombo);
      soundEngine.playCorrect(nextCombo);

      const nextCorrectTotal = JUDGE_ITEMS.filter(
        (it) => nextAnswers[it.id] !== undefined && nextAnswers[it.id] === it.isEqual
      ).length;
      if (nextCorrectTotal === JUDGE_ITEMS.length && !isCompleted) {
        onComplete(60);
      }
    } else {
      setJudgeCombo(0);
      soundEngine.playWrong();
      setJudgeShake(true);
      setTimeout(() => setJudgeShake(false), 500);
    }
  };

  const resetJudge = () => {
    soundEngine.playClick();
    setJudgeAnswers({});
    setJudgeIdx(0);
    setJudgeCombo(0);
    setJudgeShake(false);
  };

  const bothCleared = matchAllDone && judgeAllCorrect;

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm sm:space-y-6 sm:p-6 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      {/* Header + Mode Switcher */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 第5星域 巧算光軌星雲（運算法則）
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
            等值算式連線 ＆ 火眼金睛等號快判
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
            自由切換「等值算式連線射擊（3 波講義題組）」或「火眼金睛（＝／≠ 8 題快判）」，任一模式全對即可點亮創意星星！
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="創意對戰模式切換"
            className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-[#080D1A]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'match'}
              onClick={() => {
                soundEngine.playClick();
                setActiveMode('match');
              }}
              className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                activeMode === 'match'
                  ? 'bg-sky-600 text-white shadow-sm dark:bg-cyan-500 dark:text-slate-950'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>模式一：等值連線</span>
              {matchAllDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'judge'}
              onClick={() => {
                soundEngine.playClick();
                setActiveMode('judge');
              }}
              className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                activeMode === 'judge'
                  ? 'bg-amber-500 text-white shadow-sm dark:bg-amber-400 dark:text-slate-950'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>模式二：火眼金睛</span>
              {judgeAllCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200 dark:text-slate-900" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODE 1: LASER EQUATION MATCH ================= */}
      {activeMode === 'match' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
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

            <div className="flex items-center gap-2">
              {combo >= 2 && (
                <span className="animate-combo-pop inline-flex items-center gap-1 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                  <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
                  <span className="font-mono tabular-nums">連擊 x{combo}</span>
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

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-300">
            {wave.subtitle}
          </div>

          {/* Two-Column Laser Matching Arena */}
          <div className="relative rounded-2xl border border-slate-200 bg-slate-900 p-4 sm:p-6 dark:border-slate-800 dark:bg-[#080D1A]">
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

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
              <span>{lastTip}</span>
            </div>

            {matchedIds.length === wave.pairs.length && waveIdx < WAVES.length - 1 && (
              <button
                type="button"
                onClick={() => switchWave(waveIdx + 1)}
                className="min-h-[40px] rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950"
              >
                前往下一波 →
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ================= MODE 2: 火眼金睛 (= vs ≠) ================= */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {JUDGE_ITEMS.map((item, idx) => {
                const ans = judgeAnswers[item.id];
                const answered = ans !== undefined;
                const correct = answered && ans === item.isEqual;
                const active = idx === judgeIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setJudgeIdx(idx);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-bold tabular-nums transition-all ${
                      active
                        ? 'bg-amber-500 text-white shadow-sm dark:bg-amber-400 dark:text-slate-950'
                        : correct
                        ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                        : answered
                        ? 'border border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              {judgeCombo >= 2 && (
                <span className="animate-combo-pop inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
                  <span className="font-mono tabular-nums">連對 x{judgeCombo}</span>
                </span>
              )}
              <span className="font-mono text-slate-600 tabular-nums dark:text-slate-300">
                答對 {judgeCorrectCount} / {JUDGE_ITEMS.length}
              </span>
              <button
                type="button"
                onClick={resetJudge}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>重玩 8 題</span>
              </button>
            </div>
          </div>

          {/* Judge Arena Card */}
          <div
            className={`space-y-5 rounded-2xl border border-slate-200 bg-slate-900 p-4 sm:p-6 dark:border-slate-800 dark:bg-[#080D1A] ${
              judgeShake ? 'animate-wrong-shake' : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <span className="font-semibold text-amber-300">{currentJudge.tag}</span>
              <span className="font-mono tabular-nums">
                第 {judgeIdx + 1} / {JUDGE_ITEMS.length} 題 · 請判斷左右算式是否相等
              </span>
            </div>

            <div className="grid grid-cols-1 items-center gap-3 text-center md:grid-cols-11">
              <div className="rounded-xl border border-cyan-500/40 bg-slate-950/90 px-4 py-5 font-mono text-base font-extrabold text-cyan-200 sm:text-lg md:col-span-5">
                {currentJudge.leftExpr}
              </div>

              <div className="flex items-center justify-center md:col-span-1">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 font-mono text-2xl font-black ${
                    !isCurrentJudgeAnswered
                      ? 'border-amber-400/70 bg-amber-500/15 text-amber-300'
                      : isCurrentJudgeRight
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-rose-400 bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {isCurrentJudgeAnswered ? (currentJudge.isEqual ? '＝' : '≠') : '？'}
                </div>
              </div>

              <div className="rounded-xl border border-amber-400/40 bg-slate-950/90 px-4 py-5 font-mono text-base font-extrabold text-amber-200 sm:text-lg md:col-span-5">
                {currentJudge.rightExpr}
              </div>
            </div>

            {/* Large Equal / Not-Equal Action Buttons */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                data-sfx="custom"
                disabled={isCurrentJudgeAnswered}
                onClick={() => handleJudgeChoice(true)}
                className={`flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-base font-extrabold transition-all active:scale-[0.98] ${
                  isCurrentJudgeAnswered
                    ? currentJudge.isEqual
                      ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                      : currentJudgeChoice === true
                      ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                      : 'border-slate-800 bg-slate-950/50 text-slate-500'
                    : 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                }`}
              >
                <span className="font-mono text-xl">＝</span>
                <span>相等</span>
              </button>

              <button
                type="button"
                data-sfx="custom"
                disabled={isCurrentJudgeAnswered}
                onClick={() => handleJudgeChoice(false)}
                className={`flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-base font-extrabold transition-all active:scale-[0.98] ${
                  isCurrentJudgeAnswered
                    ? !currentJudge.isEqual
                      ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                      : currentJudgeChoice === false
                      ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                      : 'border-slate-800 bg-slate-950/50 text-slate-500'
                    : 'border-rose-500/60 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                }`}
              >
                <span className="font-mono text-xl">≠</span>
                <span>不相等</span>
              </button>
            </div>
          </div>

          {/* Judge Instant Explanation & Next Button */}
          {isCurrentJudgeAnswered && (
            <div
              className={`animate-card-pop flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm ${
                isCurrentJudgeRight
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {isCurrentJudgeRight ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-300" aria-hidden="true" />
                )}
                <span className="leading-relaxed">{currentJudge.explanation}</span>
              </div>

              {judgeIdx < JUDGE_ITEMS.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setJudgeIdx((i) => i + 1);
                  }}
                  className="min-h-[40px] shrink-0 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950"
                >
                  下一題 →
                </button>
              )}
            </div>
          )}

          {judgeAnsweredCount === JUDGE_ITEMS.length && !judgeAllCorrect && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50 p-3.5 text-xs font-semibold text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200">
              <span>
                本次火眼金睛答對 {judgeCorrectCount} / {JUDGE_ITEMS.length} 題！再重玩一次拼滿分即可奪星！
              </span>
              <button
                type="button"
                onClick={resetJudge}
                className="rounded-lg bg-amber-500 px-3 py-1.5 font-bold text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950"
              >
                立即重挑戰
              </button>
            </div>
          )}
        </div>
      )}

      {/* Completion Banner */}
      {(matchAllDone || judgeAllCorrect || isCompleted) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm font-semibold text-emerald-700 dark:border-slate-800 dark:text-emerald-300">
          <div className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>
              {bothCleared
                ? '雙模式全制霸！等值連線與火眼金睛皆已過關（＋60分已領取）'
                : '巧算光軌星雲創意對戰過關（＋60分已領取）'}
            </span>
          </div>
          {bothCleared && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-300">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>雙模式全制霸</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
