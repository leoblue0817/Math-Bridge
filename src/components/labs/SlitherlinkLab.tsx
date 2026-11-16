import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, HelpCircle, RotateCcw, Timer } from 'lucide-react';
import { SLITHERLINK_PUZZLES } from '../../data/puzzles';

interface SlitherlinkLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

type EdgeVal = 0 | 1 | 2; // 0: empty, 1: line, 2: cross (X)

function createEdges(n: number) {
  return {
    h: Array.from({ length: n + 1 }, () => Array<EdgeVal>(n).fill(0)),
    v: Array.from({ length: n }, () => Array<EdgeVal>(n + 1).fill(0)),
  };
}

function validateSlitherlink(
  clues: (number | null)[][],
  h: EdgeVal[][],
  v: EdgeVal[][]
): { ok: boolean; reason: string } {
  const n = clues.length;

  // 1. Check all clues
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      const target = clues[r][c];
      if (target !== null) {
        const cnt =
          (h[r][c] === 1 ? 1 : 0) +
          (h[r + 1][c] === 1 ? 1 : 0) +
          (v[r][c] === 1 ? 1 : 0) +
          (v[r][c + 1] === 1 ? 1 : 0);
        if (cnt !== target) {
          return {
            ok: false,
            reason: `第 ${r + 1} 列第 ${c + 1} 欄數字 ${target} 周圍目前有 ${cnt} 條邊，數量不符。`,
          };
        }
      }
    }
  }

  // 2. Check vertex degrees (each vertex has 0 or 2 lines) & single connected loop
  const totalVerts = (n + 1) * (n + 1);
  const adj: number[][] = Array.from({ length: totalVerts }, () => []);
  let edgeCount = 0;

  for (let r = 0; r <= n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (h[r][c] === 1) {
        const u = r * (n + 1) + c;
        const w = r * (n + 1) + c + 1;
        adj[u].push(w);
        adj[w].push(u);
        edgeCount += 1;
      }
    }
  }
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c <= n; c += 1) {
      if (v[r][c] === 1) {
        const u = r * (n + 1) + c;
        const w = (r + 1) * (n + 1) + c;
        adj[u].push(w);
        adj[w].push(u);
        edgeCount += 1;
      }
    }
  }

  if (edgeCount === 0) {
    return { ok: false, reason: '還沒畫出任何迴圈邊線喔！' };
  }

  let start = -1;
  let activeVerts = 0;
  for (let i = 0; i < totalVerts; i += 1) {
    if (adj[i].length !== 0 && adj[i].length !== 2) {
      return { ok: false, reason: '迴圈出現分岔或斷頭，每個黑點只能連 0 條或 2 條線！' };
    }
    if (adj[i].length === 2) {
      activeVerts += 1;
      if (start === -1) start = i;
    }
  }

  const visited = new Set<number>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nxt of adj[cur]) {
      if (!visited.has(nxt)) {
        visited.add(nxt);
        queue.push(nxt);
      }
    }
  }

  if (visited.size !== activeVerts) {
    return { ok: false, reason: '只能連成「唯一一條」封閉大迴圈，不能拆成兩個小圈喔！' };
  }

  return { ok: true, reason: '完美封閉單迴圈！所有數字條件皆完全符合！' };
}

