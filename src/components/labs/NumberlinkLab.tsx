import { useMemo, useState } from 'react';
import { CheckCircle2, Eraser, HelpCircle, RotateCcw, Sparkles } from 'lucide-react';
import { soundEngine } from '../../utils/soundEngine';

interface NumberlinkLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

interface NumberlinkLevel {
  id: string;
  title: string;
  subtitle: string;
  size: number;
  endpoints: Record<number, [[number, number], [number, number]]>;
  hint: string;
}

const PAIR_STYLES: Record<number, { bg: string; border: string; stroke: string; text: string }> = {
  1: { bg: '#EF4444', border: '#FCA5A5', stroke: '#F87171', text: '#FFFFFF' },
  2: { bg: '#F59E0B', border: '#FDE68A', stroke: '#FBBF24', text: '#0F172A' },
  3: { bg: '#06B6D4', border: '#A5F3FC', stroke: '#22D3EE', text: '#0F172A' },
  4: { bg: '#10B981', border: '#A7F3D0', stroke: '#34D399', text: '#0F172A' },
  5: { bg: '#8B5CF6', border: '#DDD6FE', stroke: '#A78BFA', text: '#FFFFFF' },
  6: { bg: '#EC4899', border: '#FBCFE8', stroke: '#F472B6', text: '#FFFFFF' },
};

const LEVELS: NumberlinkLevel[] = [
  {
    id: 'nl-1',
    title: '關卡 1 · 經典 6×6（講義範例）',
    subtitle: '由外圍邊角線條開始繪製，所有 36 格必須全部鋪滿且不出現 2×2 同色區塊',
    size: 6,
    endpoints: {
      1: [
        [5, 1],
        [5, 5],
      ],
      2: [
        [0, 3],
        [3, 0],
      ],
      3: [
        [1, 3],
        [5, 0],
      ],
      4: [
        [2, 2],
        [1, 5],
      ],
      5: [
        [4, 2],
        [4, 5],
      ],
      6: [
        [0, 5],
        [2, 3],
      ],
    },
    hint: '先貼邊連好 1 與 2（貼住左上角），再讓 5 沿第 5 列走直路，3 就能繞過 1 往上走！',
  },
  {
    id: 'nl-2',
    title: '關卡 2 · 進階 6×6（講義第 2 關）',
    subtitle: '觀察被包圍的 6 與 4，找出唯一不會阻擋其他航線的繞行通道',
    size: 6,
    endpoints: {
      1: [
        [4, 2],
        [2, 5],
      ],
      2: [
        [4, 1],
        [3, 5],
      ],
      3: [
        [5, 0],
        [3, 3],
      ],
      4: [
        [2, 0],
        [1, 5],
      ],
      5: [
        [1, 1],
        [2, 3],
      ],
      6: [
        [1, 2],
        [1, 4],
      ],
    },
    hint: '關鍵突破口：先連中間橫向的 6，讓 4 貼著最上方邊緣繞過整排，底部交給 2 貼底邊！',
  },
  {
    id: 'nl-3',
    title: '關卡 3 · 星門 7×7 終極樞紐',
    subtitle: '49 格全域連線挑戰！先鎖定最外圈的 1、2、4，再拆解核心區',
    size: 7,
    endpoints: {
      1: [
        [4, 0],
        [5, 4],
      ],
      2: [
        [0, 6],
        [6, 4],
      ],
      3: [
        [2, 3],
        [5, 1],
      ],
      4: [
        [1, 6],
        [6, 6],
      ],
      5: [
        [2, 2],
        [6, 3],
      ],
      6: [
        [4, 2],
        [5, 0],
      ],
    },
    hint: '4 直接貼最右行直達右下角；2 貼著 4 的左側繞到最底行；1 沿上邊緣從左到右包圍 3！',
  },
];

