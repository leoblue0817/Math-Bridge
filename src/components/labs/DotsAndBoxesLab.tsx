import { useEffect, useState } from 'react';
import { RotateCcw, Users, Bot } from 'lucide-react';

interface DotsAndBoxesLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

type DotsMode = 'basic' | 'adv';
type OpponentMode = 'ai' | 'pvp';

interface DotsGameState {
  n: number;
  mode: DotsMode;
  opponent: OpponentMode;
  h: number[][];
  v: number[][];
  boxes: number[][];
  boxVals: number[][];
  turn: 1 | 2;
  scores: [number, number, number];
  over: boolean;
  msg: string;
}

function createDotsState(n: number, mode: DotsMode, opponent: OpponentMode): DotsGameState {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let k = 0;
  const boxVals = Array.from({ length: n - 1 }, () =>
    Array.from({ length: n - 1 }, () => (mode === 'adv' ? pool[k++] : 1))
  );

  return {
    n,
    mode,
    opponent,
    h: Array.from({ length: n }, () => Array(n - 1).fill(0)),
    v: Array.from({ length: n - 1 }, () => Array(n).fill(0)),
    boxes: Array.from({ length: n - 1 }, () => Array(n - 1).fill(0)),
    boxVals,
    turn: 1,
    scores: [0, 0, 0],
    over: false,
    msg: '輪到藍方先手！點擊相鄰兩點間的虛線連線，圍成正方形可佔領並「再畫一線」。',
  };
}

function countSides(h: number[][], v: number[][], r: number, c: number): number {
  return (
    (h[r][c] ? 1 : 0) +
    (h[r + 1][c] ? 1 : 0) +
    (v[r][c] ? 1 : 0) +
    (v[r][c + 1] ? 1 : 0)
  );
}

function stepGame(
  prev: DotsGameState,
  type: 'h' | 'v',
  r: number,
  c: number,
  player: 1 | 2
): DotsGameState | null {
  if (prev.over || prev.turn !== player) return null;
  if (type === 'h' && prev.h[r][c] !== 0) return null;
  if (type === 'v' && prev.v[r][c] !== 0) return null;

  const nextH = prev.h.map((row) => [...row]);
  const nextV = prev.v.map((row) => [...row]);
  const nextBoxes = prev.boxes.map((row) => [...row]);
  const nextScores: [number, number, number] = [...prev.scores];

  if (type === 'h') nextH[r][c] = player;
  else nextV[r][c] = player;

  let scored = false;
  const n = prev.n;
  for (let br = 0; br < n - 1; br += 1) {
    for (let bc = 0; bc < n - 1; bc += 1) {
      if (nextBoxes[br][bc] === 0 && countSides(nextH, nextV, br, bc) === 4) {
        nextBoxes[br][bc] = player;
        nextScores[player] += prev.boxVals[br][bc];
        scored = true;
      }
    }
  }

  const p2Name = prev.opponent === 'ai' ? '太空 AI' : '橘方';
  const allDone = nextBoxes.every((row) => row.every((cell) => cell !== 0));
  if (allDone) {
    let endMsg = '';
    if (nextScores[1] > nextScores[2]) {
      endMsg = `比賽結束！藍方 ${nextScores[1]} 分勝過 ${p2Name} ${nextScores[2]} 分！`;
    } else if (nextScores[2] > nextScores[1]) {
      endMsg = `比賽結束！${p2Name} ${nextScores[2]} 分獲勝！`;
    } else {
      endMsg = `比賽結束！雙方 ${nextScores[1]} : ${nextScores[2]} 平手！`;
    }
    return {
      ...prev,
      h: nextH,
      v: nextV,
      boxes: nextBoxes,
      scores: nextScores,
      over: true,
      msg: endMsg,
    };
  }

  const nextTurn: 1 | 2 = scored ? player : player === 1 ? 2 : 1;
  let msg = '';
  if (scored) {
    msg =
      player === 1
        ? '藍方佔領方格！依規定必須「再畫一線」。'
        : `${p2Name}佔領方格！必須「再畫一線」。`;
  } else {
    msg = nextTurn === 1 ? '輪到藍方畫線！' : prev.opponent === 'ai' ? '太空 AI 思考中…' : '輪到橘方畫線！';
  }

  return {
    ...prev,
    h: nextH,
    v: nextV,
    boxes: nextBoxes,
    scores: nextScores,
    turn: nextTurn,
    msg,
  };
}

