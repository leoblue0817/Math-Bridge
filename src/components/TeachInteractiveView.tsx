import { useState } from 'react';
import { SectorData } from '../data/sectors';
import { SectorId } from '../types';

interface TeachInteractiveViewProps {
  sector: SectorData;
  isCompleted: boolean;
  onComplete: () => void;
  onGoNextTab: () => void;
}

const FIB_SEQ = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

export function SectorMiniExplorer({ sectorId }: { sectorId: SectorId }) {
  // s1: 數列規律 (1/7 密碼轉盤 + 費氏兔子)
  const [fracNum, setFracNum] = useState(1);
  const [fibMonth, setFibMonth] = useState(6);

  // s2: 奇偶性質 (奇偶驗證)
  const [parA, setParA] = useState(17);
  const [parB, setParB] = useState(24);

  // s3: 面積綜合 (圓切拼長方形)
  const [slices, setSlices] = useState(16);

  // s4: 加法與乘法原理 (n 邊形對角線)
  const [sides, setSides] = useState(5);

  // s5: 運算法則 (去括號四天王正數生活天平)
  const [ruleCase, setRuleCase] = useState<0 | 1 | 2 | 3>(0);

  // s6: 數形規律 (正方形與三角形點陣)
  const [figN, setFigN] = useState(5);

  // s7: 四則混合計算 (2^n 乘方與個位循環)
  const [powExp, setPowExp] = useState(6);

  // s8: 三視圖 (左右視圖鏡像)
  const [mirrorHeight, setMirrorHeight] = useState<[number, number, number]>([3, 1, 2]);

  if (sectorId === 's1') {
    const cycle = '142857';
    const startMap: Record<number, number> = { 1: 0, 2: 2, 3: 1, 4: 4, 5: 5, 6: 3 };
    const rot = cycle.slice(startMap[fracNum]) + cycle.slice(0, startMap[fracNum]);
    return (
      <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4 shadow-sm sm:p-5 dark:border-cyan-500/30 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-sky-700 dark:text-cyan-400">
              互動實驗儀 · 七分之幾循環密碼轉盤 ＆ 兔子繁殖月份
            </div>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base dark:text-white">
              點擊分子觀察「142857」輪流當頭，或滑動月份預測費氏兔子總對數
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFracNum(k)}
                className={`min-h-[36px] rounded-lg px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${
                  fracNum === k
                    ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400'
                }`}
              >
                {k}/7
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-white p-3.5 text-center dark:border-slate-800 dark:bg-slate-900/80">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              循環小數展開（週期 6 位）
            </div>
            <div className="mt-1 font-mono text-xl font-extrabold text-amber-600 tabular-nums dark:text-amber-300">
              {fracNum}/7 ＝ 0.{rot}…
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span>費波那契兔子：第 {fibMonth} 個月</span>
              <span className="font-mono font-extrabold text-emerald-600 tabular-nums dark:text-emerald-300">
                共 {FIB_SEQ[fibMonth - 1]} 對兔子
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={fibMonth}
              onChange={(e) => setFibMonth(Number(e.target.value))}
              aria-label="費波那契兔子月份"
              className="mt-2 w-full accent-sky-600 dark:accent-cyan-400"
            />
            <div className="mt-1 flex flex-wrap gap-1 font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
              {FIB_SEQ.slice(0, fibMonth).map((val, i) => (
                <span
                  key={i}
                  className={`rounded px-1.5 py-0.5 ${
                    i === fibMonth - 1
                      ? 'bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {val}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sectorId === 's2') {
    const sum = parA + parB;
    const prod = parA * parB;
    const labelOf = (v: number) => (v % 2 === 0 ? '偶數' : '奇數');
    return (
      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm sm:p-5 dark:border-purple-500/30 dark:bg-[#080D1A] dark:shadow-none">
        <div className="text-xs font-bold text-purple-700 dark:text-purple-300">
          互動實驗儀 · 奇偶運算即時驗證（含 0 為偶數）
        </div>
        <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base dark:text-white">
          調整兩個整數，觀察「同偶異奇」相加與「遇偶即偶」相乘規律
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80">
            <label htmlFor="par-a" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              甲數：
            </label>
            <input
              id="par-a"
              type="number"
              value={parA}
              onChange={(e) => setParA(parseInt(e.target.value || '0', 10))}
              className="w-24 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 font-mono text-sm text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
              {labelOf(parA)}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80">
            <label htmlFor="par-b" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              乙數：
            </label>
            <input
              id="par-b"
              type="number"
              value={parB}
              onChange={(e) => setParB(parseInt(e.target.value || '0', 10))}
              className="w-24 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 font-mono text-sm text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <span className="font-mono text-xs font-bold text-sky-700 dark:text-cyan-300">
              {labelOf(parB)}
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
            甲 ＋ 乙 ＝{' '}
            <span className="font-mono font-bold text-slate-900 tabular-nums dark:text-white">{sum}</span>（
            <span className="font-bold text-emerald-700 dark:text-emerald-300">{labelOf(sum)}</span>）
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
            甲 × 乙 ＝{' '}
            <span className="font-mono font-bold text-slate-900 tabular-nums dark:text-white">{prod}</span>（
            <span className="font-bold text-emerald-700 dark:text-emerald-300">{labelOf(prod)}</span>）
          </div>
        </div>
      </div>
    );
  }

  if (sectorId === 's3') {
    const wedges = Array.from({ length: slices }, (_, i) => i);
    const w = 240 / (slices / 2);
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm sm:p-5 dark:border-emerald-500/30 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              動態幾何實驗 · 圓切拼長方形公式推導
            </div>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base dark:text-white">
              點擊切換切割份數：切得越細，上下齒合越接近長方形
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[4, 8, 16, 32].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlices(s)}
                className={`min-h-[36px] rounded-lg px-3 py-1 font-mono text-xs font-bold tabular-nums ${
                  slices === s
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950'
                    : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                切 {s} 份
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <svg
            viewBox="0 0 280 90"
            className="h-24 w-full max-w-md"
            role="img"
            aria-label={`圓形分割成${slices}份重組成近似長方形`}
          >
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
            長方形的寬 ＝ <span className="font-bold text-cyan-300">半徑</span>，長 ＝{' '}
            <span className="font-bold text-amber-300">圓周長的一半 (半徑 × 3.14)</span> → 面積 ＝ 半徑 × 半徑 × 3.14
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
      <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 shadow-sm sm:p-5 dark:border-teal-500/30 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-teal-700 dark:text-teal-300">
              互動幾何驗證 · n 邊形對角線即時連線儀
            </div>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base dark:text-white">
              切換多邊形邊數 n，觀察為何公式要寫「n × (n － 3) ÷ 2」
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSides(n)}
                className={`min-h-[36px] rounded-lg px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${
                  sides === n
                    ? 'bg-teal-600 text-white dark:bg-teal-400 dark:text-slate-950'
                    : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                n={n}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-2 dark:border-slate-800">
            <svg width="160" height="150" viewBox="0 0 160 150" className="shrink-0">
              <polygon
                points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(20,184,166,0.16)"
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
                <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#2DD4BF" />
              ))}
            </svg>
          </div>
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <div>
              ① 扣除自己與左右相鄰 2 點，每頂點可連：
              <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                {sides} － 3 ＝ {sides - 3} 條
              </span>
            </div>
            <div>
              ② 共 {sides} 個頂點且每條線重算 2 次，故除以 2：
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
    const cases = [
      {
        shortLabel: '連減總和',
        badge: 'a − (b + c) ＝ a − b − c',
        title: '天王 1 · 連減總支出（括號前是「－」，裡面的「＋」變「－」）',
        expr: '500 － (180 ＋ 120)',
        unbracketed: '500 － 180 － 120',
        value: '200 元',
        story:
          '小明帶 500 元買 180 元書和 120 元筆袋：先加總再付 300 元，跟一樣一樣連續扣錢（500－180－120），最後都剩 200 元！',
      },
      {
        shortLabel: '折價補加',
        badge: 'a − (b − c) ＝ a − b + c',
        title: '天王 2 · 折價退款（括號前是「－」，裡面的「－」變「＋」）',
        expr: '500 － (240 － 40)',
        unbracketed: '500 － 240 ＋ 40',
        value: '300 元',
        story:
          '小華帶 500 元買原價 240 元背包、特價折 40 元：先付原價 240 元多扣了 40 元折扣，老闆把 40 元退還補加回來，實剩 300 元！',
      },
      {
        shortLabel: '分裝連除',
        badge: 'a ÷ (b × c) ＝ a ÷ b ÷ c',
        title: '天王 3 · 分裝再裝箱（括號前是「÷」，裡面的「×」變「÷」）',
        expr: '360 ÷ (10 × 6)',
        unbracketed: '360 ÷ 10 ÷ 6',
        value: '6 箱',
        story:
          '360 片餅乾每 10 片裝 1 袋、每 6 袋裝 1 箱：先算 1 箱 60 片再除，跟先分裝成 36 袋再裝箱，結果都是 6 箱！',
      },
      {
        shortLabel: '切小變多',
        badge: 'a ÷ (b ÷ c) ＝ a ÷ b × c',
        title: '天王 4 · 每段切小段數變多（括號前是「÷」，裡面的「÷」變「×」）',
        expr: '240 ÷ (30 ÷ 3)',
        unbracketed: '240 ÷ 30 × 3',
        value: '24 小段',
        story:
          '240 公分彩帶原每 30 公分剪 1 大段（共 8 段），改把每大段平分 3 小段：除數縮小 3 倍、份數放大 3 倍，變成 8 × 3 ＝ 24 小段！',
      },
    ];
    const active = cases[ruleCase];
    return (
      <div className="space-y-4 rounded-xl border border-orange-200 bg-orange-50/55 p-4 shadow-sm sm:p-5 dark:border-orange-500/30 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-orange-700 dark:text-amber-300">
              互動等值天平 · 「去括號四天王」正數生活實驗室
            </div>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base dark:text-white">
              點選講義四大生活情境，親眼驗證只有括號前是「－」或「÷」才會變號
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cases.map((c, idx) => (
              <button
                key={c.shortLabel}
                type="button"
                onClick={() => setRuleCase(idx as 0 | 1 | 2 | 3)}
                className={`min-h-[38px] rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  ruleCase === idx
                    ? 'bg-orange-600 text-white dark:bg-amber-400 dark:text-slate-950'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-orange-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                {idx + 1}. {c.shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-orange-700 dark:text-orange-300">{active.title}</span>
            <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
              {active.badge}
            </span>
          </div>
          <div className="grid grid-cols-1 items-center gap-3 text-center sm:grid-cols-11">
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 font-mono text-base font-extrabold text-sky-900 sm:col-span-5 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-200">
              {active.expr} ＝ {active.value}
            </div>
            <div className="font-mono text-lg font-extrabold text-emerald-600 sm:col-span-1 dark:text-emerald-400">
              ＝
            </div>
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 font-mono text-base font-extrabold text-emerald-900 sm:col-span-5 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
              {active.unbracketed} ＝ {active.value}
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{active.story}</p>
        </div>

        {/* 2x2 去括號四天王速查口訣表 */}
        <div className="rounded-xl border border-slate-200 bg-white/90 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-900 dark:text-white">
              去括號四天王速查（只有這 4 種情況需要變號）
            </span>
            <span className="font-bold text-amber-700 dark:text-amber-300">
              口訣：「加、乘在前直接去；減、除在前裡面變！」
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-rose-200/80 bg-rose-50/60 px-3 py-2 dark:border-rose-500/25 dark:bg-rose-500/10">
              <div className="font-bold text-rose-800 dark:text-rose-200">連加減（括號前是「－」）</div>
              <div className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                a − (b + c) ＝ a − b − c ｜ a − (b − c) ＝ a − b + c
              </div>
            </div>
            <div className="rounded-lg border border-sky-200/80 bg-sky-50/60 px-3 py-2 dark:border-cyan-500/25 dark:bg-cyan-500/10">
              <div className="font-bold text-sky-800 dark:text-cyan-200">連乘除（括號前是「÷」）</div>
              <div className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                a ÷ (b × c) ＝ a ÷ b ÷ c ｜ a ÷ (b ÷ c) ＝ a ÷ b × c
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sectorId === 's6') {
    const sq = figN * figN;
    const tri = (figN * (figN + 1)) / 2;
    const odds = Array.from({ length: figN }, (_, i) => 2 * i + 1).join('＋');
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm sm:p-5 dark:border-emerald-500/30 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              動態點陣生成器 · 正方形數與三角形數視覺對照
            </div>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base dark:text-white">
              滑動調整層數 n = {figN}，即時生成點陣圓點排列與累加公式
            </h3>
          </div>
          <input
            type="range"
            min={2}
            max={6}
            value={figN}
            onChange={(e) => setFigN(Number(e.target.value))}
            aria-label="點陣邊長 n"
            className="w-40 accent-emerald-600 dark:accent-emerald-400"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                第 {figN} 個正方形數（連續奇數和）
              </span>
              <span className="font-mono text-sm font-extrabold text-sky-700 tabular-nums dark:text-cyan-300">
                {sq} 顆
              </span>
            </div>
            <div className="my-2.5 flex justify-center">
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${figN}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: sq }, (_, idx) => (
                  <span key={idx} className="h-3 w-3 rounded-full bg-sky-500 dark:bg-cyan-400" />
                ))}
              </div>
            </div>
            <div className="text-center font-mono text-xs font-bold text-slate-700 tabular-nums dark:text-slate-200">
              {odds} ＝ {sq}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                第 {figN} 個三角形數（高斯求和）
              </span>
              <span className="font-mono text-sm font-extrabold text-amber-600 tabular-nums dark:text-amber-300">
                {tri} 顆
              </span>
            </div>
            <div className="my-2.5 flex flex-col items-center gap-1">
              {Array.from({ length: figN }, (_, r) => (
                <div key={r} className="flex gap-1.5">
                  {Array.from({ length: r + 1 }, (_, c) => (
                    <span key={c} className="h-3 w-3 rounded-full bg-amber-500 dark:bg-amber-400" />
                  ))}
                </div>
              ))}
            </div>
            <div className="text-center font-mono text-xs font-bold text-slate-700 tabular-nums dark:text-slate-200">
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
      <div className="rounded-xl border border-sky-200 bg-sky-50/55 p-4 shadow-sm sm:p-5 dark:border-cyan-500/30 dark:bg-[#080D1A] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
              指數渦輪推演器 · 2 的乘方與個位數字循環
            </div>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base dark:text-white">
              滑動指數 n（0～11），秒記常見 2 的次方數值
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900/80">
          <span className="font-mono text-2xl font-extrabold text-slate-900 tabular-nums dark:text-white">
            2^{powExp} ＝ {val}
          </span>
          <span className="text-sm text-sky-700 dark:text-cyan-300">
            個位數字：
            <strong className="font-mono text-lg text-amber-600 dark:text-amber-300">{val % 10}</strong>
            （每 4 次方 2, 4, 8, 6 循環）
          </span>
        </div>
      </div>
    );
  }

  const reversed = [...mirrorHeight].reverse();
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm sm:p-5 dark:border-indigo-500/30 dark:bg-[#080D1A] dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
            全息視圖鏡像儀 · 左視圖 vs 右視圖
          </div>
          <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base dark:text-white">
            點擊切換左視圖三欄高度，觀察右視圖如何左右鏡像翻轉
          </h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
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
              className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 py-1 font-mono text-xs font-bold text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-200"
            >
              第{i + 1}欄：{h}層
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 text-center">
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">左視圖</div>
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
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            右視圖（左右鏡像相反）
          </div>
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
          {isCompleted ? '✓ 重點教學已完成' : '完成重點教學'}
        </button>

        <button
          type="button"
          onClick={onGoNextTab}
          className="whitespace-nowrap rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        >
          前往實戰演練 →
        </button>
      </div>
    </div>
  );
}