function isAdjacent(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

export function NumberlinkLab({ isCompleted, onComplete }: NumberlinkLabProps) {
  const [levelIdx, setLevelIdx] = useState(0);
  const level = LEVELS[levelIdx];
  const n = level.size;

  const [paths, setPaths] = useState<Record<number, [number, number][]>>({});
  const [drawingPair, setDrawingPair] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [solvedMap, setSolvedMap] = useState<Record<string, boolean>>({});

  // Map each cell "r-c" to endpoint pair number if it's an endpoint
  const endpointAt = useMemo(() => {
    const map = new Map<string, number>();
    for (const [numStr, [pA, pB]] of Object.entries(level.endpoints)) {
      const num = Number(numStr);
      map.set(`${pA[0]}-${pA[1]}`, num);
      map.set(`${pB[0]}-${pB[1]}`, num);
    }
    return map;
  }, [level]);

  // Map each cell "r-c" to current occupant pair number
  const cellOwner = useMemo(() => {
    const map = new Map<string, number>();
    for (const [numStr, pts] of Object.entries(paths)) {
      const num = Number(numStr);
      pts.forEach(([r, c]) => map.set(`${r}-${c}`, num));
    }
    // Endpoints always visually belong to their own number
    endpointAt.forEach((num, key) => map.set(key, num));
    return map;
  }, [paths, endpointAt]);

  // Check completion status per pair, full grid coverage, and 2x2 block check
  const validation = useMemo(() => {
    const pairNumbers = Object.keys(level.endpoints).map(Number);
    const completedPairs: Record<number, boolean> = {};
    for (const num of pairNumbers) {
      const pts = paths[num] ?? [];
      if (pts.length < 2) {
        completedPairs[num] = false;
        continue;
      }
      const [eA, eB] = level.endpoints[num];
      const first = pts[0];
      const last = pts[pts.length - 1];
      const matches =
        (first[0] === eA[0] && first[1] === eA[1] && last[0] === eB[0] && last[1] === eB[1]) ||
        (first[0] === eB[0] && first[1] === eB[1] && last[0] === eA[0] && last[1] === eA[1]);
      completedPairs[num] = matches;
    }

    const allPairsDone = pairNumbers.every((num) => completedPairs[num]);
    const filledCells = cellOwner.size;
    const totalCells = n * n;
    const allCovered = filledCells === totalCells;

    // Rule 3: no 2x2 square occupied by the same number
    const blocks2x2: [number, number][] = [];
    for (let r = 0; r < n - 1; r += 1) {
      for (let c = 0; c < n - 1; c += 1) {
        const a = cellOwner.get(`${r}-${c}`);
        const b = cellOwner.get(`${r}-${c + 1}`);
        const c1 = cellOwner.get(`${r + 1}-${c}`);
        const d = cellOwner.get(`${r + 1}-${c + 1}`);
        if (a && a === b && a === c1 && a === d) {
          blocks2x2.push([r, c]);
        }
      }
    }

    const cleared = allPairsDone && allCovered && blocks2x2.length === 0;
    return {
      completedPairs,
      allPairsDone,
      filledCells,
      totalCells,
      allCovered,
      blocks2x2,
      cleared,
    };
  }, [level, paths, cellOwner, n]);

  const checkAndTriggerVictory = (nextPaths: Record<number, [number, number][]>) => {
    const pairNumbers = Object.keys(level.endpoints).map(Number);
    const owner = new Map<string, number>();
    for (const [numStr, pts] of Object.entries(nextPaths)) {
      const num = Number(numStr);
      pts.forEach(([r, c]) => owner.set(`${r}-${c}`, num));
    }
    endpointAt.forEach((num, key) => owner.set(key, num));

    const pairsOk = pairNumbers.every((num) => {
      const pts = nextPaths[num] ?? [];
      if (pts.length < 2) return false;
      const [eA, eB] = level.endpoints[num];
      const f = pts[0];
      const l = pts[pts.length - 1];
      return (
        (f[0] === eA[0] && f[1] === eA[1] && l[0] === eB[0] && l[1] === eB[1]) ||
        (f[0] === eB[0] && f[1] === eB[1] && l[0] === eA[0] && l[1] === eA[1])
      );
    });
    if (!pairsOk || owner.size !== n * n) return;

    for (let r = 0; r < n - 1; r += 1) {
      for (let c = 0; c < n - 1; c += 1) {
        const a = owner.get(`${r}-${c}`);
        if (
          a &&
          a === owner.get(`${r}-${c + 1}`) &&
          a === owner.get(`${r + 1}-${c}`) &&
          a === owner.get(`${r + 1}-${c + 1}`)
        ) {
          return;
        }
      }
    }

    soundEngine.playCorrect(3);
    setSolvedMap((prev) => ({ ...prev, [level.id]: true }));
    if (!isCompleted) {
      onComplete(60);
    }
  };

  const selectLevel = (idx: number) => {
    soundEngine.playClick();
    setLevelIdx(idx);
    setPaths({});
    setDrawingPair(null);
    setShowHint(false);
  };

  const handleCellDown = (r: number, c: number) => {
    const ep = endpointAt.get(`${r}-${c}`);
    if (ep !== undefined) {
      soundEngine.playClick();
      setDrawingPair(ep);
      setPaths((prev) => ({ ...prev, [ep]: [[r, c]] }));
      return;
    }

    // Check if clicking an existing path cell to resume or truncate from it
    for (const [numStr, pts] of Object.entries(paths)) {
      const idx = pts.findIndex(([pr, pc]) => pr === r && pc === c);
      if (idx >= 0) {
        const num = Number(numStr);
        soundEngine.playClick();
        setDrawingPair(num);
        setPaths((prev) => ({ ...prev, [num]: pts.slice(0, idx + 1) }));
        return;
      }
    }

    // If user already has an active drawingPair and taps an adjacent empty cell (mobile tap-step friendly!)
    if (drawingPair !== null) {
      handleCellEnter(r, c);
    }
  };

  const handleCellEnter = (r: number, c: number) => {
    if (drawingPair === null) return;
    const pts = paths[drawingPair] ?? [];
    if (pts.length === 0) return;

    const head = pts[pts.length - 1];
    if (head[0] === r && head[1] === c) return;

    // Backtrack if moving onto the previous cell in the same path
    if (pts.length >= 2) {
      const prevCell = pts[pts.length - 2];
      if (prevCell[0] === r && prevCell[1] === c) {
        setPaths((prev) => ({ ...prev, [drawingPair]: pts.slice(0, -1) }));
        return;
      }
    }

    // If we already reached the opposite endpoint, stop extending past it
    const [eA, eB] = level.endpoints[drawingPair];
    const startPt = pts[0];
    const targetPt = startPt[0] === eA[0] && startPt[1] === eA[1] ? eB : eA;
    if (pts.length >= 2 && head[0] === targetPt[0] && head[1] === targetPt[1]) {
      return;
    }

    if (!isAdjacent(head, [r, c])) return;

    // Cannot step onto another pair's endpoint
    const ep = endpointAt.get(`${r}-${c}`);
    if (ep !== undefined && ep !== drawingPair) return;

    // Cannot step onto a cell already in this path (unless truncated earlier)
    const selfIdx = pts.findIndex(([pr, pc]) => pr === r && pc === c);
    if (selfIdx >= 0) {
      setPaths((prev) => ({ ...prev, [drawingPair]: pts.slice(0, selfIdx + 1) }));
      return;
    }

    // Cut any OTHER path that occupies (r, c)
    const nextPaths: Record<number, [number, number][]> = {};
    for (const [kStr, kPts] of Object.entries(paths)) {
      const k = Number(kStr);
      if (k === drawingPair) continue;
      const hitIdx = kPts.findIndex(([pr, pc]) => pr === r && pc === c);
      if (hitIdx >= 0) {
        nextPaths[k] = kPts.slice(0, hitIdx);
      } else {
        nextPaths[k] = kPts;
      }
    }

    const updatedCurrent = [...pts, [r, c] as [number, number]];
    nextPaths[drawingPair] = updatedCurrent;
    setPaths(nextPaths);

    if (r === targetPt[0] && c === targetPt[1]) {
      soundEngine.playSlideFlip();
      setDrawingPair(null);
      checkAndTriggerVictory(nextPaths);
    }
  };

  const clearPair = (num: number) => {
    soundEngine.playClick();
    setPaths((prev) => {
      const copy = { ...prev };
      delete copy[num];
      return copy;
    });
    if (drawingPair === num) setDrawingPair(null);
  };

  const cellSize = n === 6 ? 50 : 44;
  const boardPx = n * cellSize;

  return (
    <div
      onPointerUp={() => setDrawingPair(null)}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm sm:space-y-6 sm:p-6 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 4 星門分流樞紐
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
            數連 Numberlink · 航線不相交挑戰
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
            依講義第 3–4 頁規則：拖曳或依序點選格線，將相同數字連起來！路線不可交叉、不可出現 2×2 同色方塊，且須鋪滿所有空格。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowHint((v) => !v);
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <HelpCircle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <span>{showHint ? '隱藏破關策略' : '查看策略提示'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setPaths({});
              setDrawingPair(null);
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>全部清除</span>
          </button>
        </div>
      </div>

      {/* Level Switcher */}
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((lv, idx) => (
          <button
            key={lv.id}
            type="button"
            onClick={() => selectLevel(idx)}
            className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold ${
              idx === levelIdx
                ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                : solvedMap[lv.id]
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {solvedMap[lv.id] ? '✓ ' : ''}
            {lv.title}
          </button>
        ))}
      </div>

      {showHint && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <strong>Blue 老師技巧（由外到內）：</strong>
          {level.hint}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12">
        {/* Board */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-900 p-4 sm:p-6 lg:col-span-6 dark:border-slate-800 dark:bg-[#080D1A]">
          <div className="mb-3 flex w-full max-w-[350px] items-center justify-between text-xs text-slate-300">
            <span>{drawingPair ? `正在繪製航線 #${drawingPair}（可拖曳或點鄰格）` : '點住數字起點並拖曳連線'}</span>
            <span className="font-mono font-bold text-cyan-300 tabular-nums">
              已覆蓋 {validation.filledCells}/{validation.totalCells}
            </span>
          </div>

          <div
            className="relative touch-none select-none overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-950 shadow-inner"
            style={{ width: boardPx, height: boardPx }}
            onPointerLeave={() => {
              // Keep drawingPair if user prefers tap-step on mobile; pointerup resets drag
            }}
          >
            {/* SVG Paths Overlay */}
            <svg
              width={boardPx}
              height={boardPx}
              viewBox={`0 0 ${boardPx} ${boardPx}`}
              className="pointer-events-none absolute inset-0 z-10"
            >
              {Object.entries(paths).map(([numStr, pts]) => {
                const num = Number(numStr);
                if (pts.length < 2) return null;
                const style = PAIR_STYLES[num] ?? PAIR_STYLES[1];
                const d = pts
                  .map(([r, c], idx) => {
                    const x = c * cellSize + cellSize / 2;
                    const y = r * cellSize + cellSize / 2;
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');
                return (
                  <path
                    key={`path-${num}`}
                    d={d}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={cellSize * 0.34}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={validation.completedPairs[num] ? 0.95 : 0.72}
                  />
                );
              })}
            </svg>

            {/* Interactive Cells */}
            <div
              className="relative z-20 grid h-full w-full"
              style={{
                gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${n}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: n }, (_, r) =>
                Array.from({ length: n }, (_, c) => {
                  const key = `${r}-${c}`;
                  const ep = endpointAt.get(key);
                  const owner = cellOwner.get(key);
                  const epStyle = ep !== undefined ? PAIR_STYLES[ep] : null;
                  const isActiveHead =
                    drawingPair !== null &&
                    (paths[drawingPair]?.slice(-1)[0]?.[0] === r &&
                      paths[drawingPair]?.slice(-1)[0]?.[1] === c);

                  return (
                    <button
                      key={key}
                      type="button"
                      data-sfx="custom"
                      aria-label={`第 ${r + 1} 列第 ${c + 1} 行${ep ? ` 數字 ${ep}` : ''}`}
                      onPointerDown={(e) => {
                        e.currentTarget.releasePointerCapture?.(e.pointerId);
                        handleCellDown(r, c);
                      }}
                      onPointerEnter={(e) => {
                        if (e.buttons > 0 || drawingPair !== null) {
                          // Only auto-extend on hover when pointer is actively pressed
                          if (e.buttons > 0) handleCellEnter(r, c);
                        }
                      }}
                      onClick={() => {
                        // Tap-to-step fallback for touch screens
                        if (drawingPair !== null && ep === undefined) {
                          handleCellEnter(r, c);
                        }
                      }}
                      className={`relative flex items-center justify-center border border-slate-800/80 transition-colors ${
                        isActiveHead ? 'bg-white/10' : owner ? 'bg-white/[0.03]' : 'hover:bg-white/[0.06]'
                      }`}
                    >
                      {ep !== undefined && epStyle && (
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-mono text-sm font-extrabold shadow-md transition-transform ${
                            drawingPair === ep ? 'scale-110 ring-2 ring-white' : ''
                          }`}
                          style={{
                            backgroundColor: epStyle.bg,
                            borderColor: epStyle.border,
                            color: epStyle.text,
                          }}
                        >
                          {ep}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Telemetry & Pair Status */}
        <div className="space-y-4 lg:col-span-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="text-sm font-bold text-slate-900 dark:text-white">{level.title}</div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{level.subtitle}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {Object.keys(level.endpoints)
                .map(Number)
                .map((num) => {
                  const st = PAIR_STYLES[num] ?? PAIR_STYLES[1];
                  const done = validation.completedPairs[num];
                  const active = drawingPair === num;
                  return (
                    <div
                      key={num}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold ${
                        done
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                          : active
                          ? 'border-sky-400 bg-sky-50 text-sky-900 dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-200'
                          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-extrabold"
                          style={{ backgroundColor: st.bg, color: st.text }}
                        >
                          {num}
                        </span>
                        <span>{done ? '已接通' : '未完成'}</span>
                      </span>
                      {(paths[num]?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => clearPair(num)}
                          title={`清除航線 ${num}`}
                          className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 text-sm leading-relaxed ${
              validation.cleared
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                : validation.blocks2x2.length > 0
                ? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-300'
            }`}
          >
            {validation.cleared ? (
              <div className="flex items-center gap-2 font-bold">
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>太強了！全部航線接通、所有空格鋪滿，且沒有任何 2×2 同色方塊！</span>
              </div>
            ) : validation.blocks2x2.length > 0 ? (
              <div>
                偵測到 {validation.blocks2x2.length} 處「2×2 同色方塊」，請稍微拉直轉折路線，避免同色擠成一團喔！
              </div>
            ) : validation.allPairsDone && !validation.allCovered ? (
              <div>
                所有數字都連通了！但還有 {validation.totalCells - validation.filledCells} 個空格未經過，試著讓其中一條航線繞道覆蓋所有格子！
              </div>
            ) : (
              <div>
                操作提示：按住任一數字起點拖曳至相同數字終點；在手機上也可先點起點再逐格點擊延伸，或點現有路線中段重新修正。
              </div>
            )}
          </div>

          {isCompleted && (
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>數連 Numberlink 過關（＋60分已領取）</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
