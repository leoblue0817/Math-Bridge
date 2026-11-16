import { useState } from 'react';
import { SectorData } from '../data/sectors';
import { SectorId } from '../types';

interface TeachInteractiveViewProps {
  sector: SectorData;
  isCompleted: boolean;
  onComplete: () => void;
  onGoNextTab: () => void;
}

export function SectorMiniExplorer({ sectorId }: { sectorId: SectorId }) {
  const [parA, setParA] = useState(17);
  const [parB, setParB] = useState(24);
  const [fracNum, setFracNum] = useState(1);
  const [slices, setSlices] = useState(16);
  const [sides, setSides] = useState(5);
  const [crStep, setCrStep] = useState<0 | 1 | 2>(0);
  const [figN, setFigN] = useState(5);
  const [powExp, setPowExp] = useState(6);
  const [mirrorHeight, setMirrorHeight] = useState<[number, number, number]>([3, 1, 2]);

  if (sectorId === 's1') {
    const sum = parA + parB;
    const prod = parA * parB;
    const labelOf = (v: number) => (v % 2 === 0 ? '偶數' : '奇數');
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#080D1A] dark:shadow-none">
        <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">互動實驗器 · 奇偶運算即時驗證</div>
        <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
          調整兩個整數（含 0），觀察加減與乘積的奇偶性
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
            <label htmlFor="par-a" className="text-xs text-slate-600 dark:text-slate-300">甲數：</label>
            <input
              id="par-a"
              type="number"
              value={parA}
              onChange={(e) => setParA(parseInt(e.target.value || '0', 10))}
              className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1 font-mono text-sm text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-300">
              {labelOf(parA)}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
            <label htmlFor="par-b" className="text-xs text-slate-600 dark:text-slate-300">乙數：</label>
            <input
              id="par-b"
              type="number"
              value={parB}
              onChange={(e) => setParB(parseInt(e.target.value || '0', 10))}
              className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1 font-mono text-sm text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <span className="font-mono text-xs font-semibold text-sky-700 dark:text-cyan-300">
              {labelOf(parB)}
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
            甲 ＋ 乙 ＝ <span className="font-mono font-bold text-slate-900 tabular-nums dark:text-white">{sum}</span>（
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{labelOf(sum)}</span>）
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
            甲 × 乙 ＝ <span className="font-mono font-bold text-slate-900 tabular-nums dark:text-white">{prod}</span>（
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{labelOf(prod)}</span>）
          </div>
        </div>
      </div>
    );
  }

  if (sectorId === 's2') {
    const cycle = '142857';
    const startMap: Record<number, number> = { 1: 0, 2: 2, 3: 1, 4: 4, 5: 5, 6: 3 };
    const rot = cycle.slice(startMap[fracNum]) + cycle.slice(0, startMap[fracNum]);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
              Blue 秘笈互動儀 · 七分之幾旋轉密碼
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              點擊分子，觀察「142857」循環節如何輪流當頭
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFracNum(k)}
                className={`rounded-lg px-3 py-1.5 font-mono text-sm font-bold tabular-nums ${
                  fracNum === k
                    ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400'
                }`}
              >
                {k}/7
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center font-mono text-xl font-bold text-amber-700 tabular-nums dark:border-slate-800 dark:bg-slate-900/80 dark:text-amber-300">
          {fracNum}/7 ＝ 0.{rot}{rot}…
        </div>
      </div>
    );
  }

  if (sectorId === 's3') {
    const wedges = Array.from({ length: slices }, (_, i) => i);
    const w = 240 / (slices / 2);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              動態幾何實驗 · 圓切拼長方形
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              拖動切割份數：切得越細，上下齒合越接近長方形
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {[4, 8, 16, 32].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlices(s)}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs font-bold tabular-nums ${
                  slices === s
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                切 {s} 份
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <svg viewBox="0 0 280 90" className="h-24 w-full max-w-md" role="img" aria-label={`圓形分割成${slices}份重組成近似長方形`}>
            {wedges.map((i) => {
              const isTop = i % 2 === 0;
              const colIdx = Math.floor(i / 2);
              const x = 16 + colIdx * w + (isTop ? 0 : w / 2);
              if (isTop) {
                return (
                  <polygon
                    key={i}
                    points={`${x},16 ${x + w},16 ${x + w / 2},72`}
                    fill="rgba(56,189,248,0.45)"
                    stroke="#38BDF8"
                    strokeWidth="1"
                  />
                );
              }
              return (
                <polygon
                  key={i}
                  points={`${x},72 ${x + w},72 ${x + w / 2},16`}
                  fill="rgba(251,191,36,0.45)"
                  stroke="#FBBF24"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
          <p className="text-xs text-slate-200">
            上排＋下排共 <span className="font-mono font-bold text-white">{slices}</span> 個小扇形 → 寬 ≈{' '}
            <span className="text-cyan-300">半徑</span>，長 ≈ <span className="text-amber-300">圓周長的一半</span>
          </p>
        </div>
      </div>
    );
  }

  if (sectorId === 's4') {
    const pts = Array.from({ length: sides }, (_, i) => {
      const ang = (i * 2 * Math.PI) / sides - Math.PI / 2;
      return { x: 80 + 56 * Math.cos(ang), y: 75 + 56 * Math.sin(ang) };
    });
    const diags: [number, number][] = [];
    for (let i = 0; i < sides; i += 1) {
      for (let j = i + 2; j < sides; j += 1) {
        if (i === 0 && j === sides - 1) continue;
        diags.push([i, j]);
      }
    }
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
              互動幾何驗證 · n 邊形對角線
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              切換多邊形邊數 n，即時繪出所有對角線並套用公式
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSides(n)}
                className={`rounded-lg px-3 py-1 font-mono text-xs font-bold tabular-nums ${
                  sides === n
                    ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                n={n}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-2 dark:border-slate-800">
            <svg width="160" height="150" viewBox="0 0 160 150" className="shrink-0">
              <polygon
                points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(56,189,248,0.12)"
                stroke="#E2E8F0"
                strokeWidth="2"
              />
              {diags.map(([i, j]) => (
                <line
                  key={`${i}-${j}`}
                  x1={pts[i].x}
                  y1={pts[i].y}
                  x2={pts[j].x}
                  y2={pts[j].y}
                  stroke="#FBBF24"
                  strokeWidth="1.5"
                />
              ))}
              {pts.map((p, idx) => (
                <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#38BDF8" />
              ))}
            </svg>
          </div>
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <div>
              每個頂點可連出對角線數：
              <span className="font-mono font-bold text-sky-700 dark:text-cyan-300">
                {sides} － 3 ＝ {sides - 3} 條
              </span>
            </div>
            <div>
              對角線總數：
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                {sides} × ({sides} － 3) ÷ 2 ＝ {diags.length} 條
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sectorId === 's5') {
    const animals = [
      { id: 1, type: 'chicken' },
      { id: 2, type: 'chicken' },
      { id: 3, type: 'rabbit' },
      { id: 4, type: 'chicken' },
      { id: 5, type: 'rabbit' },
      { id: 6, type: 'chicken' },
      { id: 7, type: 'rabbit' },
      { id: 8, type: 'chicken' },
    ];
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              動態圖解 · 雞兔同籠「伸縮腳法」
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              範例：8 隻動物共 22 隻腳，一步一步揭曉雞兔數量
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { s: 0 as const, label: '① 初始狀態（22 隻腳）' },
              { s: 1 as const, label: '② 全部縮起 2 隻腳（減 16 隻）' },
              { s: 2 as const, label: '③ 剩 6 隻腳 ÷ 2 ＝ 3 隻兔！' },
            ].map((item) => (
              <button
                key={item.s}
                type="button"
                onClick={() => setCrStep(item.s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  crStep === item.s
                    ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {animals.map((a) => {
            const totalLegs = a.type === 'rabbit' ? 4 : 2;
            const visibleLegs = crStep === 0 ? totalLegs : totalLegs - 2;
            return (
              <div
                key={a.id}
                className={`flex flex-col items-center rounded-lg border p-2 text-center ${
                  crStep === 2 && a.type === 'rabbit'
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/15'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80'
                }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {crStep === 2 ? (a.type === 'rabbit' ? '🐰' : '🐥') : '⭕'}
                </span>
                <span className="mt-1 font-mono text-xs font-bold text-sky-700 tabular-nums dark:text-cyan-300">
                  剩 {visibleLegs} 腳
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (sectorId === 's6') {
    const sq = figN * figN;
    const tri = (figN * (figN + 1)) / 2;
    const odds = Array.from({ length: figN }, (_, i) => 2 * i + 1).join('＋');
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
              互動陣列 · 正方形數與三角形數
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              調整邊長 n = {figN}，比較正方形點陣與三角點陣
            </h3>
          </div>
          <input
            type="range"
            min={2}
            max={7}
            value={figN}
            onChange={(e) => setFigN(Number(e.target.value))}
            aria-label="點陣邊長 n"
            className="w-40 accent-sky-600 dark:accent-cyan-400"
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="text-xs text-slate-500 dark:text-slate-400">第 {figN} 個正方形數</div>
            <div className="mt-1 font-mono text-xl font-bold text-sky-700 tabular-nums dark:text-cyan-300">
              {odds} ＝ {sq}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="text-xs text-slate-500 dark:text-slate-400">第 {figN} 個三角形數</div>
            <div className="mt-1 font-mono text-xl font-bold text-amber-700 tabular-nums dark:text-amber-300">
              {figN} × ({figN}＋1) ÷ 2 ＝ {tri}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sectorId === 's7') {
    const val = Math.pow(2, powExp);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              指數推演器 · 2 的乘方與個位循環
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              調整指數 n（0～11），熟悉常見 2 的次方數值
            </h3>
          </div>
          <input
            type="range"
            min={0}
            max={11}
            value={powExp}
            onChange={(e) => setPowExp(Number(e.target.value))}
            aria-label="2的指數次方"
            className="w-44 accent-amber-500 dark:accent-amber-400"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/80">
          <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
            2^{powExp} ＝ {val}
          </span>
          <span className="text-sm text-sky-700 dark:text-cyan-300">
            個位數字：
            <strong className="font-mono text-lg text-amber-700 dark:text-amber-300">{val % 10}</strong>
            （每 4 次方 2, 4, 8, 6 循環）
          </span>
        </div>
      </div>
    );
  }

  const reversed = [...mirrorHeight].reverse();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#080D1A] dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            視圖鏡像對照器 · 左視圖 vs 右視圖
          </div>
          <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            點擊調整左視圖三欄高度，觀察右視圖如何左右鏡像翻轉
          </h3>
        </div>
        <div className="flex gap-2">
          {mirrorHeight.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                setMirrorHeight((prev) => {
                  const next: [number, number, number] = [...prev];
                  next[i] = (next[i] % 3) + 1;
                  return next;
                })
              }
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-semibold text-sky-800 dark:border-slate-700 dark:bg-slate-900 dark:text-cyan-200"
            >
              第{i + 1}欄：{h}層
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">左視圖</div>
          <div className="flex h-16 items-end justify-center gap-1.5">
            {mirrorHeight.map((h, idx) => (
              <div key={idx} className="flex flex-col-reverse gap-0.5">
                {Array.from({ length: h }, (_, z) => (
                  <div key={z} className="h-4 w-4 rounded-xs bg-emerald-500 dark:bg-emerald-400" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">右視圖（左右鏡像相反）</div>
          <div className="flex h-16 items-end justify-center gap-1.5">
            {reversed.map((h, idx) => (
              <div key={idx} className="flex flex-col-reverse gap-0.5">
                {Array.from({ length: h }, (_, z) => (
                  <div key={z} className="h-4 w-4 rounded-xs bg-amber-500 dark:bg-amber-400" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeachInteractiveView({
  sector,
  isCompleted,
  onComplete,
  onGoNextTab,
}: TeachInteractiveViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {sector.keyPoints.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none"
          >
            <h2 className="text-lg font-bold text-sky-700 dark:text-cyan-300">{card.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {card.items.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500 dark:bg-cyan-400/70"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <SectorMiniExplorer sectorId={sector.id} />

      <div className="rounded-2xl border border-purple-200 bg-purple-50/90 p-6 dark:border-purple-500/35 dark:bg-purple-500/10">
        <div className="text-xs font-semibold text-purple-800 dark:text-amber-300">
          {sector.coolFactTitle}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {sector.coolFactBody}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onComplete}
          className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
            isCompleted
              ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
              : 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300'
          }`}
        >
          {isCompleted ? '✓ 重點教學已完成（+30分）' : '完成重點教學（+30分）'}
        </button>

        <button
          type="button"
          onClick={onGoNextTab}
          className="whitespace-nowrap rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        >
          前往題目演練 →
        </button>
      </div>
    </div>
  );
}
