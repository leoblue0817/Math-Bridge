import { useMemo, useState } from 'react';
import { Box, CheckCircle2, Flame, HelpCircle, Minus, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { soundEngine } from '../../utils/soundEngine';

interface VoxelViewsLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

interface VoxelChallenge {
  id: string;
  title: string;
  subtitle: string;
  exactCubes?: number;
  frontCols: [number, number, number]; // col 0..2 heights
  topMask: number[][]; // 3x3 (r=0 back .. r=2 front)
  rightCols: [number, number, number]; // col0=front(r=2), col1=mid(r=1), col2=back(r=0)
}

const VOXEL_CHALLENGES: VoxelChallenge[] = [
  {
    id: 'vx-1',
    title: '關卡 1 · 神秘三視圖（講義 p.4 Q1）',
    subtitle: '排出符合前、上、右三視圖的立體積木',
    frontCols: [3, 1, 1],
    topMask: [
      [1, 1, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    rightCols: [3, 2, 1],
  },
  {
    id: 'vx-2',
    title: '關卡 2 · 9 塊積木挑戰（講義 p.4 Q2）',
    subtitle: '必須剛好使用「9 塊」積木拼出對應三視圖',
    exactCubes: 9,
    frontCols: [2, 3, 1],
    topMask: [
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
    rightCols: [1, 1, 3],
  },
  {
    id: 'vx-3',
    title: '關卡 3 · 10 塊積木挑戰（講義 p.4 Q3）',
    subtitle: '必須剛好使用「10 塊」積木拼出對應三視圖',
    exactCubes: 10,
    frontCols: [3, 2, 1],
    topMask: [
      [1, 1, 1],
      [1, 1, 0],
      [1, 0, 0],
    ],
    rightCols: [1, 2, 3],
  },
];

// 16-matchstick 3x3 edge grid: h[4][3], v[3][4]
interface MatchGridState {
  h: boolean[][];
  v: boolean[][];
}

function createInitialMatchGrid(): MatchGridState {
  // Outer 3x3 (12 sticks) + Inner 1x1 (4 sticks) = 16 sticks
  const h = [
    [true, true, true],
    [false, true, false],
    [false, true, false],
    [true, true, true],
  ];
  const v = [
    [true, false, false, true],
    [true, true, true, true],
    [true, false, false, true],
  ];
  return { h, v };
}

function analyzeMatchGrid(state: MatchGridState, initial: MatchGridState) {
  const { h, v } = state;
  let totalSticks = 0;
  let movedOut = 0;
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (h[r][c]) totalSticks += 1;
      if (initial.h[r][c] && !h[r][c]) movedOut += 1;
    }
  }
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      if (v[r][c]) totalSticks += 1;
      if (initial.v[r][c] && !v[r][c]) movedOut += 1;
    }
  }

  // Detect all squares of size s in {1, 2, 3}
  const squares: { r: number; c: number; size: number }[] = [];
  const usedH = Array.from({ length: 4 }, () => Array(3).fill(false));
  const usedV = Array.from({ length: 3 }, () => Array(4).fill(false));

  for (let size = 1; size <= 3; size += 1) {
    for (let r = 0; r <= 3 - size; r += 1) {
      for (let c = 0; c <= 3 - size; c += 1) {
        let ok = true;
        for (let k = 0; k < size; k += 1) {
          if (!h[r][c + k] || !h[r + size][c + k] || !v[r + k][c] || !v[r + k][c + size]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          squares.push({ r, c, size });
          for (let k = 0; k < size; k += 1) {
            usedH[r][c + k] = true;
            usedH[r + size][c + k] = true;
            usedV[r + k][c] = true;
            usedV[r + k][c + size] = true;
          }
        }
      }
    }
  }

  // Check if any placed stick is dangling (not part of any square)
  let dangling = 0;
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (h[r][c] && !usedH[r][c]) dangling += 1;
    }
  }
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      if (v[r][c] && !usedV[r][c]) dangling += 1;
    }
  }

  const solved = totalSticks === 16 && movedOut === 4 && squares.length === 3 && dangling === 0;
  return { totalSticks, movedOut, squares, dangling, solved };
}

