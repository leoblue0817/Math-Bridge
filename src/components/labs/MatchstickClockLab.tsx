import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, RotateCcw, Sparkles } from 'lucide-react';
import { soundEngine } from '../../utils/soundEngine';

interface MatchstickClockLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

// 7-segment display map: a(top), b(top-right), c(bottom-right), d(bottom), e(bottom-left), f(top-left), g(mid)
const DIGIT_SEGMENTS: Record<string, boolean[]> = {
  '0': [true, true, true, true, true, true, false],
  '1': [false, true, true, false, false, false, false],
  '2': [true, true, false, true, true, false, true],
  '3': [true, true, true, true, false, false, true],
  '4': [false, true, true, false, false, true, true],
  '5': [true, false, true, true, false, true, true],
  '6': [true, false, true, true, true, true, true],
  '7': [true, true, true, false, false, false, false],
  '8': [true, true, true, true, true, true, true],
  '9': [true, true, true, true, false, true, true],
};

function SevenSegDigit({
  segs,
  interactive = false,
  onToggleSeg,
}: {
  segs: boolean[];
  interactive?: boolean;
  onToggleSeg?: (segIdx: number) => void;
}) {
  const coords: { x1: number; y1: number; x2: number; y2: number }[] = [
    { x1: 12, y1: 8, x2: 44, y2: 8 }, // a top
    { x1: 46, y1: 10, x2: 46, y2: 42 }, // b top-right
    { x1: 46, y1: 48, x2: 46, y2: 80 }, // c bottom-right
    { x1: 12, y1: 82, x2: 44, y2: 82 }, // d bottom
    { x1: 10, y1: 48, x2: 10, y2: 80 }, // e bottom-left
    { x1: 10, y1: 10, x2: 10, y2: 42 }, // f top-left
    { x1: 12, y1: 45, x2: 44, y2: 45 }, // g mid
  ];

  return (
    <svg width="56" height="90" viewBox="0 0 56 90" className="shrink-0">
      {coords.map((pt, idx) => {
        const on = segs[idx];
        return (
          <g
            key={idx}
            onClick={() => interactive && onToggleSeg?.(idx)}
            className={interactive ? 'cursor-pointer' : ''}
          >
            {/* Invisible hit area */}
            {interactive && (
              <line
                x1={pt.x1}
                y1={pt.y1}
                x2={pt.x2}
                y2={pt.y2}
                stroke="transparent"
                strokeWidth="16"
                strokeLinecap="round"
              />
            )}
            <line
              x1={pt.x1}
              y1={pt.y1}
              x2={pt.x2}
              y2={pt.y2}
              stroke={on ? '#F59E0B' : '#1E293B'}
              strokeWidth={on ? 6.5 : 4.5}
              strokeLinecap="round"
              opacity={on ? 1 : 0.38}
            />
            {on && (
              <circle cx={pt.x1} cy={pt.y1} r="2.8" fill="#EF4444" className="pointer-events-none" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function decodeSegsToDigit(segs: boolean[]): string | null {
  for (const [digit, pattern] of Object.entries(DIGIT_SEGMENTS)) {
    if (pattern.every((v, i) => v === segs[i])) return digit;
  }
  return null;
}

interface ClockPuzzle {
  id: string;
  title: string;
  prompt: string;
  initialLeft: string;
  op: '+' | '-';
  initialRight: string;
  initialAns: string;
  exactStickTotal: number;
  hint: string;
}

const CLOCK_PUZZLES: ClockPuzzle[] = [
  {
    id: 'mc-1',
    title: '關卡 1 · 移動 1 根火柴棒救出等式',
    prompt: '點擊火柴棒切換亮滅，保持「火柴總根數不變」，讓算式成立！',
    initialLeft: '6',
    op: '+',
    initialRight: '4',
    initialAns: '4',
    exactStickTotal: 14, // 6(6) + 4(4) + 4(4) = 14 -> 8(7) - 4(4) or 0+4=4 (6+4+4=14 -> 0+4=4, or 5+4=9 -> 5+4+6=15 no! 0+4=4 uses 6+4+4=14!)
    hint: '試著從「6」中間移走 1 根變成「0」或移到右上變「8」？注意算式總根數是 14 根：把 6 變成 0（一樣 6 根），0＋4＝4 立刻成立！',
  },
  {
    id: 'mc-2',
    title: '關卡 2 · 雙位數字的等差翻轉',
    prompt: '移動 1 根火柴棒（總根數維持 16 根），讓錯誤算式變成正確算式！',
    initialLeft: '5',
    op: '+',
    initialRight: '7',
    initialAns: '8',
    exactStickTotal: 15, // 5(5) + 7(3) + 8(7) = 15 -> 9(6)+? no: 5(5)+3(5)? Wait: 5+7=8 has 5+3+7=15. Valid: 9(6)+? no, 6(6)+3(5)? no, 3(5)+5(5)=8? No 5+3=8 uses 5+5+7=17. Wait: 6(6)+2(5)=8(7)->18! Check 5(5)+4(4)=9(6)->15! YES: turn 7(3 sticks) into 4? 7->4 needs +1, take 1 from 8(7)->9(6) or 6! Wait: 8 loses 1 stick -> 9(6 sticks) or 6(6 sticks) or 0(6 sticks)! If 8->6: 5+7!=6. If 8->9: 5+4=9 (5+4+6=15 sticks)! Or 3+6=9 (5+6+6=17). Wait 9-7=2? 6+3=9? 5+4=9 uses 5(5 sticks) + 4(4 sticks) + 9(6 sticks) = 15 sticks!! Wait: 7 -> 4 adds 2 sticks (top off, mid & top-left on) which is moving 1 or 2 sticks. Better: 6 + 3 = 8? No, 5 + 3 = 8: wait 9 + 3 = 8 -> 5 + 3 = 8 (take 1 from 9->5? 9(6) to 5(5)= -1 stick, give to 3? no). Look: 8(7) - 3 = 5(5) vs 5(5) + 3(5) = 8(7) (17 sticks): start with 6(6) + 3(5) = 9(6) = 17 sticks -> take 1 from 6->5 (now 5+3), add to 9->8! (5+3=8, 1 move!!)'
    hint: '先算清楚火柴數，試著把右邊「8」移走 1 根變成「9」，再把左邊數字調整成相加等於 9！',
  },
];

// Clean, verified 1-move 7-segment puzzles:
const VERIFIED_PUZZLES: ClockPuzzle[] = [
  {
    id: 'mc-1',
    title: '關卡 1 · 123456 電子鐘小試身手',
    prompt: '保持總火柴棒數為 14 根不變，點擊火柴棒把「6 + 4 = 4」修正為正確等式！',
    initialLeft: '6',
    op: '+',
    initialRight: '4',
    initialAns: '4',
    exactStickTotal: 14, // 6(6)+4(4)=4(4) -> 0(6)+4(4)=4(4) [move middle bar of 6 to top-right!]
    hint: '把左邊的「6」中間那根移到右上角，變成「0」，就會變成 0＋4＝4！（總共維持 14 根）',
  },
  {
    id: 'mc-2',
    title: '關卡 2 · 單根移位極限挑戰',
    prompt: '保持總火柴棒數為 17 根不變，把「6 + 3 = 9」只移動 1 根火柴變成正確等式！',
    initialLeft: '6',
    op: '+',
    initialRight: '3',
    initialAns: '9',
    exactStickTotal: 17, // 6(6)+3(5)=9(6) -> 5(5)+3(5)=8(7)!
    hint: '從左邊的「6」拿走左下角那根變成「5」，補到等號右邊「9」的左下角變成「8」，即 5＋3＝8！',
  },
  {
    id: 'mc-3',
    title: '關卡 3 · 減法電子鐘解密',
    prompt: '保持總火柴棒數為 16 根不變，把「9 − 5 = 2」移動火柴變成正確等式！',
    initialLeft: '9',
    op: '-',
    initialRight: '5',
    initialAns: '2',
    exactStickTotal: 16, // 9(6)-5(5)=2(5)=16 -> 8(7)-5(5)=3?(5)? No, 8(7)-3(5)=5(5) or 9(6)-6(6)=3(5)=17 no! 9(6)-4(4)=5(5)=15 no! Wait: 8(7)-5(5)=3(5) is 17! What about 9(6)-4(4)=5(5) is 15! Target 16: 9(6)-3(5)=6(6) is 17; 7(3)+5(5)=12 no; 8(7)-2(5)=6(6) is 18; 9(6)-5(5)=4(4) is 15; 9(6)-6(6)=3(5) is 17; 6(6)-5(5)=1(2) is 13; 9(6)-3(5)=6(6) is 17; 5(5)-2(5)=3(5) is 15! How about 8(7)-3(5)=5(5)=17 -> start with 9(6)-3(5)=6(6)=17 or 8(7)-6(6)=2(5)=18 -> start 8-3=5! What gives 16 sticks with A-B=C? 6(6)-4(4)=2?(5)=15; 9(6)-4(4)=5(5)=15; 7(3)... wait 0(6)-0(6)=0(6) is 18; 6(6)-0(6)=6(6) is 18; 8(7)-4(4)=4(4) is 15; 9(6)-5(5)=4(4) is 15; 5(5)+4(4)=9(6) is 15; 6(6)+0(6)=6(6) is 18; 2(5)+4(4)=6(6) is 15; 3(5)+5(5)=8(7) is 17; 6(6)+2(5)=8(7) is 18; 4(4)+5(5)=9(6) is 15. Ah! There is NO A-B=C of single digits using 16 sticks? Wait: 6(6)-2(5)=4?(4) no 15. 8(7)-5(5)=3(5)=17. 8(7)-2(5)=6(6)=18. 8(7)-3(5)=5(5)=17. 9(6)-7(3)=2(5)=14. Let's use exactStickTotal: 17 with 9 - 2 = 6 -> 8 - 2 = 6 (moves 0? no 9->8 needs +1, 6->5? Wait 8-3=5! Start 8 - 2 = 5 (17 sticks): 8(7)-2(5)=5(5)=17! Or 6 - 3 = 2? 6(6)-3(5)=2(5)=16 -> NOT exact, wait 9-5=4 (15)! Let's use 15 sticks: initial 9(6) - 3(5) = 4(4) = 15 -> solve 9 - 5 = 4 or 9 - 4 = 5 or 8 - 4 = 4!'
    hint: '把「9」或「3」調整一下！15 根可以排出「9 − 5 ＝ 4」、「9 − 4 ＝ 5」或「8 − 4 ＝ 4」喔！',
  },
];

// Clean up mc-3 exact values cleanly
VERIFIED_PUZZLES[2] = {
  id: 'mc-3',
  title: '關卡 3 · 減法電子鐘解密',
  prompt: '保持總火柴棒數為 15 根不變，點擊火柴棒把「9 − 3 = 4」修正為正確減法等式！',
  initialLeft: '9',
  op: '-',
  initialRight: '3',
  initialAns: '4',
  exactStickTotal: 15, // 9(6) - 3(5) = 4(4) -> 9(6)-5(5)=4(4) or 8(7)-4(4)=4(4)
  hint: '只要調整中間數字的 1 根火柴，把「3」的右下與右上改一下變成「5」，就能得到 9 − 5 ＝ 4（共 15 根）！',
};

export function MatchstickClockLab({ isCompleted, onComplete }: MatchstickClockLabProps) {
  const [tab, setTab] = useState<'clock' | 'puzzle'>('clock');

  // Mode 1: Interactive 123456 Digital Clock Explorer
  const [clockText, setClockText] = useState('123456');
  const clockStats = useMemo(() => {
    const clean = clockText.replace(/[^0-9]/g, '').slice(0, 8) || '0';
    const digits = clean.split('');
    const counts = digits.map((d) => DIGIT_SEGMENTS[d].filter(Boolean).length);
    const total = counts.reduce((a, b) => a + b, 0);
    return { clean, digits, counts, total };
  }, [clockText]);

  // Mode 2: Interactive 7-Segment Matchstick Puzzles
  const [puzIdx, setPuzIdx] = useState(0);
  const puzzle = VERIFIED_PUZZLES[puzIdx];
  const [leftSegs, setLeftSegs] = useState<boolean[]>(() => [...DIGIT_SEGMENTS[puzzle.initialLeft]]);
  const [rightSegs, setRightSegs] = useState<boolean[]>(() => [...DIGIT_SEGMENTS[puzzle.initialRight]]);
  const [ansSegs, setAnsSegs] = useState<boolean[]>(() => [...DIGIT_SEGMENTS[puzzle.initialAns]]);
  const [solvedMap, setSolvedMap] = useState<Record<string, boolean>>({});
  const [showHint, setShowHint] = useState(false);

  const loadPuzzle = (idx: number) => {
    const p = VERIFIED_PUZZLES[idx];
    soundEngine.playClick();
    setPuzIdx(idx);
    setLeftSegs([...DIGIT_SEGMENTS[p.initialLeft]]);
    setRightSegs([...DIGIT_SEGMENTS[p.initialRight]]);
    setAnsSegs([...DIGIT_SEGMENTS[p.initialAns]]);
    setShowHint(false);
  };

  const stickCount =
    leftSegs.filter(Boolean).length +
    rightSegs.filter(Boolean).length +
    ansSegs.filter(Boolean).length;

  const dL = decodeSegsToDigit(leftSegs);
  const dR = decodeSegsToDigit(rightSegs);
  const dA = decodeSegsToDigit(ansSegs);

  const isValidEq = useMemo(() => {
    if (dL === null || dR === null || dA === null) return false;
    if (stickCount !== puzzle.exactStickTotal) return false;
    const val = puzzle.op === '+' ? Number(dL) + Number(dR) : Number(dL) - Number(dR);
    return val === Number(dA);
  }, [dL, dR, dA, stickCount, puzzle]);

  const toggleSeg = (which: 'L' | 'R' | 'A', segIdx: number) => {
    soundEngine.playClick();
    const updater = (arr: boolean[]) => arr.map((v, i) => (i === segIdx ? !v : v));
    const nextL = which === 'L' ? updater(leftSegs) : leftSegs;
    const nextR = which === 'R' ? updater(rightSegs) : rightSegs;
    const nextA = which === 'A' ? updater(ansSegs) : ansSegs;

    if (which === 'L') setLeftSegs(nextL);
    else if (which === 'R') setRightSegs(nextR);
    else setAnsSegs(nextA);

    const nL = decodeSegsToDigit(nextL);
    const nR = decodeSegsToDigit(nextR);
    const nA = decodeSegsToDigit(nextA);
    const sticks =
      nextL.filter(Boolean).length +
      nextR.filter(Boolean).length +
      nextA.filter(Boolean).length;

    if (nL !== null && nR !== null && nA !== null && sticks === puzzle.exactStickTotal) {
      const val = puzzle.op === '+' ? Number(nL) + Number(nR) : Number(nL) - Number(nR);
      if (val === Number(nA)) {
        soundEngine.playCorrect(2);
        const nextMap = { ...solvedMap, [puzzle.id]: true };
        setSolvedMap(nextMap);
        if (!isCompleted) {
          onComplete(60);
        }
      }
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm sm:space-y-6 sm:p-6 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 6 高斯數陣聖殿
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
            電子鐘火柴棒腦力戰（七段顯示器規律）
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
            觀察電子鐘數字「123456」的火柴棒數目規律，並親自點擊移動火柴棒解開等式謎題！
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('clock')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              tab === 'clock'
                ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>電子鐘數字探索器</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('puzzle')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              tab === 'puzzle'
                ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>火柴棒移位闖關（3 關）</span>
          </button>
        </div>
      </div>

      {tab === 'clock' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {['123456', '0830', '2026', '8888'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setClockText(preset);
                  }}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-bold ${
                    clockText === preset
                      ? 'border-sky-500 bg-sky-50 text-sky-800 dark:border-cyan-400 dark:bg-cyan-500/20 dark:text-cyan-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>自訂數字：</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={clockText}
                onChange={(e) => setClockText(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-900 p-5 sm:gap-5 sm:p-7 dark:border-slate-800 dark:bg-[#080D1A]">
            {clockStats.digits.map((d, i) => (
              <div key={`${d}-${i}`} className="flex flex-col items-center gap-2">
                <SevenSegDigit segs={DIGIT_SEGMENTS[d]} />
                <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                  「{d}」→ {clockStats.counts[i]} 根
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#080D1A]">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                目前顯示「{clockStats.clean}」總火柴棒數
              </div>
              <div className="mt-1 font-mono text-2xl font-extrabold text-sky-700 tabular-nums dark:text-cyan-300">
                {clockStats.counts.join(' ＋ ')} ＝ {clockStats.total} 根
              </div>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <div>
                <strong>課堂推理題：</strong>「123456」一共需要 2＋5＋5＋4＋5＋6＝<strong>27 根</strong>火柴；請問哪個 1 位數用最多火柴？沒錯，就是 <strong>8（7 根）</strong>！快切到右方「火柴棒移位闖關」挑戰拿星星吧！
              </div>
              <button
                type="button"
                onClick={() => setTab('puzzle')}
                className="self-start rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950"
              >
                前往火柴棒移位闖關 →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {VERIFIED_PUZZLES.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => loadPuzzle(idx)}
                  className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold ${
                    idx === puzIdx
                      ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : solvedMap[p.id]
                      ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {solvedMap[p.id] ? '✓ ' : ''}
                  {p.title}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {showHint ? '隱藏提示' : '查看提示'}
              </button>
              <button
                type="button"
                onClick={() => loadPuzzle(puzIdx)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>重設本題</span>
              </button>
            </div>
          </div>

          {showHint && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              {puzzle.hint}
            </div>
          )}

          {/* Interactive 7-seg equation */}
          <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-slate-900 p-6 sm:gap-6 dark:border-slate-800 dark:bg-[#080D1A]">
            <SevenSegDigit segs={leftSegs} interactive onToggleSeg={(i) => toggleSeg('L', i)} />
            <span className="font-mono text-4xl font-extrabold text-cyan-300">
              {puzzle.op === '+' ? '＋' : '－'}
            </span>
            <SevenSegDigit segs={rightSegs} interactive onToggleSeg={(i) => toggleSeg('R', i)} />
            <span className="font-mono text-4xl font-extrabold text-cyan-300">＝</span>
            <SevenSegDigit segs={ansSegs} interactive onToggleSeg={(i) => toggleSeg('A', i)} />
          </div>

          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm ${
              isValidEq
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-200'
            }`}
          >
            <div>
              {isValidEq ? (
                <span className="font-bold">
                  ✓ 太棒了！{dL} {puzzle.op === '+' ? '＋' : '－'} {dR} ＝ {dA}（火柴總數 {stickCount} 根完全符合！）
                </span>
              ) : (
                <span>
                  目前解讀：{dL ?? '?'} {puzzle.op === '+' ? '＋' : '－'} {dR ?? '?'} ＝ {dA ?? '?'}
                  {' · '}目前亮起 <strong className="font-mono">{stickCount}</strong> 根（目標需{' '}
                  <strong className="font-mono">{puzzle.exactStickTotal}</strong> 根）
                </span>
              )}
            </div>

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>火柴棒腦力戰過關（＋60分）</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
