import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, HelpCircle, RotateCcw, Timer } from 'lucide-react';
import { SHIKAKU_PUZZLES } from '../../data/puzzles';

interface ShikakuLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

interface RectBox {
  id: number;
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  colorIdx: number;
}

const RECT_PALETTE = [
  { bg: 'rgba(56, 189, 248, 0.25)', border: '#38BDF8', text: 'text-cyan-200' },
  { bg: 'rgba(251, 191, 36, 0.25)', border: '#FBBF24', text: 'text-amber-200' },
  { bg: 'rgba(52, 211, 153, 0.25)', border: '#34D399', text: 'text-emerald-200' },
  { bg: 'rgba(167, 139, 250, 0.25)', border: '#A78BFA', text: 'text-violet-200' },
  { bg: 'rgba(251, 113, 133, 0.25)', border: '#FB7185', text: 'text-rose-200' },
  { bg: 'rgba(45, 212, 191, 0.25)', border: '#2DD4BF', text: 'text-teal-200' },
];

export function ShikakuLab({ isCompleted, onComplete }: ShikakuLabProps) {
  const [levelIdx, setLevelIdx] = useState(0);
  const puzzle = SHIKAKU_PUZZLES[levelIdx];

  const [rects, setRects] = useState<RectBox[]>([]);
  const [nextId, setNextId] = useState(1);
  const [dragStart, setDragStart] = useState<[number, number] | null>(null);
  const [dragCurr, setDragCurr] = useState<[number, number] | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const boardRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(false);
  const [solvedMap, setSolvedMap] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState<string>(
    '在格子上按住拖曳框出矩形；點擊已畫好的矩形可將它取消！'
  );

  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(true);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [timerRunning, secondsLeft]);

  const selectLevel = (idx: number) => {
    setLevelIdx(idx);
    setRects([]);
    setDragStart(null);
    setDragCurr(null);
    setShowHint(false);
    setStatusMsg('在格子上按住拖曳框出長方形或正方形；點擊已有矩形可刪除。');
  };

  // Validate each placed rect
  const rectValidity = useMemo(() => {
    const res: Record<number, { valid: boolean; area: number; clueCount: number }> = {};
    rects.forEach((box) => {
      const area = (box.r2 - box.r1 + 1) * (box.c2 - box.c1 + 1);
      const insideClues = puzzle.clues.filter(
        (cl) => cl.r >= box.r1 && cl.r <= box.r2 && cl.c >= box.c1 && cl.c <= box.c2
      );
      const valid = insideClues.length === 1 && insideClues[0].val === area;
      res[box.id] = { valid, area, clueCount: insideClues.length };
    });
    return res;
  }, [rects, puzzle]);

  // Check total coverage & win condition
  const coveredCellsCount = useMemo(() => {
    let total = 0;
    rects.forEach((b) => {
      total += (b.r2 - b.r1 + 1) * (b.c2 - b.c1 + 1);
    });
    return total;
  }, [rects]);

  useEffect(() => {
    const totalCells = puzzle.rows * puzzle.cols;
    if (
      coveredCellsCount === totalCells &&
      rects.length === puzzle.clues.length &&
      rects.every((b) => rectValidity[b.id]?.valid)
    ) {
      setStatusMsg(`太棒了！完全切分 ${puzzle.title}，獲得 ${puzzle.points} 分！`);
      setSolvedMap((prev) => ({ ...prev, [puzzle.id]: true }));
      if (!isCompleted) {
        onComplete(60);
      }
    }
  }, [coveredCellsCount, rects, rectValidity, puzzle, isCompleted, onComplete]);

  const commitSelection = useCallback(
    (start: [number, number], end: [number, number]) => {
      const r1 = Math.min(start[0], end[0]);
      const r2 = Math.max(start[0], end[0]);
      const c1 = Math.min(start[1], end[1]);
      const c2 = Math.max(start[1], end[1]);

      // If user clicked a single cell inside an existing rect without dragging, remove that rect
      if (r1 === r2 && c1 === c2) {
        const existing = rects.find(
          (b) => r1 >= b.r1 && r1 <= b.r2 && c1 >= b.c1 && c1 <= b.c2
        );
        if (existing) {
          setRects((prev) => prev.filter((b) => b.id !== existing.id));
          setStatusMsg('已移除該矩形區域。');
          return;
        }
      }

      // Check overlap with existing rects
      const overlaps = rects.some(
        (b) => !(r2 < b.r1 || r1 > b.r2 || c2 < b.c1 || c1 > b.c2)
      );
      if (overlaps) {
        setStatusMsg('矩形不能重疊喔！請先點擊舊矩形取消後再重新框選。');
        return;
      }

      const area = (r2 - r1 + 1) * (c2 - c1 + 1);
      const inside = puzzle.clues.filter(
        (cl) => cl.r >= r1 && cl.r <= r2 && cl.c >= c1 && cl.c <= c2
      );

      const newRect: RectBox = {
        id: nextId,
        r1,
        c1,
        r2,
        c2,
        colorIdx: nextId % RECT_PALETTE.length,
      };
      setNextId((id) => id + 1);
      setRects((prev) => [...prev, newRect]);

      if (inside.length === 0) {
        setStatusMsg(`框選了 ${area} 格，但裡面沒有任何數字喔（需剛好包住 1 個數字）。`);
      } else if (inside.length > 1) {
        setStatusMsg(`裡面包住了 ${inside.length} 個數字！每個矩形只能包含 1 個數字。`);
      } else if (inside[0].val !== area) {
        setStatusMsg(`目前面積為 ${area} 格，但裡面的數字是 ${inside[0].val}，面積還不對喔！`);
      } else {
        setStatusMsg(`✓ 成功框出面積為 ${area} 的矩形！`);
      }
    },
    [rects, puzzle, nextId]
  );

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (dragStart && dragCurr) {
        commitSelection(dragStart, dragCurr);
      }
      setDragStart(null);
      setDragCurr(null);
    };
    const handleGlobalPointerCancel = () => {
      setDragStart(null);
      setDragCurr(null);
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerCancel);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerCancel);
    };
  }, [dragStart, dragCurr, commitSelection]);

  const dragPreview = useMemo(() => {
    if (!dragStart || !dragCurr) return null;
    return {
      r1: Math.min(dragStart[0], dragCurr[0]),
      r2: Math.max(dragStart[0], dragCurr[0]),
      c1: Math.min(dragStart[1], dragCurr[1]),
      c2: Math.max(dragStart[1], dragCurr[1]),
    };
  }, [dragStart, dragCurr]);

  const totalEarned = useMemo(
    () => SHIKAKU_PUZZLES.reduce((acc, p) => acc + (solvedMap[p.id] ? p.points : 0), 0),
    [solvedMap]
  );

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const baseCellSize = puzzle.cols === 7 ? 52 : 64;
  const cellSize =
    viewportWidth < 640
      ? Math.max(38, Math.min(baseCellSize, Math.floor((viewportWidth - 68) / puzzle.cols)))
      : baseCellSize;

  const resolveCellFromPointer = (clientX: number, clientY: number): [number, number] | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const col = Math.floor((clientX - rect.left) / cellSize);
    const row = Math.floor((clientY - rect.top) / cellSize);
    return [
      Math.max(0, Math.min(puzzle.rows - 1, row)),
      Math.max(0, Math.min(puzzle.cols - 1, col)),
    ];
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm sm:space-y-6 sm:p-6 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 6 空間與數形
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
            數方 Shikaku（空間矩形拼圖）
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
            將整張網格切割成若干個「不重疊」的長方形或正方形，每個矩形內恰好包含 1 個數字，且格數面積等於該數字！
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setTimerRunning((v) => !v)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-slate-700 tabular-nums dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Timer className="h-3.5 w-3.5 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
            <span>限時 {mm}:{ss}</span>
          </button>
          <span className="font-mono font-bold text-amber-700 tabular-nums dark:text-amber-300">
            總分統計：{totalEarned} / 90 分
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SHIKAKU_PUZZLES.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectLevel(idx)}
            className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold ${
              levelIdx === idx
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
        <button
          type="button"
          onClick={() => selectLevel(levelIdx)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>清空</span>
        </button>
        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{showHint ? '隱藏提示' : '查看提示'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12">
        {/* Interactive Shikaku Grid */}
        <div className="flex justify-center overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-3 sm:p-6 lg:col-span-7 dark:border-slate-800 dark:bg-[#080D1A]">
          <div
            ref={boardRef}
            onPointerDown={(e) => {
              e.preventDefault();
              const cell = resolveCellFromPointer(e.clientX, e.clientY);
              if (cell) {
                setDragStart(cell);
                setDragCurr(cell);
              }
            }}
            onPointerMove={(e) => {
              if (!dragStart) return;
              const cell = resolveCellFromPointer(e.clientX, e.clientY);
              if (cell && (!dragCurr || cell[0] !== dragCurr[0] || cell[1] !== dragCurr[1])) {
                setDragCurr(cell);
              }
            }}
            className="relative touch-none select-none border-2 border-slate-600 bg-slate-950"
            style={{
              width: puzzle.cols * cellSize,
              height: puzzle.rows * cellSize,
            }}
          >
            {/* Base Cells */}
            <div
              className="grid h-full w-full"
              style={{
                gridTemplateColumns: `repeat(${puzzle.cols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${puzzle.rows}, ${cellSize}px)`,
              }}
            >
              {Array.from({ length: puzzle.rows }, (_, r) =>
                Array.from({ length: puzzle.cols }, (_, c) => {
                  const clue = puzzle.clues.find((cl) => cl.r === r && cl.c === c);
                  return (
                    <div
                      key={`${r}-${c}`}
                      className="flex cursor-crosshair items-center justify-center border border-slate-800/80 font-mono text-lg font-bold text-white tabular-nums sm:text-xl"
                    >
                      {clue ? clue.val : ''}
                    </div>
                  );
                })
              )}
            </div>

            {/* Placed Rectangles Overlay */}
            {rects.map((box) => {
              const pal = RECT_PALETTE[box.colorIdx];
              const info = rectValidity[box.id];
              return (
                <div
                  key={box.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setRects((prev) => prev.filter((b) => b.id !== box.id));
                    setStatusMsg('已移除該矩形區域。');
                  }}
                  title="點擊取消此矩形"
                  className="pointer-events-auto absolute cursor-pointer rounded-sm transition-opacity hover:opacity-80"
                  style={{
                    left: box.c1 * cellSize + 2,
                    top: box.r1 * cellSize + 2,
                    width: (box.c2 - box.c1 + 1) * cellSize - 4,
                    height: (box.r2 - box.r1 + 1) * cellSize - 4,
                    backgroundColor: info?.valid ? pal.bg : 'rgba(244, 63, 94, 0.2)',
                    border: `2.5px solid ${info?.valid ? pal.border : '#FB7185'}`,
                  }}
                >
                  <span
                    className={`absolute right-1 bottom-0.5 font-mono text-[10px] font-bold tabular-nums ${
                      info?.valid ? pal.text : 'text-rose-200'
                    }`}
                  >
                    {info?.valid ? `✓${info.area}` : `${info?.area}格`}
                  </span>
                </div>
              );
            })}

            {/* Active Drag Preview */}
            {dragPreview && (
              <div
                className="pointer-events-none absolute rounded-sm border-2 border-dashed border-cyan-300 bg-cyan-400/20"
                style={{
                  left: dragPreview.c1 * cellSize + 2,
                  top: dragPreview.r1 * cellSize + 2,
                  width: (dragPreview.c2 - dragPreview.c1 + 1) * cellSize - 4,
                  height: (dragPreview.r2 - dragPreview.r1 + 1) * cellSize - 4,
                }}
              >
                <span className="absolute top-1 left-1.5 rounded bg-slate-950/80 px-1.5 py-0.5 font-mono text-xs font-bold text-cyan-200 tabular-nums">
                  {(dragPreview.r2 - dragPreview.r1 + 1) * (dragPreview.c2 - dragPreview.c1 + 1)} 格
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status & Guide */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-900 dark:text-white">{puzzle.title}</span>
              <span className="font-mono font-semibold text-sky-700 tabular-nums dark:text-cyan-300">
                已覆蓋 {coveredCellsCount} / {puzzle.rows * puzzle.cols} 格
              </span>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
              {statusMsg}
            </div>

            <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <li>• 按住拖曳即可畫出矩形（手機/平板也支援手指滑動框選）。</li>
              <li>• 若想重畫某塊，直接點擊該彩色矩形即可移除！</li>
              <li>• 小技巧：先從「質數（如 3、5、7）」或靠近角落、邊界且只有唯一切法的數字下手！</li>
            </ul>
          </div>

          {showHint && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <span className="font-bold">講義提示：</span>
              {puzzle.hint}
            </div>
          )}

          {isCompleted && (
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>數方挑戰過關（＋60分已領取）</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