export function SlitherlinkLab({ isCompleted, onComplete }: SlitherlinkLabProps) {
  const [levelIdx, setLevelIdx] = useState(0);
  const puzzle = SLITHERLINK_PUZZLES[levelIdx];
  const [edges, setEdges] = useState(() => createEdges(puzzle.size));
  const [solvedMap, setSolvedMap] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showHint, setShowHint] = useState(false);

  // 25:00 Timer
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(true);

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [timerRunning, secondsLeft]);

  const selectLevel = (idx: number) => {
    const next = SLITHERLINK_PUZZLES[idx];
    setLevelIdx(idx);
    setEdges(createEdges(next.size));
    setFeedback(null);
    setShowHint(false);
  };

  const cycleEdge = (type: 'h' | 'v', r: number, c: number) => {
    setFeedback(null);
    setEdges((prev) => {
      const nextH = prev.h.map((row) => [...row]);
      const nextV = prev.v.map((row) => [...row]);
      if (type === 'h') nextH[r][c] = ((nextH[r][c] + 1) % 3) as EdgeVal;
      else nextV[r][c] = ((nextV[r][c] + 1) % 3) as EdgeVal;
      return { h: nextH, v: nextV };
    });
  };

  const handleCheck = () => {
    const res = validateSlitherlink(puzzle.clues, edges.h, edges.v);
    setFeedback({ ok: res.ok, msg: res.reason });
    if (res.ok) {
      const nextSolved = { ...solvedMap, [puzzle.id]: true };
      setSolvedMap(nextSolved);
      if (!isCompleted) {
        onComplete(60);
      }
    }
  };

  const totalEarned = useMemo(
    () => SLITHERLINK_PUZZLES.reduce((acc, p) => acc + (solvedMap[p.id] ? p.points : 0), 0),
    [solvedMap]
  );

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const n = puzzle.size;
  const gap = 58;
  const pad = 26;
  const svgSize = pad * 2 + n * gap;

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 4 邏輯推理
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            凱旋而歸－數迴（Slitherlink）
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            點擊兩點之間循環切換：<span className="font-semibold text-sky-700 dark:text-cyan-300">畫線</span> →{' '}
            <span className="font-semibold text-rose-600 dark:text-rose-300">標記 ×（不畫線）</span> → 清空。連成唯一封閉迴圈！
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
            累計得分：{totalEarned} / 80 分
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SLITHERLINK_PUZZLES.map((p, idx) => (
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
          <span>清空棋盤</span>
        </button>
        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{showHint ? '隱藏提示' : '查看提示'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-900 p-6 lg:col-span-6 dark:border-slate-800 dark:bg-[#080D1A]">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} role="img" aria-label="數迴棋盤">
            {/* Clues */}
            {puzzle.clues.map((row, r) =>
              row.map((val, c) => {
                if (val === null) return null;
                const cnt =
                  (edges.h[r][c] === 1 ? 1 : 0) +
                  (edges.h[r + 1][c] === 1 ? 1 : 0) +
                  (edges.v[r][c] === 1 ? 1 : 0) +
                  (edges.v[r][c + 1] === 1 ? 1 : 0);
                const textColor =
                  cnt === val ? '#34D399' : cnt > val ? '#FB7185' : '#E2E8F0';
                return (
                  <text
                    key={`clue-${r}-${c}`}
                    x={pad + c * gap + gap / 2}
                    y={pad + r * gap + gap / 2 + 8}
                    textAnchor="middle"
                    fill={textColor}
                    fontSize={22}
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {val}
                  </text>
                );
              })
            )}

            {/* Horizontal edges */}
            {edges.h.map((row, r) =>
              row.map((val, c) => {
                const x1 = pad + c * gap;
                const x2 = x1 + gap;
                const y = pad + r * gap;
                const mx = (x1 + x2) / 2;
                return (
                  <g key={`h-${r}-${c}`}>
                    <line
                      x1={x1}
                      y1={y}
                      x2={x2}
                      y2={y}
                      stroke="transparent"
                      strokeWidth={22}
                      className="cursor-pointer"
                      onClick={() => cycleEdge('h', r, c)}
                    />
                    <line
                      x1={x1}
                      y1={y}
                      x2={x2}
                      y2={y}
                      stroke={val === 1 ? '#38BDF8' : 'rgba(148,163,184,0.2)'}
                      strokeWidth={val === 1 ? 5.5 : 2}
                      strokeDasharray={val === 1 ? undefined : '4,4'}
                      strokeLinecap="round"
                      className="pointer-events-none"
                    />
                    {val === 2 && (
                      <text
                        x={mx}
                        y={y + 4}
                        textAnchor="middle"
                        fill="#FB7185"
                        fontSize={13}
                        fontWeight="700"
                        className="pointer-events-none"
                      >
                        ×
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {/* Vertical edges */}
            {edges.v.map((row, r) =>
              row.map((val, c) => {
                const x = pad + c * gap;
                const y1 = pad + r * gap;
                const y2 = y1 + gap;
                const my = (y1 + y2) / 2;
                return (
                  <g key={`v-${r}-${c}`}>
                    <line
                      x1={x}
                      y1={y1}
                      x2={x}
                      y2={y2}
                      stroke="transparent"
                      strokeWidth={22}
                      className="cursor-pointer"
                      onClick={() => cycleEdge('v', r, c)}
                    />
                    <line
                      x1={x}
                      y1={y1}
                      x2={x}
                      y2={y2}
                      stroke={val === 1 ? '#38BDF8' : 'rgba(148,163,184,0.2)'}
                      strokeWidth={val === 1 ? 5.5 : 2}
                      strokeDasharray={val === 1 ? undefined : '4,4'}
                      strokeLinecap="round"
                      className="pointer-events-none"
                    />
                    {val === 2 && (
                      <text
                        x={x}
                        y={my + 4}
                        textAnchor="middle"
                        fill="#FB7185"
                        fontSize={13}
                        fontWeight="700"
                        className="pointer-events-none"
                      >
                        ×
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {/* Vertices */}
            {Array.from({ length: n + 1 }, (_, r) =>
              Array.from({ length: n + 1 }, (_, c) => (
                <circle
                  key={`dot-${r}-${c}`}
                  cx={pad + c * gap}
                  cy={pad + r * gap}
                  r={4.5}
                  fill="#F1F5F9"
                  stroke="#0F172A"
                  strokeWidth={1.5}
                  className="pointer-events-none"
                />
              ))
            )}
          </svg>
        </div>

        <div className="space-y-4 lg:col-span-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {puzzle.title} · {puzzle.subtitle}
            </div>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <li>• 數字代表該方格四條邊中必須有幾條實線。</li>
              <li>• 數字顯示綠色代表目前邊數已符合，紅色代表邊數超過囉。</li>
              <li>• 所有畫出的線必須連成「單一、無交叉、無分岔」的封閉迴圈。</li>
            </ul>

            <button
              type="button"
              onClick={handleCheck}
              className="mt-4 w-full rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              檢查數迴解答
            </button>
          </div>

          {showHint && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <span className="font-bold">破關提示：</span>
              {puzzle.hint}
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
              <span>數迴挑戰過關（＋60分已領取）</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
