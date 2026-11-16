import { useEffect, useState } from 'react';
import { CheckCircle2, Delete, RotateCcw, Users, Zap } from 'lucide-react';

interface QuickCalc24LabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

interface CalcCard {
  label: string;
  value: number;
}

interface TargetPuzzle {
  id: string;
  title: string;
  target: number;
  cards: CalcCard[];
  sampleSolution: string;
}

const TARGET_PUZZLES: TargetPuzzle[] = [
  {
    id: 'qc-1',
    title: '熱身關 · 指數湊 24',
    target: 24,
    cards: [
      { label: '2³', value: 8 },
      { label: '3', value: 3 },
      { label: '5', value: 5 },
      { label: '5', value: 5 },
    ],
    sampleSolution: '8 × 3 × (5 ÷ 5) = 24',
  },
  {
    id: 'qc-2',
    title: '進階關 · 湊出 100',
    target: 100,
    cards: [
      { label: '5²', value: 25 },
      { label: '2²', value: 4 },
      { label: '3²', value: 9 },
      { label: '3²', value: 9 },
    ],
    sampleSolution: '25 × 4 × (9 ÷ 9) = 100',
  },
  {
    id: 'qc-3',
    title: '挑戰關 · 分配律湊 24',
    target: 24,
    cards: [
      { label: '2⁴', value: 16 },
      { label: '3²', value: 9 },
      { label: '1', value: 1 },
      { label: '1', value: 1 },
    ],
    sampleSolution: '16 + 9 - 1 × 1 = 24',
  },
  {
    id: 'qc-4',
    title: '高手關 · 分數倒推湊 24',
    target: 24,
    cards: [
      { label: '3', value: 3 },
      { label: '3', value: 3 },
      { label: '2³', value: 8 },
      { label: '2³', value: 8 },
    ],
    sampleSolution: '8 ÷ (3 - 8 ÷ 3) = 24',
  },
];

interface BuzzerRound {
  prompt: string;
  options: string[];
  ansIdx: number;
  exp: string;
}

const BUZZER_ROUNDS: BuzzerRound[] = [
  {
    prompt: '2⁵ ＝ ？',
    options: ['16', '32', '64', '10'],
    ansIdx: 1,
    exp: '2 × 2 × 2 × 2 × 2 ＝ 32',
  },
  {
    prompt: '199 × 25 ＝ ？',
    options: ['4975', '4950', '5025', '4875'],
    ansIdx: 0,
    exp: '(200 － 1) × 25 ＝ 5000 － 25 ＝ 4975',
  },
  {
    prompt: '5³ ＋ 3⁴ ＝ ？',
    options: ['152', '206', '186', '216'],
    ansIdx: 1,
    exp: '125 ＋ 81 ＝ 206',
  },
  {
    prompt: '37×25 ＋ 37×41 ＋ 37×34 ＝ ？',
    options: ['370', '3700', '3600', '7400'],
    ansIdx: 1,
    exp: '37 × (25＋41＋34) ＝ 37 × 100 ＝ 3700',
  },
  {
    prompt: '2¹⁰ － 2⁹ ＝ ？',
    options: ['2', '256', '512', '1024'],
    ansIdx: 2,
    exp: '1024 － 512 ＝ 512（也就是 2⁹）',
  },
];

