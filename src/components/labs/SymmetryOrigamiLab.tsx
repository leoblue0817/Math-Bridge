import { useState } from 'react';
import { CheckCircle2, FlipHorizontal, Layers, RotateCcw } from 'lucide-react';

interface SymmetryOrigamiLabProps {
  isCompleted: boolean;
  onComplete: (bonus: number) => void;
}

const FOLD_STEPS = [
  {
    title: '步驟 0 · 展開的黃／黑／灰雙面對稱色紙',
    desc: '整張色紙分為四個 4×4 區域：右上角整塊為「黃色」，左下角為「灰色」，左上與右下沿著主對角線切分為一半「黑色」、一半「灰色」。',
  },
  {
    title: '步驟 1 · 先摺出左下角黑色斜對稱菱形袋',
    desc: '將紙張對角翻摺或向中心收角，讓兩塊分散的黑色三角形沿線對稱軸拼合，並把部分灰色區域藏進夾層。',
  },
  {
    title: '步驟 2 · 將右側黃色 4×4 區往後反摺',
    desc: '沿垂直中線把黃色 4×4 方塊整片往背面摺過去，同時將上方與下方的黑色三角形向內壓平對齊。',
  },
  {
    title: '步驟 3 · 完成！正面全黑 4×4，背面全黃 4×4',
    desc: '所有灰色格子都被夾在黑色和黃色之間完全看不到！點擊右側「翻轉色紙檢查背面」驗證成果。',
  },
];

interface SymChallenge {
  id: string;
  title: string;
  axis: 'vertical' | 'horizontal';
  leftPattern: boolean[][];
  color: 'yellow' | 'cyan';
}

const SYM_CHALLENGES: SymChallenge[] = [
  {
    id: 'sym-1',
    title: '關卡 1 · 左右線對稱（黃色雙翼）',
    axis: 'vertical',
    color: 'yellow',
    leftPattern: [
      [true, false],
      [true, true],
      [false, true],
      [true, false],
    ],
  },
  {
    id: 'sym-2',
    title: '關卡 2 · 左右線對稱（青藍星門）',
    axis: 'vertical',
    color: 'cyan',
    leftPattern: [
      [false, true],
      [true, true],
      [true, false],
      [false, true],
    ],
  },
  {
    id: 'sym-3',
    title: '關卡 3 · 上下線對稱（雙層摺角）',
    axis: 'horizontal',
    color: 'yellow',
    leftPattern: [
      [true, false, true, false],
      [false, true, true, true],
    ],
  },
];