function createEmptyHeights(): number[][] {
  return [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
}

function ViewGridPreview({
  title,
  colorClass,
  cells,
}: {
  title: string;
  colorClass: string;
  cells: boolean[][];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 text-center sm:p-3 dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mb-1.5 text-[11px] font-semibold text-slate-700 sm:mb-2 sm:text-xs dark:text-slate-300">
        {title}
      </div>
      <div className="mx-auto grid w-fit grid-cols-3 gap-1">
        {cells.map((row, r) =>
          row.map((on, c) => (
            <div
              key={`${r}-${c}`}
              className={`h-4 w-4 rounded-[3px] border sm:h-5 sm:w-5 ${
                on ? colorClass : 'border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900'
              }`}
            />
          ))
        )}
      </div>
    </div>
  );
}

function heightColsToGrid(cols: [number, number, number]): boolean[][] {
  return [0, 1, 2].map((rowIdx) => {
    const levelFromBottom = 3 - rowIdx; // row0=3, row1=2, row2=1
    return cols.map((h) => h >= levelFromBottom);
  });
}

export function VoxelViewsLab({ isCompleted, onComplete }: VoxelViewsLabProps) {
  const [mode, setMode] = useState<'challenge' | 'sandbox' | 'matchstick'>('challenge');
  const [chIdx, setChIdx] = useState(0);
  const [heights, setHeights] = useState<number[][]>(() => createEmptyHeights());
  const [tool, setTool] = useState<'add' | 'sub'>('add');
  const [solvedMap, setSolvedMap] = useState<Record<string, boolean>>({});

  // Matchstick challenge state
  const initialMatchGrid = useMemo(() => createInitialMatchGrid(), []);
  const [matchGrid, setMatchGrid] = useState<MatchGridState>(() => createInitialMatchGrid());
  const [heldSticks, setHeldSticks] = useState(0);
  const [showMatchHint, setShowMatchHint] = useState(false);

  const matchAnalysis = useMemo(
    () => analyzeMatchGrid(matchGrid, initialMatchGrid),
    [matchGrid, initialMatchGrid]
  );

  const handleToggleStick = (kind: 'h' | 'v', r: number, c: number) => {
    soundEngine.playClick();
    const isPresent = kind === 'h' ? matchGrid.h[r][c] : matchGrid.v[r][c];
    if (isPresent) {
      // Pick up stick
      const next: MatchGridState = {
        h: matchGrid.h.map((row, rr) => row.map((v, cc) => (kind === 'h' && rr === r && cc === c ? false : v))),
        v: matchGrid.v.map((row, rr) => row.map((v, cc) => (kind === 'v' && rr === r && cc === c ? false : v))),
      };
      setMatchGrid(next);
      setHeldSticks((n) => n + 1);
    } else if (heldSticks > 0) {
      // Place stick down
      const next: MatchGridState = {
        h: matchGrid.h.map((row, rr) => row.map((v, cc) => (kind === 'h' && rr === r && cc === c ? true : v))),
        v: matchGrid.v.map((row, rr) => row.map((v, cc) => (kind === 'v' && rr === r && cc === c ? true : v))),
      };
      setMatchGrid(next);
      setHeldSticks((n) => Math.max(0, n - 1));

      const res = analyzeMatchGrid(next, initialMatchGrid);
      if (res.solved) {
        soundEngine.playCorrect(3);
        if (!isCompleted) onComplete(60);
      }
    }
  };

  const challenge = VOXEL_CHALLENGES[chIdx];

  const totalCubes = useMemo(
    () => heights.reduce((acc, row) => acc + row.reduce((a, b) => a + b, 0), 0),
    [heights]
  );

  // Live 3 orthographic projections from current heights
  const liveFrontCols: [number, number, number] = [
    Math.max(heights[0][0], heights[1][0], heights[2][0]),
    Math.max(heights[0][1], heights[1][1], heights[2][1]),
    Math.max(heights[0][2], heights[1][2], heights[2][2]),
  ];

  const liveTopMask = heights.map((row) => row.map((h) => (h > 0 ? 1 : 0)));

  // Looking from Right toward Left: col0 = Front(r=2), col1 = Mid(r=1), col2 = Back(r=0)
  const liveRightCols: [number, number, number] = [
    Math.max(heights[2][0], heights[2][1], heights[2][2]),
    Math.max(heights[1][0], heights[1][1], heights[1][2]),
    Math.max(heights[0][0], heights[0][1], heights[0][2]),
  ];

  const isMatched = useMemo(() => {
    if (mode !== 'challenge') return false;
    const frontOk = liveFrontCols.every((v, i) => v === challenge.frontCols[i]);
    const rightOk = liveRightCols.every((v, i) => v === challenge.rightCols[i]);
    const topOk = liveTopMask.every((row, r) =>
      row.every((v, c) => v === challenge.topMask[r][c])
    );
    const countOk =
      challenge.exactCubes === undefined || totalCubes === challenge.exactCubes;
    return frontOk && rightOk && topOk && countOk;
  }, [mode, liveFrontCols, liveRightCols, liveTopMask, totalCubes, challenge]);

  const handleCellAction = (r: number, c: number) => {
    setHeights((prev) => {
      const next = prev.map((row) => [...row]);
      if (tool === 'add') {
        next[r][c] = next[r][c] >= 3 ? 0 : next[r][c] + 1;
      } else {
        next[r][c] = Math.max(0, next[r][c] - 1);
      }

      if (mode === 'challenge') {
        const f: [number, number, number] = [
          Math.max(next[0][0], next[1][0], next[2][0]),
          Math.max(next[0][1], next[1][1], next[2][1]),
          Math.max(next[0][2], next[1][2], next[2][2]),
        ];
        const rc: [number, number, number] = [
          Math.max(next[2][0], next[2][1], next[2][2]),
          Math.max(next[1][0], next[1][1], next[1][2]),
          Math.max(next[0][0], next[0][1], next[0][2]),
        ];
        const tm = next.map((row) => row.map((h) => (h > 0 ? 1 : 0)));
        const cubes = next.reduce((acc, row) => acc + row.reduce((a, b) => a + b, 0), 0);

        const ok =
          f.every((v, i) => v === challenge.frontCols[i]) &&
          rc.every((v, i) => v === challenge.rightCols[i]) &&
          tm.every((row, rr) => row.every((v, cc) => v === challenge.topMask[rr][cc])) &&
          (challenge.exactCubes === undefined || cubes === challenge.exactCubes);

        if (ok) {
          setSolvedMap((s) => ({ ...s, [challenge.id]: true }));
          if (!isCompleted) {
            onComplete(60);
          }
        }
      }

      return next;
    });
  };

  const selectChallenge = (idx: number) => {
    setMode('challenge');
    setChIdx(idx);
    setHeights(createEmptyHeights());
  };

  // Isometric SVG projection helper
  // c: 0..2 (left-to-right => +x_iso), r: 0..2 (back-to-front => +y_iso), z: 0..2 (bottom-to-top)
  const isoX = (c: number, r: number) => 170 + (c - r) * 34;
  const isoY = (c: number, r: number, z: number) => 125 + (c + r) * 18 - z * 34;

  const cubeElements: { key: string; c: number; r: number; z: number }[] = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      for (let z = 0; z < heights[r][c]; z += 1) {
        cubeElements.push({ key: `${r}-${c}-${z}`, c, r, z });
      }
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm sm:space-y-6 sm:p-6 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 8 全息立體幻境
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
            神秘三視圖積木 ＆ 16 根火柴棒移位陣
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
            可挑戰「三視圖立體積木反推」，或切換到講義第 5 頁腦力補給「16 根火柴移 4 根變 3 個正方形」！
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('challenge')}
            className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold ${
              mode === 'challenge'
                ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            三視圖反推關卡
          </button>
          <button
            type="button"
            onClick={() => setMode('matchstick')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              mode === 'matchstick'
                ? 'bg-rose-600 text-white dark:bg-rose-400 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            <span>16 根火柴移位戰</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('sandbox');
              setHeights(createEmptyHeights());
            }}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              mode === 'sandbox'
                ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Box className="h-3.5 w-3.5" aria-hidden="true" />
            <span>自由積木實驗室</span>
          </button>
        </div>
      </div>

      {mode === 'matchstick' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs leading-relaxed text-slate-700 sm:text-sm dark:text-slate-300">
              <strong>講義 p.5 腦力補給 1：</strong>
              下圖是用 16 根火柴排出的兩個正方形，請<strong>移動 4 根火柴</strong>（點擊火柴拿起，再點虛線空格放下），讓圖形變成<strong>三個正方形</strong>！（不可有落單火柴）
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowMatchHint((v) => !v)}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <HelpCircle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                <span>{showMatchHint ? '隱藏提示' : '提示策略'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setMatchGrid(createInitialMatchGrid());
                  setHeldSticks(0);
                }}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>重設火柴陣</span>
              </button>
            </div>
          </div>

          {showMatchHint && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <strong>破關秘訣：</strong>如果讓兩個 <strong>2×2 的大正方形</strong>對角重疊在正中間，重疊的那一格剛好會自然圍出第 3 個 <strong>1×1 小正方形</strong>！試著拿走外框右上角 2 根與左下角 2 根，補進內部把兩個 2×2 圍起來吧！
            </div>
          )}

          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-900 p-5 sm:p-7 lg:col-span-6 dark:border-slate-800 dark:bg-[#080D1A]">
              <svg
                width="280"
                height="280"
                viewBox="0 0 280 280"
                role="img"
                aria-label="16 根火柴正方形陣列"
                className="h-auto w-full max-w-[280px] touch-manipulation"
              >
                {/* Horizontal edges h[4][3] */}
                {matchGrid.h.map((row, r) =>
                  row.map((on, c) => {
                    const x1 = 35 + c * 70;
                    const x2 = x1 + 70;
                    const y = 35 + r * 70;
                    const canClick = on || heldSticks > 0;
                    return (
                      <g
                        key={`mh-${r}-${c}`}
                        onClick={() => canClick && handleToggleStick('h', r, c)}
                        className={canClick ? 'cursor-pointer' : ''}
                      >
                        <line x1={x1} y1={y} x2={x2} y2={y} stroke="transparent" strokeWidth="26" />
                        <line
                          x1={x1 + 8}
                          y1={y}
                          x2={x2 - 8}
                          y2={y}
                          stroke={on ? '#F59E0B' : heldSticks > 0 ? '#38BDF8' : '#334155'}
                          strokeWidth={on ? 7 : 3}
                          strokeDasharray={on ? undefined : '5,5'}
                          strokeLinecap="round"
                          opacity={on ? 1 : heldSticks > 0 ? 0.65 : 0.35}
                        />
                        {on && (
                          <circle cx={x1 + 10} cy={y} r="4.2" fill="#EF4444" className="pointer-events-none" />
                        )}
                      </g>
                    );
                  })
                )}

                {/* Vertical edges v[3][4] */}
                {matchGrid.v.map((row, r) =>
                  row.map((on, c) => {
                    const x = 35 + c * 70;
                    const y1 = 35 + r * 70;
                    const y2 = y1 + 70;
                    const canClick = on || heldSticks > 0;
                    return (
                      <g
                        key={`mv-${r}-${c}`}
                        onClick={() => canClick && handleToggleStick('v', r, c)}
                        className={canClick ? 'cursor-pointer' : ''}
                      >
                        <line x1={x} y1={y1} x2={x} y2={y2} stroke="transparent" strokeWidth="26" />
                        <line
                          x1={x}
                          y1={y1 + 8}
                          x2={x}
                          y2={y2 - 8}
                          stroke={on ? '#F59E0B' : heldSticks > 0 ? '#38BDF8' : '#334155'}
                          strokeWidth={on ? 7 : 3}
                          strokeDasharray={on ? undefined : '5,5'}
                          strokeLinecap="round"
                          opacity={on ? 1 : heldSticks > 0 ? 0.65 : 0.35}
                        />
                        {on && (
                          <circle cx={x} cy={y1 + 10} r="4.2" fill="#EF4444" className="pointer-events-none" />
                        )}
                      </g>
                    );
                  })
                )}

                {/* Corner grid dots */}
                {Array.from({ length: 4 }, (_, r) =>
                  Array.from({ length: 4 }, (_, c) => (
                    <circle
                      key={`dot-${r}-${c}`}
                      cx={35 + c * 70}
                      cy={35 + r * 70}
                      r="3.5"
                      fill="#94A3B8"
                      className="pointer-events-none"
                    />
                  ))
                )}
              </svg>
            </div>

            <div className="space-y-4 lg:col-span-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#080D1A]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">手上火柴</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-cyan-600 tabular-nums dark:text-cyan-300">
                    {heldSticks} 根
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#080D1A]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">已移動根數</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-amber-600 tabular-nums dark:text-amber-300">
                    {matchAnalysis.movedOut} / 4
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#080D1A]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">偵測正方形</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-emerald-600 tabular-nums dark:text-emerald-300">
                    {matchAnalysis.squares.length} / 3
                  </div>
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 text-sm leading-relaxed ${
                  matchAnalysis.solved
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-300'
                }`}
              >
                {matchAnalysis.solved ? (
                  <div className="flex items-center gap-2 font-bold">
                    <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>完美解鎖！移動 4 根火柴形成 2 個 2×2 ＋ 1 個重疊 1×1，共 3 個正方形且零落單！</span>
                  </div>
                ) : heldSticks > 0 ? (
                  `手上拿著 ${heldSticks} 根火柴，請點擊藍色虛線位置把火柴放下來！`
                ) : matchAnalysis.dangling > 0 ? (
                  `還有 ${matchAnalysis.dangling} 根火柴沒有圍成正方形（不可落單），請調整位置！`
                ) : (
                  '先點擊 4 根橘色火柴拿起來，再點擊藍色虛線空位放置，湊出剛好 3 個正方形！'
                )}
              </div>

              {isCompleted && (
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>空間創意對戰過關（＋60分已領取）</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {mode === 'challenge' && (
            <div className="flex flex-wrap gap-2">
              {VOXEL_CHALLENGES.map((ch, idx) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => selectChallenge(idx)}
                  className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold ${
                    chIdx === idx
                      ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : solvedMap[ch.id]
                      ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {solvedMap[ch.id] ? '✓ ' : ''}
                  {ch.title}
                </button>
              ))}
            </div>
          )}

      <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12">
        {/* Left: Isometric 3D Preview + Interactive Base Pad */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-900 p-3.5 sm:p-5 lg:col-span-6 dark:border-slate-800 dark:bg-[#080D1A]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <span>即時 3D 積木預覽（前方↙ · 右方↘）</span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">
              目前已使用：{totalCubes} 塊積木
            </span>
          </div>

          <div className="flex justify-center">
            <svg
              width="340"
              height="240"
              viewBox="0 0 340 240"
              role="img"
              aria-label="立體積木等角視圖"
              className="h-auto w-full max-w-[330px] touch-manipulation sm:max-w-[340px]"
            >
              {/* Base grid diamond floor */}
              {Array.from({ length: 3 }, (_, r) =>
                Array.from({ length: 3 }, (_, c) => {
                  const cx = isoX(c, r);
                  const cy = isoY(c, r, 0);
                  return (
                    <polygon
                      key={`floor-${r}-${c}`}
                      points={`${cx},${cy - 18} ${cx + 34},${cy} ${cx},${cy + 18} ${cx - 34},${cy}`}
                      fill="rgba(30,41,59,0.55)"
                      stroke="#334155"
                      strokeWidth={1.2}
                      className="cursor-pointer hover:fill-cyan-950/60"
                      onClick={() => handleCellAction(r, c)}
                    />
                  );
                })
              )}

              {/* Cubes back-to-front */}
              {cubeElements.map(({ key, c, r, z }) => {
                const cx = isoX(c, r);
                const cy = isoY(c, r, z);
                // Top face sits at z+1 height
                const ty = cy - 34;
                return (
                  <g
                    key={key}
                    className="cursor-pointer"
                    onClick={() => handleCellAction(r, c)}
                  >
                    {/* Top */}
                    <polygon
                      points={`${cx},${ty - 18} ${cx + 34},${ty} ${cx},${ty + 18} ${cx - 34},${ty}`}
                      fill="#38BDF8"
                      stroke="#0F172A"
                      strokeWidth={1.4}
                    />
                    {/* Left (Front-facing in isometric) */}
                    <polygon
                      points={`${cx - 34},${ty} ${cx},${ty + 18} ${cx},${cy + 18} ${cx - 34},${cy}`}
                      fill="#0284C7"
                      stroke="#0F172A"
                      strokeWidth={1.4}
                    />
                    {/* Right */}
                    <polygon
                      points={`${cx},${ty + 18} ${cx + 34},${ty} ${cx + 34},${cy} ${cx},${cy + 18}`}
                      fill="#0369A1"
                      stroke="#0F172A"
                      strokeWidth={1.4}
                    />
                  </g>
                );
              })}

              <text x="58" y="218" fill="#7DD3FC" fontSize="12" fontWeight="700">
                ↖ 前面（前視）
              </text>
              <text x="218" y="218" fill="#FDE047" fontSize="12" fontWeight="700">
                右面（右視）↗
              </text>
            </svg>
          </div>

          {/* 3x3 Height Base Controller */}
          <div className="border-t border-slate-800 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200">
                俯視底座高度盤（點擊增減層數 0～3）
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setTool('add')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                    tool === 'add'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'border border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  <span>疊加</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTool('sub')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                    tool === 'sub'
                      ? 'bg-rose-400 text-slate-950'
                      : 'border border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  <Minus className="h-3 w-3" aria-hidden="true" />
                  <span>減少</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHeights(createEmptyHeights())}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>清空</span>
                </button>
              </div>
            </div>

            <div className="mx-auto grid w-fit grid-cols-3 gap-2">
              {heights.map((row, r) =>
                row.map((h, c) => (
                <button
                  key={`pad-${r}-${c}`}
                  type="button"
                  onClick={() => handleCellAction(r, c)}
                  className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg border font-mono transition-colors sm:w-16 ${
                    h > 0
                      ? 'border-cyan-400/70 bg-cyan-500/20 text-white'
                      : 'border-slate-700 bg-slate-950 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  <span className="text-lg font-bold tabular-nums">{h}</span>
                  <span className="text-[10px] text-slate-400">
                    {r === 0 ? '後' : r === 1 ? '中' : '前'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Target vs Live Projections */}
      <div className="space-y-4 lg:col-span-6">
        {mode === 'challenge' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="text-sm font-bold text-slate-900 dark:text-white">{challenge.title}</div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{challenge.subtitle}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              <ViewGridPreview
                title="目標前視圖"
                colorClass="border-sky-400 bg-sky-400 dark:border-cyan-300 dark:bg-cyan-400"
                cells={heightColsToGrid(challenge.frontCols)}
              />
              <ViewGridPreview
                title="目標上視圖"
                colorClass="border-rose-400 bg-rose-400 dark:border-rose-300 dark:bg-rose-400"
                cells={challenge.topMask.map((row) => row.map((v) => v === 1))}
              />
              <ViewGridPreview
                title="目標右視圖"
                colorClass="border-amber-400 bg-amber-400 dark:border-amber-300 dark:bg-amber-400"
                cells={heightColsToGrid(challenge.rightCols)}
              />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-800 dark:bg-[#080D1A]">
          <div className="text-sm font-bold text-slate-900 dark:text-white">目前作品即時三視圖投影</div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              <ViewGridPreview
                title="目前前視圖"
                colorClass="border-sky-400 bg-sky-400 dark:border-cyan-300 dark:bg-cyan-400"
                cells={heightColsToGrid(liveFrontCols)}
              />
              <ViewGridPreview
                title="目前上視圖"
                colorClass="border-rose-400 bg-rose-400 dark:border-rose-300 dark:bg-rose-400"
                cells={liveTopMask.map((row) => row.map((v) => v === 1))}
              />
              <ViewGridPreview
                title="目前右視圖"
                colorClass="border-amber-400 bg-amber-400 dark:border-amber-300 dark:bg-amber-400"
                cells={heightColsToGrid(liveRightCols)}
              />
            </div>
          </div>

          {mode === 'challenge' && (
            <div
              className={`rounded-xl border p-4 text-sm leading-relaxed ${
                isMatched
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-300'
              }`}
            >
              {isMatched
                ? `✓ 完美符合！三個視圖與積木總數（${totalCubes} 塊）全部達成！`
                : challenge.exactCubes
                ? `提示：本關需同時對齊三個視圖，且總塊數必須剛好等於 ${challenge.exactCubes} 塊（目前 ${totalCubes} 塊）。`
                : '對照目標視圖調整各格高度，三個視圖全部相同即自動過關！'}
            </div>
          )}

          {isCompleted && (
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>立體三視圖挑戰過關（＋60分已領取）</span>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