function safeEvalMath(expr: string): number | null {
  const cleaned = expr.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/');
  if (!cleaned || !/^[0-9+\-*/().]+$/.test(cleaned)) return null;

  let pos = 0;
  const parseExpr = (): number => {
    let left = parseTerm();
    while (pos < cleaned.length && (cleaned[pos] === '+' || cleaned[pos] === '-')) {
      const op = cleaned[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };
  const parseTerm = (): number => {
    let left = parseFactor();
    while (pos < cleaned.length && (cleaned[pos] === '*' || cleaned[pos] === '/')) {
      const op = cleaned[pos++];
      const right = parseFactor();
      if (op === '/' && Math.abs(right) < 1e-9) throw new Error('div0');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  };
  const parseFactor = (): number => {
    if (cleaned[pos] === '(') {
      pos++;
      const val = parseExpr();
      if (cleaned[pos] !== ')') throw new Error('paren');
      pos++;
      return val;
    }
    if (cleaned[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    const start = pos;
    while (pos < cleaned.length && /[0-9.]/.test(cleaned[pos])) pos++;
    if (pos === start) throw new Error('num');
    const num = Number(cleaned.slice(start, pos));
    if (Number.isNaN(num)) throw new Error('nan');
    return num;
  };

  try {
    const val = parseExpr();
    if (pos !== cleaned.length || !Number.isFinite(val)) return null;
    return val;
  } catch {
    return null;
  }
}

interface Token {
  text: string;
  cardIdx?: number;
}

export function QuickCalc24Lab({ isCompleted, onComplete }: QuickCalc24LabProps) {
  const [labMode, setLabMode] = useState<'puzzle' | 'pk'>('puzzle');
  const [puzIdx, setPuzIdx] = useState(0);
  const puzzle = TARGET_PUZZLES[puzIdx];
  const [tokens, setTokens] = useState<Token[]>([]);
  const [usedCards, setUsedCards] = useState<Record<number, boolean>>({});
  const [solvedMap, setSolvedMap] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string>('請依序點擊 4 張數字牌與運算符號，剛好把全部 4 張牌湊成目標值！');

  const [pkRound, setPkRound] = useState(0);
  const [buzzerWinner, setBuzzerWinner] = useState<1 | 2 | null>(null);
  const [pkScores, setPkScores] = useState<[number, number]>([0, 0]);
  const [pkResult, setPkResult] = useState<string | null>(null);

  const currentPk = BUZZER_ROUNDS[pkRound];

  useEffect(() => {
    if (labMode !== 'pk' || buzzerWinner !== null || pkResult !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'q') setBuzzerWinner(1);
      if (e.key.toLowerCase() === 'p') setBuzzerWinner(2);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [labMode, buzzerWinner, pkResult]);

  const selectPuzzle = (idx: number) => {
    setPuzIdx(idx);
    setTokens([]);
    setUsedCards({});
    setMsg('請使用全部 4 張數字牌與運算符號，湊出目標結果！');
  };

  const addCardToken = (idx: number) => {
    if (usedCards[idx]) return;
    setUsedCards((prev) => ({ ...prev, [idx]: true }));
    setTokens((prev) => [...prev, { text: String(puzzle.cards[idx].value), cardIdx: idx }]);
  };

  const addOpToken = (op: string) => {
    setTokens((prev) => [...prev, { text: op }]);
  };

  const popToken = () => {
    if (tokens.length === 0) return;
    const last = tokens[tokens.length - 1];
    if (last.cardIdx !== undefined) {
      setUsedCards((prev) => {
        const copy = { ...prev };
        delete copy[last.cardIdx!];
        return copy;
      });
    }
    setTokens((prev) => prev.slice(0, -1));
  };

  const clearTokens = () => {
    setTokens([]);
    setUsedCards({});
  };

  const evaluatePuzzle = () => {
    const usedCount = Object.keys(usedCards).length;
    if (usedCount !== 4) {
      setMsg(`目前只用了 ${usedCount} 張牌，必須剛好用完 4 張數字牌喔！`);
      return;
    }
    const exprStr = tokens.map((t) => t.text).join(' ');
    const val = safeEvalMath(exprStr);
    if (val === null) {
      setMsg('算式格式不正確，請檢查括號或運算符號是否成對！');
      return;
    }
    if (Math.abs(val - puzzle.target) < 1e-6) {
      setMsg(`✓ 太神了！${exprStr} ＝ ${puzzle.target}，成功過關！`);
      setSolvedMap((prev) => ({ ...prev, [puzzle.id]: true }));
      if (!isCompleted) {
        onComplete(60);
      }
    } else {
      setMsg(`算式結果為 ${Number(val.toFixed(2))}，還不是目標 ${puzzle.target} 喔，再試試！`);
    }
  };

  const handlePkOption = (optIdx: number) => {
    if (!buzzerWinner || pkResult) return;
    const correct = optIdx === currentPk.ansIdx;
    const activePlayer = buzzerWinner;
    const otherPlayer = activePlayer === 1 ? 2 : 1;

    if (correct) {
      setPkScores((prev) => {
        const next: [number, number] = [...prev];
        next[activePlayer - 1] += 20;
        return next;
      });
      setPkResult(`✓ ${activePlayer === 1 ? '藍方' : '橘方'}搶答正確（＋20 分）！解析：${currentPk.exp}`);
    } else {
      setPkScores((prev) => {
        const next: [number, number] = [...prev];
        next[otherPlayer - 1] += 10;
        return next;
      });
      setPkResult(
        `✕ ${activePlayer === 1 ? '藍方' : '橘方'}答錯，對手補血 ＋10 分！解析：${currentPk.exp}`
      );
    }

    if (pkRound + 1 >= BUZZER_ROUNDS.length && !isCompleted) {
      onComplete(60);
    }
  };

  const nextPkRound = () => {
    if (pkRound + 1 < BUZZER_ROUNDS.length) {
      setPkRound((r) => r + 1);
      setBuzzerWinner(null);
      setPkResult(null);
    } else {
      setPkRound(0);
      setPkScores([0, 0]);
      setBuzzerWinner(null);
      setPkResult(null);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 7 四則混合與指數
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            指數與四則速算對決
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            支援單人「指數 24 點湊數挑戰」與教室雙人「搶答 PK 賽」（藍方 Q 鍵 / 橘方 P 鍵）！
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLabMode('puzzle')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              labMode === 'puzzle'
                ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>指數湊數挑戰</span>
          </button>
          <button
            type="button"
            onClick={() => setLabMode('pk')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              labMode === 'pk'
                ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>雙人搶答 PK</span>
          </button>
        </div>
      </div>

      {labMode === 'puzzle' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {TARGET_PUZZLES.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPuzzle(idx)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
                  puzIdx === idx
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

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">目標計算結果：</div>
              <div className="font-mono text-4xl font-bold text-amber-600 tabular-nums dark:text-amber-300">
                {puzzle.target}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-3">
              {puzzle.cards.map((card, idx) => {
                const used = Boolean(usedCards[idx]);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={used}
                    onClick={() => addCardToken(idx)}
                    className={`rounded-xl border py-4 text-center transition-colors ${
                      used
                        ? 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600'
                        : 'border-sky-300 bg-white text-slate-900 hover:bg-sky-50 dark:border-cyan-500/50 dark:bg-cyan-500/10 dark:text-white dark:hover:bg-cyan-500/20'
                    }`}
                  >
                    <div className="font-mono text-2xl font-bold tabular-nums">{card.label}</div>
                    {card.label !== String(card.value) && (
                      <div className="mt-1 font-mono text-xs font-semibold text-sky-700 tabular-nums dark:text-cyan-300">
                        = {card.value}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {['+', '-', '×', '÷', '(', ')'].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => addOpToken(op)}
                  className="min-w-12 rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-lg font-bold text-slate-800 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {op}
                </button>
              ))}
              <button
                type="button"
                onClick={popToken}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-rose-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Delete className="h-4 w-4" aria-hidden="true" />
                <span>退格</span>
              </button>
              <button
                type="button"
                onClick={clearTokens}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>清空</span>
              </button>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950">
              <div className="min-h-8 font-mono text-2xl font-bold text-sky-800 tabular-nums dark:text-cyan-200">
                {tokens.length > 0 ? tokens.map((t) => t.text).join(' ') : '（點擊上方牌與符號組合算式）'}
              </div>
              <button
                type="button"
                onClick={evaluatePuzzle}
                className="shrink-0 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                送出驗算
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300">
              <span>{msg}</span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>已完成速算對決（+60分）</span>
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              disabled={buzzerWinner !== null}
              onClick={() => setBuzzerWinner(1)}
              className={`rounded-xl border p-4 text-center transition-colors ${
                buzzerWinner === 1
                  ? 'border-sky-500 bg-sky-50 dark:border-cyan-400 dark:bg-cyan-500/20'
                  : 'border-slate-200 bg-slate-50 hover:border-sky-400 dark:border-slate-800 dark:bg-[#080D1A] dark:hover:border-cyan-500/50'
              }`}
            >
              <div className="text-xs font-semibold text-sky-700 dark:text-cyan-300">
                藍方（按 Q 鍵或點此搶答）
              </div>
              <div className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
                {pkScores[0]} 分
              </div>
            </button>
            <button
              type="button"
              disabled={buzzerWinner !== null}
              onClick={() => setBuzzerWinner(2)}
              className={`rounded-xl border p-4 text-center transition-colors ${
                buzzerWinner === 2
                  ? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-500/20'
                  : 'border-slate-200 bg-slate-50 hover:border-amber-400 dark:border-slate-800 dark:bg-[#080D1A] dark:hover:border-amber-500/50'
              }`}
            >
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                橘方（按 P 鍵或點此搶答）
              </div>
              <div className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
                {pkScores[1]} 分
              </div>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              搶答回合 {pkRound + 1} / {BUZZER_ROUNDS.length}
              {buzzerWinner
                ? ` · 目前由「${buzzerWinner === 1 ? '藍方' : '橘方'}」取得答題權！`
                : ' · 請按下 Q / P 或點擊上方隊伍搶答'}
            </div>
            <div className="mt-3 font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
              {currentPk.prompt}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {currentPk.options.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  disabled={!buzzerWinner || pkResult !== null}
                  onClick={() => handlePkOption(idx)}
                  className="rounded-xl border border-slate-200 bg-white py-3 font-mono text-lg font-bold text-slate-900 hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50 tabular-nums dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-cyan-400"
                >
                  {opt}
                </button>
              ))}
            </div>

            {pkResult && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                <span className="text-sm text-emerald-900 dark:text-emerald-100">{pkResult}</span>
                <button
                  type="button"
                  onClick={nextPkRound}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                >
                  {pkRound + 1 < BUZZER_ROUNDS.length ? '下一搶答題 →' : '重新開局'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