export function SymmetryOrigamiLab({ isCompleted, onComplete }: SymmetryOrigamiLabProps) {
  const [tab, setTab] = useState<'origami' | 'symmetry'>('origami');
  const [foldStep, setFoldStep] = useState(0);
  const [isBackSide, setIsBackSide] = useState(false);

  // Symmetry puzzle state
  const [chIdx, setChIdx] = useState(0);
  const [userHalf, setUserHalf] = useState<boolean[][]>(() =>
    SYM_CHALLENGES[0].leftPattern.map((row) => row.map(() => false))
  );
  const [symStatus, setSymStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [solvedSet, setSolvedSet] = useState<Record<string, boolean>>({});

  const currentCh = SYM_CHALLENGES[chIdx];

  const handleSelectFold = (idx: number) => {
    setFoldStep(idx);
    if (idx < 3) setIsBackSide(false);
    if (idx === 3 && !isCompleted) {
      onComplete(60);
    }
  };

  const selectChallenge = (idx: number) => {
    const ch = SYM_CHALLENGES[idx];
    setChIdx(idx);
    setUserHalf(ch.leftPattern.map((row) => row.map(() => false)));
    setSymStatus('idle');
  };

  const toggleUserCell = (r: number, c: number) => {
    setSymStatus('idle');
    setUserHalf((prev) =>
      prev.map((row, rr) => (rr === r ? row.map((v, cc) => (cc === c ? !v : v)) : row))
    );
  };

  const checkSymmetry = () => {
    const ch = currentCh;
    let ok = true;
    if (ch.axis === 'vertical') {
      // Expected mirror of leftPattern [r][c] is [r][cols - 1 - c]
      const cols = ch.leftPattern[0].length;
      for (let r = 0; r < ch.leftPattern.length; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          if (userHalf[r][c] !== ch.leftPattern[r][cols - 1 - c]) ok = false;
        }
      }
    } else {
      // Horizontal symmetry: mirror of top rows [r][c] is bottom [rows - 1 - r][c]
      const rows = ch.leftPattern.length;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < ch.leftPattern[0].length; c += 1) {
          if (userHalf[r][c] !== ch.leftPattern[rows - 1 - r][c]) ok = false;
        }
      }
    }

    if (ok) {
      setSymStatus('ok');
      const nextSolved = { ...solvedSet, [ch.id]: true };
      setSolvedSet(nextSolved);
      if (Object.keys(nextSolved).length >= 2 && !isCompleted) {
        onComplete(60);
      }
    } else {
      setSymStatus('err');
    }
  };

  const renderOrigamiSvg = () => {
    if (foldStep === 0) {
      // Full 8x8 sheet representing 16x16 yellow/black/grey sheet from PDF p.4
      const cell = 34;
      const size = cell * 8;
      return (
        <svg
          width={size + 16}
          height={size + 16}
          viewBox={`-8 -8 ${size + 16} ${size + 16}`}
          role="img"
          aria-label="展開的黃黑灰對稱色紙"
          className="h-auto w-full max-w-[290px] sm:max-w-none"
        >
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => {
              const x = c * cell;
              const y = r * cell;
              // Top-right 4x4: Yellow
              if (r < 4 && c >= 4) {
                return <rect key={`${r}-${c}`} x={x} y={y} width={cell} height={cell} fill="#FACC15" stroke="#0F172A" strokeWidth={1.8} />;
              }
              // Bottom-left 4x4: Grey
              if (r >= 4 && c < 4) {
                return <rect key={`${r}-${c}`} x={x} y={y} width={cell} height={cell} fill="#94A3B8" stroke="#0F172A" strokeWidth={1.8} />;
              }
              // Top-left 4x4 & Bottom-right 4x4: split along main diagonal r === c
              if (r < c) {
                return <rect key={`${r}-${c}`} x={x} y={y} width={cell} height={cell} fill="#0F172A" stroke="#334155" strokeWidth={1.5} />;
              }
              if (r > c) {
                return <rect key={`${r}-${c}`} x={x} y={y} width={cell} height={cell} fill="#94A3B8" stroke="#0F172A" strokeWidth={1.8} />;
              }
              // Diagonal cell: upper-right black, lower-left grey
              return (
                <g key={`${r}-${c}`}>
                  <polygon points={`${x},${y} ${x + cell},${y} ${x + cell},${y + cell}`} fill="#0F172A" stroke="#334155" strokeWidth={1.2} />
                  <polygon points={`${x},${y} ${x},${y + cell} ${x + cell},${y + cell}`} fill="#94A3B8" stroke="#0F172A" strokeWidth={1.2} />
                  <rect x={x} y={y} width={cell} height={cell} fill="none" stroke="#0F172A" strokeWidth={1.6} />
                </g>
              );
            })
          )}
          <line x1={0} y1={0} x2={size} y2={size} stroke="#38BDF8" strokeWidth={2.5} strokeDasharray="6,4" />
        </svg>
      );
    }

    if (foldStep === 1) {
      // Step 1: Left half folded to show diamond pocket + yellow right 4x4 + grey bottom-right
      const cell = 34;
      return (
        <svg
          width={288}
          height={288}
          viewBox="-8 -8 288 288"
          role="img"
          aria-label="摺紙步驟1"
          className="h-auto w-full max-w-[290px] sm:max-w-none"
        >
          {/* Top-right 4x4 yellow */}
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <rect
                key={`y-${r}-${c}`}
                x={(4 + c) * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill="#FACC15"
                stroke="#0F172A"
                strokeWidth={1.8}
              />
            ))
          )}
          {/* Bottom-right 4x4 grey */}
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <rect
                key={`g-${r}-${c}`}
                x={(4 + c) * cell}
                y={(4 + r) * cell}
                width={cell}
                height={cell}
                fill="#94A3B8"
                stroke="#0F172A"
                strokeWidth={1.8}
              />
            ))
          )}
          {/* Left side folded black top + grey diamond pocket */}
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <rect
                key={`bl-${r}-${c}`}
                x={c * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill="#0F172A"
                stroke="#334155"
                strokeWidth={1.5}
              />
            ))
          )}
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <rect
                key={`bb-${r}-${c}`}
                x={c * cell}
                y={(4 + r) * cell}
                width={cell}
                height={cell}
                fill="#0F172A"
                stroke="#334155"
                strokeWidth={1.5}
              />
            ))
          )}
          {/* Grey central diamond pocket on bottom-left */}
          <polygon
            points={`${2 * cell},${4 * cell} ${4 * cell},${6 * cell} ${2 * cell},${8 * cell} 0,${6 * cell}`}
            fill="#94A3B8"
            stroke="#38BDF8"
            strokeWidth={2.5}
          />
          <line x1={2 * cell} y1={4 * cell} x2={2 * cell} y2={8 * cell} stroke="#0F172A" strokeWidth={1.5} />
          <line x1={0} y1={6 * cell} x2={4 * cell} y2={6 * cell} stroke="#0F172A" strokeWidth={1.5} />
          <path d={`M ${4 * cell} ${cell} Q ${6 * cell} ${-4} ${7 * cell} ${cell}`} fill="none" stroke="#38BDF8" strokeWidth={2.5} strokeDasharray="4,3" />
        </svg>
      );
    }

    if (foldStep === 2) {
      const cell = 34;
      return (
        <svg
          width={288}
          height={260}
          viewBox="-8 -8 288 260"
          role="img"
          aria-label="摺紙步驟2"
          className="h-auto w-full max-w-[290px] sm:max-w-none"
        >
          {/* Top row folded behind, showing 4x4 black on left + yellow on right */}
          {Array.from({ length: 3 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <rect
                key={`b-${r}-${c}`}
                x={c * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill="#0F172A"
                stroke="#334155"
                strokeWidth={1.5}
              />
            ))
          )}
          {Array.from({ length: 3 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <rect
                key={`y2-${r}-${c}`}
                x={(4 + c) * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill="#FACC15"
                stroke="#0F172A"
                strokeWidth={1.8}
              />
            ))
          )}
          {/* Bottom grey tuck */}
          {Array.from({ length: 2 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => (
              <rect
                key={`g2-${r}-${c}`}
                x={c * cell}
                y={(3 + r) * cell}
                width={cell}
                height={cell}
                fill={c < 4 ? '#0F172A' : '#94A3B8'}
                stroke="#334155"
                strokeWidth={1.5}
              />
            ))
          )}
          <line x1={4 * cell} y1={0} x2={4 * cell} y2={5 * cell} stroke="#38BDF8" strokeWidth={3} strokeDasharray="5,4" />
          <text x={4 * cell} y={6 * cell} textAnchor="middle" fill="#7DD3FC" fontSize="13" fontWeight="700">
            沿中心軸將右側黃色往後摺、下方三角形往內摺
          </text>
        </svg>
      );
    }

    // Step 3: Completed 4x4 Black Front / 4x4 Yellow Back!
    const cell = 52;
    const size = cell * 4;
    return (
      <svg
        width={size + 24}
        height={size + 24}
        viewBox={`-12 -12 ${size + 24} ${size + 24}`}
        role="img"
        aria-label={isBackSide ? '完成品背面4x4黃色' : '完成品正面4x4黑色'}
        className="h-auto w-full max-w-[230px] sm:max-w-none"
      >
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 4 }, (_, c) => (
            <rect
              key={`fin-${r}-${c}`}
              x={c * cell}
              y={r * cell}
              width={cell}
              height={cell}
              fill={isBackSide ? '#FACC15' : '#0F172A'}
              stroke={isBackSide ? '#0F172A' : '#475569'}
              strokeWidth={2}
            />
          ))
        )}
        {!isBackSide && (
          <>
            <line x1={0} y1={2 * cell} x2={2 * cell} y2={4 * cell} stroke="#334155" strokeWidth={1.8} />
            <line x1={4 * cell} y1={2 * cell} x2={2 * cell} y2={4 * cell} stroke="#334155" strokeWidth={1.8} />
          </>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm sm:space-y-6 sm:p-6 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            創意課程 · 主題 3 面積綜合與線對稱
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
            摺摺稱奇－線對稱（黃／黑／灰 16×16 摺紙）
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
            透過線對稱摺線把黃、黑、灰三色色紙摺成「正面 4×4 全黑、背面 4×4 全黃」，並完全隱藏所有灰色格子！
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('origami')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              tab === 'origami'
                ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>黃黑灰虛擬摺紙示範</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('symmetry')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              tab === 'symmetry'
                ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <FlipHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>線對稱鏡像挑戰</span>
          </button>
        </div>
      </div>

      {tab === 'origami' ? (
        <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12">
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-900 p-4 sm:p-6 lg:col-span-6 dark:border-slate-800 dark:bg-[#080D1A]">
            {renderOrigamiSvg()}
            {foldStep === 3 && (
              <button
                type="button"
                onClick={() => setIsBackSide((v) => !v)}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-400/60 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/30"
              >
                <FlipHorizontal className="h-4 w-4" aria-hidden="true" />
                <span>{isBackSide ? '翻回正面（4×4 全黑）' : '翻轉色紙看背面（4×4 全黃）'}</span>
              </button>
            )}
          </div>

          <div className="space-y-4 lg:col-span-6">
            <div className="space-y-2.5">
              {FOLD_STEPS.map((st, idx) => {
                const active = foldStep === idx;
                return (
                  <button
                    key={st.title}
                    type="button"
                    onClick={() => handleSelectFold(idx)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      active
                        ? 'border-sky-500 bg-sky-50 dark:border-cyan-400 dark:bg-cyan-500/10'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-[#080D1A] dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{st.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {st.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {isCompleted && (
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>已完成虛擬摺紙任務（＋60分已領取）</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {SYM_CHALLENGES.map((ch, idx) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => selectChallenge(idx)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
                    chIdx === idx
                      ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : solvedSet[ch.id]
                      ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {solvedSet[ch.id] ? '✓ ' : ''}
                  {ch.title}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              完成任 2 關即可領取本區創意積分
            </span>
          </div>

          <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-6 dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="mb-4 text-center text-xs font-medium text-slate-700 sm:text-sm dark:text-slate-200">
              藍色虛線為「對稱軸」，請點擊空白方格畫出正確的線對稱圖案：
            </div>

            {currentCh.axis === 'vertical' ? (
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Fixed Left Half */}
                <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                  {currentCh.leftPattern.map((row, r) =>
                    row.map((val, c) => (
                      <div
                        key={`l-${r}-${c}`}
                        className={`h-10 w-10 rounded-md border sm:h-12 sm:w-12 ${
                          val
                            ? currentCh.color === 'yellow'
                              ? 'border-amber-400 bg-amber-400'
                              : 'border-sky-400 bg-sky-400 dark:border-cyan-300 dark:bg-cyan-400'
                            : 'border-slate-300 bg-slate-200/70 dark:border-slate-700 dark:bg-slate-900'
                        }`}
                      />
                    ))
                  )}
                </div>

                {/* Vertical Symmetry Axis */}
                <div
                  className="h-44 w-0.5 border-l-2 border-dashed border-sky-500 sm:h-56 dark:border-cyan-400"
                  aria-label="垂直對稱軸"
                />

                {/* Interactive Right Half */}
                <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                  {userHalf.map((row, r) =>
                    row.map((val, c) => (
                      <button
                        key={`r-${r}-${c}`}
                        type="button"
                        onClick={() => toggleUserCell(r, c)}
                        aria-label={`第 ${r + 1} 列第 ${c + 1} 格`}
                        className={`h-10 w-10 rounded-md border transition-colors sm:h-12 sm:w-12 ${
                          val
                            ? currentCh.color === 'yellow'
                              ? 'border-amber-400 bg-amber-400'
                              : 'border-sky-400 bg-sky-400 dark:border-cyan-300 dark:bg-cyan-400'
                            : 'border-slate-300 bg-white hover:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-500'
                        }`}
                      />
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 sm:gap-3">
                {/* Fixed Top Half */}
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                  {currentCh.leftPattern.map((row, r) =>
                    row.map((val, c) => (
                      <div
                        key={`t-${r}-${c}`}
                        className={`h-10 w-10 rounded-md border sm:h-12 sm:w-12 ${
                          val
                            ? 'border-amber-400 bg-amber-400'
                            : 'border-slate-300 bg-slate-200/70 dark:border-slate-700 dark:bg-slate-900'
                        }`}
                      />
                    ))
                  )}
                </div>

                {/* Horizontal Symmetry Axis */}
                <div
                  className="h-0.5 w-44 border-t-2 border-dashed border-sky-500 sm:w-56 dark:border-cyan-400"
                  aria-label="水平對稱軸"
                />

                {/* Interactive Bottom Half */}
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                  {userHalf.map((row, r) =>
                    row.map((val, c) => (
                      <button
                        key={`b-${r}-${c}`}
                        type="button"
                        onClick={() => toggleUserCell(r, c)}
                        aria-label={`下方第 ${r + 1} 列第 ${c + 1} 格`}
                        className={`h-10 w-10 rounded-md border transition-colors sm:h-12 sm:w-12 ${
                          val
                            ? 'border-amber-400 bg-amber-400'
                            : 'border-slate-300 bg-white hover:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-500'
                        }`}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-center items-center gap-3">
              <button
                type="button"
                onClick={() => selectChallenge(chIdx)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>清空重畫</span>
              </button>
              <button
                type="button"
                onClick={checkSymmetry}
                className="min-h-[44px] rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                驗證線對稱結果
              </button>
            </div>

            {symStatus === 'ok' && (
              <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                ✓ 摺線兩側完全重合！成功完成本關線對稱！
              </p>
            )}
            {symStatus === 'err' && (
              <p className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
                ✕ 對折後沒有完全重合喔，再檢查每個格子到對稱軸的距離！
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
