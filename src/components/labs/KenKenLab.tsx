import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eraser, HelpCircle, Pencil, RotateCcw, Timer } from 'lucide-react';
import { KENKEN_PUZZLES, KenKenCage } from '../../data/puzzles';

interface KenKenLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

function formatCageLabel(cage: KenKenCage): string {
  const opMap: Record<string, string> = {
    '': '',
    '+': '＋',
    '-': '－',
    '*': '×',
    '/': '÷',
  };
  return `${cage.target}${opMap[cage.op]}`;
}

export function KenKenLab({ isCompleted, onComplete }: KenKenLabProps) {
  const [levelIdx, setLevelIdx] = useState(0);
  const puzzle = KENKEN_PUZZLES[levelIdx];
  const n = puzzle.size;

  const [grid, setGrid] = useState<number[][]>(() =>
    Array.from({ length: n }, () => Array(n).fill(0))
  );
  const [notes, setNotes] = useState<Record<string, number[]>>({});
  const [pencilMode, setPencilMode] = useState(false);
  const [selectedCell, setSelectedCell] = useState<[number, number]>([0, 0]);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [solvedMap, setSolvedMap] = useState<Record<string, boolean>>({});

  // 25:00 Timer matching handout
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(true);

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [timerRunning, secondsLeft]);

  // Map each cell to its cage index & find top-left anchor cell per cage
  const { cellToCage, cageAnchors } = useMemo(() => {
    const map: number[][] = Array.from({ length: n }, () => Array(n).fill(-1));
    const anchors: Record<string, KenKenCage> = {};
    puzzle.cages.forEach((cage, idx) => {
      let topR = n;
      let topC = n;
      cage.cells.forEach(([r, c]) => {
        map[r][c] = idx;
        if (r < topR || (r === topR && c < topC)) {
          topR = r;
          topC = c;
        }
      });
      anchors[`${topR}-${topC}`] = cage;
    });
    return { cellToCage: map, cageAnchors: anchors };
  }, [puzzle, n]);

  const selectLevel = (idx: number) => {
    const next = KENKEN_PUZZLES[idx];
    setLevelIdx(idx);
    setGrid(Array.from({ length: next.size }, () => Array(next.size).fill(0)));
    setNotes({});
    setSelectedCell([0, 0]);
    setShowHint(false);
    setFeedback(null);
  };

  const applyValue = useCallback(
    (val: number) => {
      const [sr, sc] = selectedCell;
      setFeedback(null);
      if (val === 0) {
        setGrid((prev) =>
          prev.map((row, r) => (r === sr ? row.map((v, c) => (c === sc ? 0 : v)) : row))
        );
        setNotes((prev) => {
          const copy = { ...prev };
          delete copy[`${sr}-${sc}`];
          return copy;
        });
        return;
      }

      if (val > n) return;

      if (pencilMode) {
        const key = `${sr}-${sc}`;
        setNotes((prev) => {
          const cur = prev[key] ?? [];
          const exists = cur.includes(val);
          const next = exists ? cur.filter((x) => x !== val) : [...cur, val].sort((a, b) => a - b);
          return { ...prev, [key]: next };
        });
      } else {
        setGrid((prev) =>
          prev.map((row, r) => (r === sr ? row.map((v, c) => (c === sc ? val : v)) : row))
        );
      }
    },
    [selectedCell, n, pencilMode]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '6') {
        applyValue(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        applyValue(0);
      } else if (e.key === 'ArrowUp') {
        setSelectedCell(([r, c]) => [Math.max(0, r - 1), c]);
      } else if (e.key === 'ArrowDown') {
        setSelectedCell(([r, c]) => [Math.min(n - 1, r + 1), c]);
      } else if (e.key === 'ArrowLeft') {
        setSelectedCell(([r, c]) => [r, Math.max(0, c - 1)]);
      } else if (e.key === 'ArrowRight') {
        setSelectedCell(([r, c]) => [r, Math.min(n - 1, c + 1)]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyValue, n]);

  // Duplicate row/col conflicts for live feedback
  const conflicts = useMemo(() => {
    const bad = new Set<string>();
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        const v = grid[r][c];
        if (v === 0) continue;
        for (let k = 0; k < n; k += 1) {
          if (k !== c && grid[r][k] === v) {
            bad.add(`${r}-${c}`);
            bad.add(`${r}-${k}`);
          }
          if (k !== r && grid[k][c] === v) {
            bad.add(`${r}-${c}`);
            bad.add(`${k}-${c}`);
          }
        }
      }
    }
    return bad;
  }, [grid, n]);

  const checkSolution = () => {
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        if (grid[r][c] === 0) {
          setFeedback({ ok: false, msg: '還有空白格子尚未填入數字喔！' });
          return;
        }
      }
    }
    if (conflicts.size > 0) {
      setFeedback({ ok: false, msg: '紅色標記的列或欄有重複數字！' });
      return;
    }

    // Check every cage arithmetic
    for (const cage of puzzle.cages) {
      const vals = cage.cells.map(([r, c]) => grid[r][c]);
      if (cage.op === '' && vals[0] !== cage.target) {
        setFeedback({ ok: false, msg: `單格區域必須填入 ${cage.target}！` });
        return;
      }
      if (cage.op === '+' && vals.reduce((a, b) => a + b, 0) !== cage.target) {
        setFeedback({ ok: false, msg: `「${formatCageLabel(cage)}」區域的總和不符合喔！` });
        return;
      }
      if (cage.op === '*' && vals.reduce((a, b) => a * b, 1) !== cage.target) {
        setFeedback({ ok: false, msg: `「${formatCageLabel(cage)}」區域的乘積不符合喔！` });
        return;
      }
      if (cage.op === '-' && Math.abs(vals[0] - vals[1]) !== cage.target) {
        setFeedback({ ok: false, msg: `「${formatCageLabel(cage)}」區域兩數相差不是 ${cage.target}！` });
        return;
      }
      if (cage.op === '/') {
        const mx = Math.max(vals[0], vals[1]);
        const mn = Math.min(vals[0], vals[1]);
        if (mx / mn !== cage.target) {
          setFeedback({ ok: false, msg: `「${formatCageLabel(cage)}」區域兩數相除不是 ${cage.target}！` });
          return;
        }
      }
    }

    setFeedback({ ok: true, msg: `太強了！成功破解 ${puzzle.title}，獲得 ${puzzle.points} 分！` });
    setSolvedMap((prev) => ({ ...prev, [puzzle.id]: true }));
    if (!isCompleted) {
      onComplete(60);
    }
  };

  const totalEarned = useMemo(
    () => KENKEN_PUZZLES.reduce((acc, p) => acc + (solvedMap[p.id] ? p.points : 0), 0),
    [solvedMap]
  );

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 5 算獨邏輯
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            KenKen 數獨（算獨對決）
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            每列每行填入 1～{n} 不重複，且粗線框內的數字須透過加減乘除湊出左上角目標值！
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setTimerRunning((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-slate-700 tabular-nums dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Timer className="h-3.5 w-3.5 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
            <span>限時 {mm}:{ss}</span>
          </button>
          <span className="font-mono font-bold text-amber-700 tabular-nums dark:text-amber-300">
            總分統計：{totalEarned} / 110 分
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {KENKEN_PUZZLES.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectLevel(idx)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>清空</span>
        </button>
        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{showHint ? '隱藏解題提示' : '查看解題提示'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* KenKen Board */}
        <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-900 p-5 lg:col-span-7 dark:border-slate-800 dark:bg-[#080D1A]">
          <div
            className="grid border-2 border-cyan-300 bg-slate-950"
            style={{
              gridTemplateColumns: `repeat(${n}, minmax(48px, 64px))`,
            }}
          >
            {grid.map((row, r) =>
              row.map((val, c) => {
                const cid = cellToCage[r][c];
                const topSame = r > 0 && cellToCage[r - 1][c] === cid;
                const bottomSame = r < n - 1 && cellToCage[r + 1][c] === cid;
                const leftSame = c > 0 && cellToCage[r][c - 1] === cid;
                const rightSame = c < n - 1 && cellToCage[r][c + 1] === cid;
                const anchor = cageAnchors[`${r}-${c}`];
                const isSel = selectedCell[0] === r && selectedCell[1] === c;
                const isBad = conflicts.has(`${r}-${c}`);
                const cellNotes = notes[`${r}-${c}`] ?? [];

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => setSelectedCell([r, c])}
                    className={`relative flex aspect-square items-center justify-center font-mono text-2xl font-bold tabular-nums transition-colors ${
                      isSel
                        ? 'bg-cyan-500/20'
                        : isBad
                        ? 'bg-rose-500/15'
                        : 'bg-[#0B1221] hover:bg-slate-900'
                    } ${topSame ? 'border-t border-slate-800' : 'border-t-2 border-t-cyan-400'} ${
                      bottomSame ? 'border-b border-slate-800' : 'border-b-2 border-b-cyan-400'
                    } ${leftSame ? 'border-l border-slate-800' : 'border-l-2 border-l-cyan-400'} ${
                      rightSame ? 'border-r border-slate-800' : 'border-r-2 border-r-cyan-400'
                    }`}
                  >
                    {anchor && (
                      <span className="pointer-events-none absolute top-0.5 left-1 font-mono text-[11px] font-bold text-amber-300">
                        {formatCageLabel(anchor)}
                      </span>
                    )}

                    {val > 0 ? (
                      <span className={isBad ? 'text-rose-300' : 'text-white'}>{val}</span>
                    ) : cellNotes.length > 0 ? (
                      <span className="px-1 text-[10px] leading-tight text-slate-400">
                        {cellNotes.join(' ')}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Keypad & Status */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                數字輸入盤（可用鍵盤 1～{n}）
              </span>
              <button
                type="button"
                onClick={() => setPencilMode((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  pencilMode
                    ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                    : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{pencilMode ? '筆記模式：開啟' : '筆記模式：關閉'}</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {Array.from({ length: n }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => applyValue(num)}
                  className="rounded-xl border border-slate-200 bg-white py-3 font-mono text-lg font-bold text-slate-900 hover:border-sky-400 hover:bg-sky-50 tabular-nums dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-cyan-400 dark:hover:bg-cyan-500/15"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => applyValue(0)}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-700 hover:border-rose-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Eraser className="h-4 w-4" aria-hidden="true" />
                <span>清除</span>
              </button>
            </div>

            <button
              type="button"
              onClick={checkSolution}
              className="mt-4 w-full rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              檢查本關解答
            </button>
          </div>

          {showHint && puzzle.hints && (
            <div className="space-y-1.5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="font-bold">講義破題步驟提示：</div>
              {puzzle.hints.map((h, i) => (
                <p key={i}>• {h}</p>
              ))}
            </div>
          )}

          {feedback && (
            <div
              className={`rounded-xl border p-4 text-sm leading-relaxed ${
                feedback.ok
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200'
              }`}
            >
              {feedback.ok ? '✓ ' : '✕ '}
              {feedback.msg}
            </div>
          )}

          {isCompleted && (
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>KenKen 挑戰過關（＋60分已領取）</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
