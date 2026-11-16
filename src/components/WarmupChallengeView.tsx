import { useMemo, useState } from 'react';
import { CheckCircle2, Grid3X3, Link2, RotateCcw, Sparkles } from 'lucide-react';
import { ConceptMatchWarmup, GeometryLayoutWarmup, SectorData } from '../data/sectors';
import { soundEngine } from '../utils/soundEngine';

interface WarmupChallengeViewProps {
  sector: SectorData;
  isCompleted: boolean;
  onComplete: () => void;
  onGoNextTab: () => void;
  onFeedback?: (outcome: 'correct' | 'wrong') => void;
}

const RIGHT_SHUFFLE_ORDERS: Record<string, number[]> = {
  s1: [2, 0, 3, 1],
  s2: [1, 3, 0, 2],
  s4: [3, 1, 2, 0],
  s5: [2, 3, 0, 1],
  s7: [1, 2, 3, 0],
};

function ConceptMatchBoard({
  sectorId,
  warmup,
  isCompleted,
  onComplete,
  onGoNextTab,
  onFeedback,
}: {
  sectorId: string;
  warmup: ConceptMatchWarmup;
  isCompleted: boolean;
  onComplete: () => void;
  onGoNextTab: () => void;
  onFeedback?: (outcome: 'correct' | 'wrong') => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>(() =>
    isCompleted ? warmup.pairs.map((p) => p.id) : []
  );
  const [errorPair, setErrorPair] = useState<string | null>(null);

  const rightPairs = useMemo(() => {
    const order = RIGHT_SHUFFLE_ORDERS[sectorId] ?? [1, 3, 0, 2];
    return order.map((idx) => warmup.pairs[idx]).filter(Boolean);
  }, [sectorId, warmup.pairs]);

  const allMatched = matchedIds.length === warmup.pairs.length;

  const handleSelectLeft = (id: string) => {
    if (matchedIds.includes(id)) return;
    soundEngine.playClick();
    setErrorPair(null);
    setSelectedLeft((prev) => (prev === id ? null : id));
  };

  const handleSelectRight = (rightId: string) => {
    if (!selectedLeft || matchedIds.includes(rightId)) return;
    if (selectedLeft === rightId) {
      soundEngine.playMatchSuccess();
      const next = [...matchedIds, rightId];
      setMatchedIds(next);
      setSelectedLeft(null);
      setErrorPair(null);
      onFeedback?.('correct');
      if (next.length === warmup.pairs.length) {
        onComplete();
      }
    } else {
      soundEngine.playWrong();
      setErrorPair('這個配對不太對喔！再觀察一下左側觀念與右側敘述的關係。');
      setSelectedLeft(null);
      onFeedback?.('wrong');
    }
  };

  const handleReset = () => {
    setMatchedIds([]);
    setSelectedLeft(null);
    setErrorPair(null);
  };

  const pairColors = ['#38BDF8', '#FBBF24', '#34D399', '#A78BFA'];

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-cyan-400">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>觀念連連看熱身關</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl dark:text-white">
            {warmup.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{warmup.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-bold text-amber-700 tabular-nums dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300">
            已完成 {matchedIds.length} / {warmup.pairs.length} 組
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>重新連線</span>
          </button>
        </div>
      </div>

      {/* Interactive Two-Column Matching Board with SVG Connectors */}
      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-11 md:items-stretch md:gap-0">
        {/* Left Column */}
        <div className="grid grid-rows-4 gap-3 md:col-span-5">
          {warmup.pairs.map((pair, idx) => {
            const isMatched = matchedIds.includes(pair.id);
            const isSelected = selectedLeft === pair.id;
            const color = pairColors[idx % pairColors.length];
            return (
              <button
                key={pair.id}
                type="button"
                disabled={isMatched}
                onClick={() => handleSelectLeft(pair.id)}
                className={`flex min-h-[60px] items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                  isMatched
                    ? 'border-emerald-400/60 bg-emerald-50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-200'
                    : isSelected
                    ? 'border-sky-500 bg-sky-50 text-sky-950 ring-2 ring-sky-400/40 dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-white dark:ring-cyan-400/30'
                    : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-sky-400 dark:border-slate-700 dark:bg-[#080D1A] dark:text-slate-100 dark:hover:border-cyan-400'
                }`}
              >
                <span>{pair.left}</span>
                <span
                  className="h-3 w-3 shrink-0 rounded-full border-2"
                  style={{
                    borderColor: isMatched ? '#10B981' : color,
                    backgroundColor: isMatched || isSelected ? color : 'transparent',
                  }}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        {/* Center SVG Energy Connector Column (Desktop) */}
        <div className="relative hidden md:col-span-1 md:block" aria-hidden="true">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            {matchedIds.map((id) => {
              const leftIdx = warmup.pairs.findIndex((p) => p.id === id);
              const rightIdx = rightPairs.findIndex((p) => p.id === id);
              if (leftIdx < 0 || rightIdx < 0) return null;
              const y1 = ((leftIdx + 0.5) / warmup.pairs.length) * 100;
              const y2 = ((rightIdx + 0.5) / rightPairs.length) * 100;
              const color = pairColors[leftIdx % pairColors.length];
              return (
                <path
                  key={id}
                  d={`M 0 ${y1} C 50 ${y1}, 50 ${y2}, 100 ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
        </div>

        {/* Right Column */}
        <div className="grid grid-rows-4 gap-3 md:col-span-5">
          {rightPairs.map((pair) => {
            const isMatched = matchedIds.includes(pair.id);
            const origIdx = warmup.pairs.findIndex((p) => p.id === pair.id);
            const color = pairColors[(origIdx >= 0 ? origIdx : 0) % pairColors.length];
            return (
              <button
                key={pair.id}
                type="button"
                disabled={isMatched || !selectedLeft}
                onClick={() => handleSelectRight(pair.id)}
                className={`flex min-h-[60px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                  isMatched
                    ? 'border-emerald-400/60 bg-emerald-50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-200'
                    : selectedLeft
                    ? 'cursor-pointer border-amber-300 bg-amber-50/70 text-slate-900 hover:border-amber-500 dark:border-amber-400/50 dark:bg-amber-500/10 dark:text-slate-100 dark:hover:border-amber-300'
                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-300'
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border-2"
                  style={{
                    borderColor: isMatched ? '#10B981' : color,
                    backgroundColor: isMatched ? color : 'transparent',
                  }}
                  aria-hidden="true"
                />
                <span>{pair.right}</span>
              </button>
            );
          })}
        </div>
      </div>

      {errorPair && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200">
          {errorPair}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 dark:border-slate-800 dark:bg-[#080D1A]">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-300" aria-hidden="true" />
          <span>{allMatched ? '太棒了！熱身能量連線完成，已獲得本區熱身星星（+25分）！' : warmup.hint}</span>
        </div>

        <div className="flex items-center gap-2">
          {(allMatched || isCompleted) && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>熱身已完成</span>
            </span>
          )}
          <button
            type="button"
            onClick={onGoNextTab}
            className="whitespace-nowrap rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          >
            前往小節微關卡 →
          </button>
        </div>
      </div>
    </div>
  );
}

function GeometryLayoutPad({
  warmup,
  isCompleted,
  onComplete,
  onGoNextTab,
  onFeedback,
}: {
  warmup: GeometryLayoutWarmup;
  isCompleted: boolean;
  onComplete: () => void;
  onGoNextTab: () => void;
  onFeedback?: (outcome: 'correct' | 'wrong') => void;
}) {
  const mode = warmup.layoutMode;
  const rows = mode === 'voxel-footprint' ? 3 : 4;
  const cols = mode === 'voxel-footprint' ? 3 : 4;

  const [cells, setCells] = useState<number[][]>(() => {
    if (isCompleted) {
      if (mode === 'symmetry-area') {
        return [
          [0, 1, 1, 0],
          [1, 1, 1, 1],
          [0, 1, 1, 0],
          [0, 0, 0, 0],
        ];
      }
      if (mode === 'staircase-sequence') {
        return [
          [1, 0, 0, 0],
          [1, 1, 0, 0],
          [1, 1, 1, 0],
          [1, 1, 1, 1],
        ];
      }
      return [
        [2, 1, 1],
        [0, 0, 0],
        [1, 0, 0],
      ];
    }
    return Array.from({ length: rows }, () => Array(cols).fill(0));
  });

  const [statusNote, setStatusNote] = useState<{ ok: boolean; msg: string } | null>(null);

  const toggleCell = (r: number, c: number) => {
    soundEngine.playClick();
    setStatusNote(null);
    setCells((prev) =>
      prev.map((row, ri) =>
        row.map((val, ci) => {
          if (ri !== r || ci !== c) return val;
          if (mode === 'voxel-footprint') return (val + 1) % 3;
          return val === 1 ? 0 : 1;
        })
      )
    );
  };

  const resetGrid = () => {
    setCells(Array.from({ length: rows }, () => Array(cols).fill(0)));
    setStatusNote(null);
  };

  // Live metrics
  const totalSum = cells.reduce((acc, r) => acc + r.reduce((a, b) => a + b, 0), 0);

  const isSymmetric =
    mode === 'symmetry-area'
      ? cells.every((row) => row[0] === row[3] && row[1] === row[2])
      : false;

  const rowCounts = cells.map((row) => row.reduce((a, b) => a + b, 0));

  const frontHeights: [number, number, number] =
    mode === 'voxel-footprint'
      ? [
          Math.max(cells[0][0], cells[1][0], cells[2][0]),
          Math.max(cells[0][1], cells[1][1], cells[2][1]),
          Math.max(cells[0][2], cells[1][2], cells[2][2]),
        ]
      : [0, 0, 0];

  const topCount =
    mode === 'voxel-footprint'
      ? cells.reduce((acc, row) => acc + row.filter((v) => v > 0).length, 0)
      : 0;

  const verifyLayout = () => {
    if (mode === 'symmetry-area') {
      const target = warmup.targetArea ?? 8;
      if (totalSum === target && isSymmetric) {
        soundEngine.playMatchSuccess();
        setStatusNote({ ok: true, msg: '驗證成功！圖形完美左右對稱且面積恰為 8 平方單位，獲得熱身星星（+25分）！' });
        onFeedback?.('correct');
        onComplete();
      } else {
        soundEngine.playWrong();
        setStatusNote({
          ok: false,
          msg: `目前面積為 ${totalSum} 格，${isSymmetric ? '已對稱，請將總格數調為 8 格' : '左右尚未沿黃色中線完全對稱'}。`,
        });
        onFeedback?.('wrong');
      }
      return;
    }

    if (mode === 'staircase-sequence') {
      const ok =
        rowCounts[0] === 1 &&
        rowCounts[1] === 2 &&
        rowCounts[2] === 3 &&
        rowCounts[3] === 4;
      if (ok) {
        soundEngine.playMatchSuccess();
        setStatusNote({ ok: true, msg: '太厲害了！1＋2＋3＋4 ＝ 10 階梯三角數陣佈置成功，獲得熱身星星（+25分）！' });
        onFeedback?.('correct');
        onComplete();
      } else {
        soundEngine.playWrong();
        setStatusNote({
          ok: false,
          msg: `各列格數目前為 [${rowCounts.join(', ')}]，請依序佈置成 [1, 2, 3, 4] 階梯。`,
        });
        onFeedback?.('wrong');
      }
      return;
    }

    const targetF = warmup.targetFront ?? [2, 1, 1];
    const targetTop = warmup.targetTopCount ?? 4;
    const targetCubes = warmup.targetCubes ?? 5;
    const matchFront =
      frontHeights[0] === targetF[0] &&
      frontHeights[1] === targetF[1] &&
      frontHeights[2] === targetF[2];

    if (totalSum === targetCubes && matchFront && topCount === targetTop) {
      soundEngine.playMatchSuccess();
      setStatusNote({ ok: true, msg: '空間投影完全吻合！5 塊積木同時符合正視圖 [2,1,1] 與俯視圖 4 格，獲得熱身星星（+25分）！' });
      onFeedback?.('correct');
      onComplete();
    } else {
      soundEngine.playWrong();
      setStatusNote({
        ok: false,
        msg: `目前積木共 ${totalSum} 塊（目標 ${targetCubes}）、正視圖 [${frontHeights.join(',')}]（目標 [${targetF.join(',')}]）、俯視圖 ${topCount} 格（目標 ${targetTop}）。`,
      });
      onFeedback?.('wrong');
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Grid3X3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>幾何圖形佈置熱身關</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl dark:text-white">
            {warmup.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{warmup.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={resetGrid}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>清空網格</span>
        </button>
      </div>

      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        {/* Interactive Grid Pad */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 p-6 lg:col-span-6 dark:border-slate-800 dark:bg-[#080D1A]">
          <div
            className="relative grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {mode === 'symmetry-area' && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-[-8px] bottom-[-8px] left-1/2 z-10 w-0.5 -translate-x-1/2 border-l-2 border-dashed border-amber-400"
              />
            )}

            {cells.map((row, r) =>
              row.map((val, c) => {
                const isLit = val > 0;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => toggleCell(r, c)}
                    aria-label={`第${r + 1}列第${c + 1}行，目前狀態 ${val}`}
                    className={`flex h-14 w-14 items-center justify-center rounded-xl border font-mono text-sm font-bold transition-all sm:h-16 sm:w-16 ${
                      val === 2
                        ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-inner'
                        : isLit
                        ? 'border-cyan-300 bg-cyan-400 text-slate-950 shadow-inner'
                        : 'border-slate-700 bg-slate-800/80 text-slate-500 hover:border-cyan-400/60 hover:text-slate-300'
                    }`}
                  >
                    {mode === 'voxel-footprint' ? (val > 0 ? `${val}層` : '0') : isLit ? '■' : ''}
                  </button>
                );
              })
            )}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            {mode === 'voxel-footprint'
              ? '點擊俯視圖格子可切換疊放高度（0 → 1層 → 2層）'
              : mode === 'symmetry-area'
              ? '點擊格子點亮／取消；黃色虛線為線對稱中心軸'
              : '點擊格子點亮各列，拼出 1、2、3、4 層階梯三角數陣'}
          </p>
        </div>

        {/* Live Telemetry & Validation Controls */}
        <div className="space-y-4 lg:col-span-6">
          {mode === 'symmetry-area' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#080D1A]">
                <div className="text-xs text-slate-500 dark:text-slate-400">目前總面積</div>
                <div className="mt-1 font-mono text-2xl font-bold text-sky-700 tabular-nums dark:text-cyan-300">
                  {totalSum} <span className="text-xs font-normal">/ 8 平方單位</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#080D1A]">
                <div className="text-xs text-slate-500 dark:text-slate-400">左右鏡像對稱</div>
                <div
                  className={`mt-1 text-lg font-bold ${
                    isSymmetric && totalSum > 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-600 dark:text-amber-300'
                  }`}
                >
                  {totalSum === 0 ? '請開始佈置' : isSymmetric ? '對稱吻合 ✓' : '尚未對稱'}
                </div>
              </div>
            </div>
          )}

          {mode === 'staircase-sequence' && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#080D1A]">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>各列燈數檢查</span>
                <span className="font-mono font-bold text-sky-700 tabular-nums dark:text-cyan-300">
                  總數：{totalSum} / 10 格
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {rowCounts.map((cnt, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border px-2 py-2 text-center font-mono text-xs font-bold tabular-nums ${
                      cnt === i + 1
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-200'
                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    第{i + 1}列：{cnt}/{i + 1}
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === 'voxel-footprint' && (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#080D1A]">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">總方塊數</div>
                <div className="mt-1 font-mono text-xl font-bold text-sky-700 tabular-nums dark:text-cyan-300">
                  {totalSum} / 5
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#080D1A]">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">正視圖高</div>
                <div className="mt-1 font-mono text-xl font-bold text-amber-700 tabular-nums dark:text-amber-300">
                  [{frontHeights.join(',')}]
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#080D1A]">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">俯視底格</div>
                <div className="mt-1 font-mono text-xl font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
                  {topCount} / 4
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <span className="font-bold">提示：</span>
            {warmup.hint}
          </div>

          {statusNote && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
                statusNote.ok
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                  : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200'
              }`}
            >
              {statusNote.msg}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={verifyLayout}
              className="whitespace-nowrap rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
            >
              {isCompleted ? '✓ 再次驗證佈置' : '確認佈置成果（+25分）'}
            </button>

            <button
              type="button"
              onClick={onGoNextTab}
              className="whitespace-nowrap rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              前往小節微關卡 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WarmupChallengeView({
  sector,
  isCompleted,
  onComplete,
  onGoNextTab,
  onFeedback,
}: WarmupChallengeViewProps) {
  if (sector.warmup.type === 'match') {
    return (
      <ConceptMatchBoard
        key={sector.id}
        sectorId={sector.id}
        warmup={sector.warmup}
        isCompleted={isCompleted}
        onComplete={onComplete}
        onGoNextTab={onGoNextTab}
        onFeedback={onFeedback}
      />
    );
  }

  return (
    <GeometryLayoutPad
      key={sector.id}
      warmup={sector.warmup}
      isCompleted={isCompleted}
      onComplete={onComplete}
      onGoNextTab={onGoNextTab}
      onFeedback={onFeedback}
    />
  );
}