export function DotsAndBoxesLab({ isCompleted, onComplete }: DotsAndBoxesLabProps) {
  const [game, setGame] = useState<DotsGameState>(() => createDotsState(4, 'basic', 'ai'));

  useEffect(() => {
    if (game.over && !isCompleted) {
      onComplete(60);
    }
  }, [game.over, isCompleted, onComplete]);

  useEffect(() => {
    if (game.over || game.opponent !== 'ai' || game.turn !== 2) return;

    const timer = window.setTimeout(() => {
      setGame((curr) => {
        if (curr.over || curr.opponent !== 'ai' || curr.turn !== 2) return curr;
        const n = curr.n;
        const moves: { type: 'h' | 'v'; r: number; c: number }[] = [];

        for (let r = 0; r < n; r += 1) {
          for (let c = 0; c < n - 1; c += 1) {
            if (curr.h[r][c] === 0) moves.push({ type: 'h', r, c });
          }
        }
        for (let r = 0; r < n - 1; r += 1) {
          for (let c = 0; c < n; c += 1) {
            if (curr.v[r][c] === 0) moves.push({ type: 'v', r, c });
          }
        }
        if (moves.length === 0) return curr;

        const adjBoxes = (m: { type: 'h' | 'v'; r: number; c: number }) => {
          const res: [number, number][] = [];
          if (m.type === 'h') {
            if (m.r > 0) res.push([m.r - 1, m.c]);
            if (m.r < n - 1) res.push([m.r, m.c]);
          } else {
            if (m.c > 0) res.push([m.r, m.c - 1]);
            if (m.c < n - 1) res.push([m.r, m.c]);
          }
          return res;
        };

        const scoring = moves.filter((m) =>
          adjBoxes(m).some(([br, bc]) => countSides(curr.h, curr.v, br, bc) === 3)
        );
        let chosen;
        if (scoring.length > 0) {
          chosen = scoring[Math.floor(Math.random() * scoring.length)];
        } else {
          const safe = moves.filter((m) =>
            adjBoxes(m).every(([br, bc]) => countSides(curr.h, curr.v, br, bc) < 2)
          );
          const pool = safe.length > 0 ? safe : moves;
          chosen = pool[Math.floor(Math.random() * pool.length)];
        }

        return stepGame(curr, chosen.type, chosen.r, chosen.c, 2) ?? curr;
      });
    }, 420);

    return () => window.clearTimeout(timer);
  }, [game.over, game.opponent, game.turn, game.h, game.v]);

  const handleEdgeClick = (type: 'h' | 'v', r: number, c: number) => {
    if (game.over) return;
    if (game.opponent === 'ai' && game.turn !== 1) return;
    setGame((curr) => stepGame(curr, type, r, c, curr.turn) ?? curr);
  };

  const n = game.n;
  const gap = n === 4 ? 76 : n === 5 ? 60 : 48;
  const pad = 26;
  const svgSize = pad * 2 + (n - 1) * gap;

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 1 奇偶性質對戰
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            點格棋－圍方格（點格對決）
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            支援課堂「雙人同機 PK」與「單人挑戰太空 AI」。佔領方格後必須連續畫線，體驗奇偶數如何決定能否平手！
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGame(createDotsState(game.n, game.mode, 'ai'))}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              game.opponent === 'ai'
                ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            <span>VS 太空 AI</span>
          </button>
          <button
            type="button"
            onClick={() => setGame(createDotsState(game.n, game.mode, 'pvp'))}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              game.opponent === 'pvp'
                ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>雙人同機 PK</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setGame(createDotsState(4, 'basic', game.opponent))}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
            game.n === 4 && game.mode === 'basic'
              ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
              : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          4×4 基本地盤戰
        </button>
        <button
          type="button"
          onClick={() => setGame(createDotsState(4, 'adv', game.opponent))}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
            game.n === 4 && game.mode === 'adv'
              ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
              : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          4×4 進階 1~9 分數戰
        </button>
        <button
          type="button"
          onClick={() => setGame(createDotsState(5, 'basic', game.opponent))}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
            game.n === 5
              ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
              : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          5×5 挑戰模式
        </button>
        <button
          type="button"
          onClick={() => setGame(createDotsState(game.n, game.mode, game.opponent))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>重開</span>
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-900 p-6 lg:col-span-5 dark:border-slate-800 dark:bg-[#080D1A]">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} role="img" aria-label="點格棋棋盤">
            {Array.from({ length: n - 1 }, (_, r) =>
              Array.from({ length: n - 1 }, (_, c) => {
                const x = pad + c * gap;
                const y = pad + r * gap;
                const owner = game.boxes[r][c];
                const val = game.boxVals[r][c];
                const fill =
                  owner === 1
                    ? 'rgba(56,189,248,0.25)'
                    : owner === 2
                    ? 'rgba(251,191,36,0.25)'
                    : 'rgba(255,255,255,0.02)';
                const color =
                  owner === 1 ? '#7DD3FC' : owner === 2 ? '#FCD34D' : 'rgba(148,163,184,0.65)';
                return (
                  <g key={`b-${r}-${c}`}>
                    <rect x={x + 5} y={y + 5} width={gap - 10} height={gap - 10} rx={8} fill={fill} />
                    {(game.mode === 'adv' || owner !== 0) && (
                      <text
                        x={x + gap / 2}
                        y={y + gap / 2 + 5}
                        textAnchor="middle"
                        fill={color}
                        fontSize={owner !== 0 ? 12 : 17}
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {owner !== 0 ? `${owner === 1 ? '藍' : '橘'}+${val}` : val}
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {Array.from({ length: n }, (_, r) =>
              Array.from({ length: n - 1 }, (_, c) => {
                const x1 = pad + c * gap;
                const x2 = x1 + gap;
                const y = pad + r * gap;
                const owner = game.h[r][c];
                const stroke =
                  owner === 1 ? '#38BDF8' : owner === 2 ? '#FBBF24' : 'rgba(148,163,184,0.28)';
                const clickable = owner === 0 && !game.over && (game.opponent === 'pvp' || game.turn === 1);
                return (
                  <g key={`h-${r}-${c}`}>
                    <line
                      x1={x1}
                      y1={y}
                      x2={x2}
                      y2={y}
                      stroke="transparent"
                      strokeWidth={22}
                      className={clickable ? 'cursor-pointer' : ''}
                      onClick={() => handleEdgeClick('h', r, c)}
                    />
                    <line
                      x1={x1}
                      y1={y}
                      x2={x2}
                      y2={y}
                      stroke={stroke}
                      strokeWidth={owner ? 6 : 3}
                      strokeDasharray={owner ? undefined : '5,5'}
                      strokeLinecap="round"
                      className="pointer-events-none"
                    />
                  </g>
                );
              })
            )}

            {Array.from({ length: n - 1 }, (_, r) =>
              Array.from({ length: n }, (_, c) => {
                const x = pad + c * gap;
                const y1 = pad + r * gap;
                const y2 = y1 + gap;
                const owner = game.v[r][c];
                const stroke =
                  owner === 1 ? '#38BDF8' : owner === 2 ? '#FBBF24' : 'rgba(148,163,184,0.28)';
                const clickable = owner === 0 && !game.over && (game.opponent === 'pvp' || game.turn === 1);
                return (
                  <g key={`v-${r}-${c}`}>
                    <line
                      x1={x}
                      y1={y1}
                      x2={x}
                      y2={y2}
                      stroke="transparent"
                      strokeWidth={22}
                      className={clickable ? 'cursor-pointer' : ''}
                      onClick={() => handleEdgeClick('v', r, c)}
                    />
                    <line
                      x1={x}
                      y1={y1}
                      x2={x}
                      y2={y2}
                      stroke={stroke}
                      strokeWidth={owner ? 6 : 3}
                      strokeDasharray={owner ? undefined : '5,5'}
                      strokeLinecap="round"
                      className="pointer-events-none"
                    />
                  </g>
                );
              })
            )}

            {Array.from({ length: n }, (_, r) =>
              Array.from({ length: n }, (_, c) => (
                <circle
                  key={`d-${r}-${c}`}
                  cx={pad + c * gap}
                  cy={pad + r * gap}
                  r={5.5}
                  fill="#E2E8F0"
                  stroke="#0F172A"
                  strokeWidth={2}
                  className="pointer-events-none"
                />
              ))
            )}
          </svg>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`rounded-xl border p-4 text-center ${
                !game.over && game.turn === 1
                  ? 'border-sky-400 bg-sky-50 dark:border-cyan-400 dark:bg-cyan-500/10'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#080D1A]'
              }`}
            >
              <div className="text-xs font-medium text-sky-700 dark:text-cyan-300">藍方（先手）</div>
              <div className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
                {game.scores[1]}
              </div>
            </div>
            <div
              className={`rounded-xl border p-4 text-center ${
                !game.over && game.turn === 2
                  ? 'border-amber-400 bg-amber-50 dark:border-amber-400 dark:bg-amber-500/10'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#080D1A]'
              }`}
            >
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {game.opponent === 'ai' ? '太空 AI（後手）' : '橘方（後手）'}
              </div>
              <div className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
                {game.scores[2]}
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 text-sm leading-relaxed ${
              game.over
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-200'
            }`}
          >
            {game.msg}
            {isCompleted && (
              <span className="ml-2 font-semibold text-emerald-700 dark:text-emerald-300">
                （＋60分已領取）
              </span>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-300">
            <div className="mb-1.5 font-bold text-sky-800 dark:text-cyan-300">
              講義引導思考（奇偶必勝秘密）
            </div>
            <p>• 4×4 基本玩法共 9 格（奇數）、4×4 進階共 1＋…＋9＝45 分（奇數），奇數不能平分成兩個相等整數，所以絕對不會平手！</p>
            <p className="mt-1">• 5×5 模式共 16 格（偶數），各佔 8 格時就有可能平手囉！</p>
          </div>
        </div>
      </div>
    </div>
  );
}
