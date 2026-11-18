export interface DiagramProps {
  id: string;
}

export function MathDiagram({ id }: DiagramProps) {
  switch (id) {
    case 'area-inscribed-square':
      return (
        <svg viewBox="0 0 220 200" className="mx-auto h-44 w-auto" role="img" aria-label="直徑20公分的圓內接正方形">
          <rect x="8" y="6" width="204" height="188" rx="14" fill="#080D1A" />
          <circle cx="110" cy="100" r="72" fill="rgba(56,189,248,0.22)" stroke="#38BDF8" strokeWidth="2" />
          <polygon points="110,28 182,100 110,172 38,100" fill="#0F172A" stroke="#E2E8F0" strokeWidth="2" />
          <line x1="110" y1="28" x2="110" y2="172" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="38" y1="100" x2="182" y2="100" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4,4" />
          <text x="110" y="20" textAnchor="middle" fill="#E2E8F0" fontSize="12">A</text>
          <text x="24" y="104" textAnchor="middle" fill="#E2E8F0" fontSize="12">B</text>
          <text x="110" y="188" textAnchor="middle" fill="#E2E8F0" fontSize="12">C</text>
          <text x="196" y="104" textAnchor="middle" fill="#E2E8F0" fontSize="12">D</text>
          <text x="142" y="94" fill="#FBBF24" fontSize="12" fontWeight="700">20cm</text>
        </svg>
      );

    case 'area-goat-barn':
      return (
        <svg viewBox="0 0 260 200" className="mx-auto h-44 w-auto" role="img" aria-label="倉庫16m乘8m與繩長10m羊吃草範圍">
          <rect x="6" y="6" width="248" height="188" rx="14" fill="#080D1A" />
          <path
            d="M 145 95 L 145 35 A 60 60 0 1 1 85 95 Z"
            fill="rgba(52,211,153,0.22)"
            stroke="#34D399"
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />
          <path
            d="M 145 47 L 133 47 A 12 12 0 0 1 145 35 Z"
            fill="rgba(56,189,248,0.35)"
            stroke="#38BDF8"
            strokeWidth="1.5"
          />
          <rect x="49" y="47" width="96" height="48" fill="rgba(244,114,182,0.25)" stroke="#F472B6" strokeWidth="2" />
          <text x="97" y="75" textAnchor="middle" fill="#FBCFE8" fontSize="13" fontWeight="700">倉庫</text>
          <text x="97" y="110" textAnchor="middle" fill="#E2E8F0" fontSize="11">16m</text>
          <text x="155" y="73" fill="#E2E8F0" fontSize="11">8m</text>
          <line x1="145" y1="95" x2="188" y2="138" stroke="#FBBF24" strokeWidth="1.8" />
          <text x="172" y="122" fill="#FBBF24" fontSize="11" fontWeight="700">繩長10m</text>
          <circle cx="145" cy="95" r="3.5" fill="#FBBF24" />
        </svg>
      );

    case 'area-leaf-8cm':
      return (
        <svg viewBox="0 0 200 190" className="mx-auto h-44 w-auto" role="img" aria-label="邊長8cm正方形內的葉子斜線面積">
          <rect x="8" y="6" width="184" height="178" rx="14" fill="#080D1A" />
          <rect x="40" y="25" width="120" height="120" fill="#0F172A" stroke="#E2E8F0" strokeWidth="2" />
          <path
            d="M 40 145 A 120 120 0 0 1 160 25 A 120 120 0 0 1 40 145 Z"
            fill="rgba(56,189,248,0.28)"
            stroke="#38BDF8"
            strokeWidth="2"
          />
          <text x="29" y="22" fill="#E2E8F0" fontSize="12">A</text>
          <text x="165" y="22" fill="#E2E8F0" fontSize="12">B</text>
          <text x="165" y="156" fill="#E2E8F0" fontSize="12">C</text>
          <text x="28" y="156" fill="#E2E8F0" fontSize="12">D</text>
          <text x="100" y="169" textAnchor="middle" fill="#FBBF24" fontSize="12" fontWeight="700">邊長 8cm</text>
        </svg>
      );

    case 'area-clover-20cm':
      return (
        <svg viewBox="0 0 210 190" className="mx-auto h-44 w-auto" role="img" aria-label="邊長20cm正方形內的四葉草面積">
          <rect x="8" y="6" width="194" height="178" rx="14" fill="#080D1A" />
          <rect x="40" y="28" width="120" height="120" fill="#0F172A" stroke="#E2E8F0" strokeWidth="2" />
          <path d="M 100 88 A 60 60 0 0 1 40 28 A 60 60 0 0 1 100 88 Z" fill="rgba(167,139,250,0.32)" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 100 88 A 60 60 0 0 1 160 28 A 60 60 0 0 1 100 88 Z" fill="rgba(167,139,250,0.32)" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 100 88 A 60 60 0 0 1 160 148 A 60 60 0 0 1 100 88 Z" fill="rgba(167,139,250,0.32)" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 100 88 A 60 60 0 0 1 40 148 A 60 60 0 0 1 100 88 Z" fill="rgba(167,139,250,0.32)" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 40 28 A 60 60 0 0 0 160 28" fill="none" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 40 148 A 60 60 0 0 1 160 148" fill="none" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 40 28 A 60 60 0 0 1 40 148" fill="none" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 160 28 A 60 60 0 0 0 160 148" fill="none" stroke="#A78BFA" strokeWidth="1.5" />
          <text x="100" y="21" textAnchor="middle" fill="#FBBF24" fontSize="12" fontWeight="700">20cm</text>
          <text x="166" y="92" fill="#FBBF24" fontSize="12" fontWeight="700">20cm</text>
        </svg>
      );

    case 'area-two-semicircles':
      return (
        <svg viewBox="0 0 240 180" className="mx-auto h-44 w-auto" role="img" aria-label="邊長25cm正方形兩側各做半圓">
          <rect x="8" y="6" width="224" height="168" rx="14" fill="#080D1A" />
          <path d="M 70 35 A 55 55 0 0 0 70 145 Z" fill="rgba(56,189,248,0.28)" stroke="#38BDF8" strokeWidth="2" />
          <path d="M 170 35 A 55 55 0 0 1 170 145 Z" fill="rgba(56,189,248,0.28)" stroke="#38BDF8" strokeWidth="2" />
          <rect x="70" y="35" width="100" height="110" fill="#0F172A" stroke="#E2E8F0" strokeWidth="2" />
          <text x="120" y="25" textAnchor="middle" fill="#FBBF24" fontSize="12" fontWeight="700">25cm</text>
          <text x="90" y="94" fill="#94A3B8" fontSize="11">25cm</text>
        </svg>
      );

    case 'area-45-triangle-semicircle':
      return (
        <svg viewBox="0 0 220 180" className="mx-auto h-44 w-auto" role="img" aria-label="底10cm的45度直角三角形與直徑10cm半圓割補">
          <rect x="8" y="6" width="204" height="168" rx="14" fill="#080D1A" />
          <path d="M 40 140 A 55 55 0 0 1 95 85 L 95 140 Z" fill="rgba(52,211,153,0.3)" />
          <path d="M 95 85 L 150 30 L 150 140 A 55 55 0 0 0 95 85 Z" fill="rgba(52,211,153,0.3)" />
          <polygon points="40,140 150,140 150,30" fill="none" stroke="#E2E8F0" strokeWidth="2" />
          <path d="M 40 140 A 55 55 0 0 1 150 140" fill="none" stroke="#34D399" strokeWidth="2" />
          <line x1="95" y1="85" x2="95" y2="140" stroke="#94A3B8" strokeWidth="1.5" />
          <text x="68" y="132" fill="#FBBF24" fontSize="11" fontWeight="700">45°</text>
          <text x="95" y="160" textAnchor="middle" fill="#FBBF24" fontSize="12" fontWeight="700">10cm</text>
        </svg>
      );

    case 'area-rect-in-triangle':
      return (
        <svg viewBox="0 0 240 170" className="mx-auto h-44 w-auto" role="img" aria-label="直角三角形ABC內接長方形BDFE，AD=8cm，EC=5cm">
          <rect x="8" y="6" width="224" height="158" rx="14" fill="#080D1A" />
          <polygon points="45,25 45,135 205,135" fill="#0F172A" stroke="#E2E8F0" strokeWidth="2" />
          <rect x="45" y="95" width="102" height="40" fill="rgba(56,189,248,0.36)" stroke="#38BDF8" strokeWidth="2" />
          <text x="34" y="25" fill="#E2E8F0" fontSize="12">A</text>
          <text x="32" y="98" fill="#E2E8F0" fontSize="12">D</text>
          <text x="32" y="142" fill="#E2E8F0" fontSize="12">B</text>
          <text x="147" y="152" textAnchor="middle" fill="#E2E8F0" fontSize="12">E</text>
          <text x="214" y="142" fill="#E2E8F0" fontSize="12">C</text>
          <text x="150" y="88" fill="#E2E8F0" fontSize="12">F</text>
          <text x="53" y="66" fill="#FBBF24" fontSize="11" fontWeight="700">8cm</text>
          <text x="176" y="150" textAnchor="middle" fill="#FBBF24" fontSize="11" fontWeight="700">5cm</text>
        </svg>
      );

    case 'area-perp-diag':
      return (
        <svg viewBox="0 0 220 170" className="mx-auto h-44 w-auto" role="img" aria-label="對角線互相垂直的四邊形面積圖解">
          <rect x="8" y="6" width="204" height="158" rx="14" fill="#080D1A" />
          <polygon points="110,24 182,76 110,146 38,76" fill="rgba(251,191,36,0.2)" stroke="#FBBF24" strokeWidth="2" />
          <line x1="110" y1="24" x2="110" y2="146" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4,3" />
          <line x1="38" y1="76" x2="182" y2="76" stroke="#34D399" strokeWidth="2" strokeDasharray="4,3" />
          <rect x="110" y="66" width="10" height="10" fill="none" stroke="#E2E8F0" strokeWidth="1.2" />
          <text x="122" y="48" fill="#38BDF8" fontSize="11" fontWeight="700">12cm</text>
          <text x="144" y="92" fill="#34D399" fontSize="11" fontWeight="700">10cm</text>
        </svg>
      );

    case 'seq-square-dots':
      return (
        <svg viewBox="0 0 280 130" className="mx-auto h-36 w-auto" role="img" aria-label="正方形黑點數列圖一到圖三">
          <rect x="6" y="6" width="268" height="118" rx="14" fill="#080D1A" />
          {/* Fig 1: 2x2 */}
          {[0, 1].map((r) =>
            [0, 1].map((c) => (
              <circle key={`1-${r}-${c}`} cx={28 + c * 14} cy={66 + r * 14} r="4.2" fill="#38BDF8" />
            ))
          )}
          <text x="35" y="112" textAnchor="middle" fill="#94A3B8" fontSize="10">圖(一) 2×2</text>
          {/* Fig 2: 4x4 */}
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <circle key={`2-${r}-${c}`} cx={90 + c * 13} cy={44 + r * 13} r="3.8" fill="#34D399" />
            ))
          )}
          <text x="110" y="112" textAnchor="middle" fill="#94A3B8" fontSize="10">圖(二) 4×4</text>
          {/* Fig 3: 6x6 */}
          {[0, 1, 2, 3, 4, 5].map((r) =>
            [0, 1, 2, 3, 4, 5].map((c) => (
              <circle key={`3-${r}-${c}`} cx={172 + c * 12} cy={24 + r * 12} r="3.4" fill="#FBBF24" />
            ))
          )}
          <text x="202" y="112" textAnchor="middle" fill="#94A3B8" fontSize="10">圖(三) 6×6</text>
        </svg>
      );

    case 'seq-triangle-cubes':
      return (
        <svg viewBox="0 0 240 165" className="mx-auto h-40 w-auto" role="img" aria-label="正方體積木第1層1個、第2層3個、第3層6個">
          <rect x="8" y="6" width="224" height="153" rx="14" fill="#080D1A" />
          {[
            { row: 0, count: 1, y: 34, fill: '#FBBF24' },
            { row: 1, count: 3, y: 70, fill: '#38BDF8' },
            { row: 2, count: 6, y: 106, fill: '#34D399' },
          ].map((lvl) => (
            <g key={lvl.row}>
              {Array.from({ length: lvl.count }, (_, i) => (
                <rect
                  key={i}
                  x={28 + i * 21}
                  y={lvl.y}
                  width="17"
                  height="17"
                  rx="3"
                  fill={lvl.fill}
                  stroke="#0F172A"
                  strokeWidth="1.2"
                />
              ))}
              <text x="166" y={lvl.y + 13} fill="#E2E8F0" fontSize="11" fontWeight="600">
                第 {lvl.row + 1} 層（{lvl.count} 個）
              </text>
            </g>
          ))}
        </svg>
      );

    case 'seq-toothpick-triangles':
      return (
        <svg viewBox="0 0 280 135" className="mx-auto h-36 w-auto" role="img" aria-label="牙籤倒三角形金字塔圖1到圖3">
          <rect x="6" y="6" width="268" height="123" rx="14" fill="#080D1A" />
          {/* Fig 1: 1 tri */}
          <polygon points="32,36 52,36 42,54" fill="none" stroke="#38BDF8" strokeWidth="2.2" />
          <text x="42" y="112" textAnchor="middle" fill="#E2E8F0" fontSize="10">圖① (3根)</text>
          {/* Fig 2: 1+2 tris */}
          <polygon points="88,36 108,36 98,54" fill="none" stroke="#34D399" strokeWidth="2" />
          <polygon points="108,36 128,36 118,54" fill="none" stroke="#34D399" strokeWidth="2" />
          <polygon points="98,54 118,54 108,72" fill="none" stroke="#34D399" strokeWidth="2" />
          <text x="108" y="112" textAnchor="middle" fill="#E2E8F0" fontSize="10">圖② (9根)</text>
          {/* Fig 3: 1+2+3 tris */}
          {[0, 1, 2].map((i) => (
            <polygon
              key={`r1-${i}`}
              points={`${166 + i * 20},36 ${186 + i * 20},36 ${176 + i * 20},54`}
              fill="none"
              stroke="#FBBF24"
              strokeWidth="2"
            />
          ))}
          {[0, 1].map((i) => (
            <polygon
              key={`r2-${i}`}
              points={`${176 + i * 20},54 ${196 + i * 20},54 ${186 + i * 20},72`}
              fill="none"
              stroke="#FBBF24"
              strokeWidth="2"
            />
          ))}
          <polygon points="186,72 206,72 196,90" fill="none" stroke="#FBBF24" strokeWidth="2" />
          <text x="196" y="112" textAnchor="middle" fill="#E2E8F0" fontSize="10">圖③ (18根)</text>
        </svg>
      );

    case 'seq-toothpick-row':
      return (
        <svg viewBox="0 0 280 120" className="mx-auto h-32 w-auto" role="img" aria-label="牙籤橫排連續三角形">
          <rect x="6" y="6" width="268" height="108" rx="14" fill="#080D1A" />
          {[0, 1, 2, 3, 4].map((i) => {
            const x = 32 + i * 32;
            const up = i % 2 === 0;
            return up ? (
              <polygon key={i} points={`${x},76 ${x + 32},76 ${x + 16},44`} fill="rgba(56,189,248,0.16)" stroke="#38BDF8" strokeWidth="2.2" />
            ) : (
              <polygon key={i} points={`${x - 16},44 ${x + 16},44 ${x},76`} fill="rgba(251,191,36,0.16)" stroke="#FBBF24" strokeWidth="2.2" />
            );
          })}
          <text x="140" y="100" textAnchor="middle" fill="#94A3B8" fontSize="11">第1個用3根，每多1個多2根（2n＋1）</text>
        </svg>
      );

    case 'seq-hollow-tri':
      return (
        <svg viewBox="0 0 280 130" className="mx-auto h-36 w-auto" role="img" aria-label="圍棋空心正三角形圖1到圖4">
          <rect x="6" y="6" width="268" height="118" rx="14" fill="#080D1A" />
          {/* Fig 1 (3) */}
          <circle cx="34" cy="48" r="3.6" fill="#E2E8F0" />
          <circle cx="27" cy="64" r="3.6" fill="#E2E8F0" />
          <circle cx="41" cy="64" r="3.6" fill="#E2E8F0" />
          <text x="34" y="106" textAnchor="middle" fill="#94A3B8" fontSize="10">圖1 (3顆)</text>
          {/* Fig 2 (6) */}
          {[
            [86, 40],
            [79, 52],
            [93, 52],
            [72, 64],
            [86, 64],
            [100, 64],
          ].map(([cx, cy], idx) => (
            <circle key={idx} cx={cx} cy={cy} r="3.4" fill="#38BDF8" />
          ))}
          <text x="86" y="106" textAnchor="middle" fill="#94A3B8" fontSize="10">圖2 (6顆)</text>
          {/* Fig 3 (9) */}
          {[
            [152, 32],
            [145, 44],
            [159, 44],
            [138, 56],
            [166, 56],
            [131, 68],
            [145, 68],
            [159, 68],
            [173, 68],
          ].map(([cx, cy], idx) => (
            <circle key={idx} cx={cx} cy={cy} r="3.2" fill="#34D399" />
          ))}
          <text x="152" y="106" textAnchor="middle" fill="#94A3B8" fontSize="10">圖3 (9顆)</text>
          {/* Fig 4 (12) */}
          {[
            [226, 26],
            [220, 38],
            [232, 38],
            [214, 50],
            [238, 50],
            [208, 62],
            [244, 62],
            [202, 74],
            [214, 74],
            [226, 74],
            [238, 74],
            [250, 74],
          ].map(([cx, cy], idx) => (
            <circle key={idx} cx={cx} cy={cy} r="3" fill="#FBBF24" />
          ))}
          <text x="226" y="106" textAnchor="middle" fill="#94A3B8" fontSize="10">圖4 (12顆)</text>
        </svg>
      );

    case 'views-stacked-cubes':
      return (
        <svg viewBox="0 0 220 180" className="mx-auto h-44 w-auto" role="img" aria-label="立體堆疊積木圖：前排左中右共3個底座，左後方疊至3層，中後方疊至2層">
          <rect x="8" y="6" width="204" height="168" rx="14" fill="#080D1A" />
          <g transform="translate(110, 145)">
            {[
              { gx: -1, gy: -1, h: 3 },
              { gx: 0, gy: -1, h: 2 },
              { gx: -1, gy: 0, h: 1 },
              { gx: 0, gy: 0, h: 1 },
              { gx: 1, gy: 0, h: 1 },
            ].map((col, idx) =>
              Array.from({ length: col.h }, (_, z) => {
                const s = 24;
                const cx = (col.gx - col.gy) * s * 0.86;
                const cy = (col.gx + col.gy) * s * 0.48 - z * s * 0.92;
                const dx = s * 0.86;
                const dy = s * 0.48;
                const dz = s * 0.92;
                return (
                  <g key={`${idx}-${z}`}>
                    <polygon
                      points={`${cx},${cy - dz} ${cx + dx},${cy + dy - dz} ${cx},${cy + 2 * dy - dz} ${cx - dx},${cy + dy - dz}`}
                      fill="#38BDF8"
                      stroke="#080D1A"
                      strokeWidth="1.5"
                    />
                    <polygon
                      points={`${cx - dx},${cy + dy - dz} ${cx},${cy + 2 * dy - dz} ${cx},${cy + 2 * dy} ${cx - dx},${cy + dy}`}
                      fill="#0284C7"
                      stroke="#080D1A"
                      strokeWidth="1.5"
                    />
                    <polygon
                      points={`${cx},${cy + 2 * dy - dz} ${cx + dx},${cy + dy - dz} ${cx + dx},${cy + dy} ${cx},${cy + 2 * dy}`}
                      fill="#0369A1"
                      stroke="#080D1A"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })
            )}
          </g>
          <text x="44" y="158" fill="#FBBF24" fontSize="11" fontWeight="700">前面 ↗</text>
        </svg>
      );

    case 'views-remove-abcd':
      return (
        <svg viewBox="0 0 240 175" className="mx-auto h-44 w-auto" role="img" aria-label="8個積木堆疊模型標記A、B、C、D位置">
          <rect x="8" y="6" width="224" height="163" rx="14" fill="#080D1A" />
          {/* 2 cols x 2 rows base + height, labels A(front-left top), B(back-left top), C(back-right), D(front-right) */}
          <g transform="translate(120, 128)">
            {[
              { gx: 0, gy: -1, h: 2, label: 'B' },
              { gx: 1, gy: -1, h: 2, label: 'C' },
              { gx: 0, gy: 0, h: 2, label: 'A' },
              { gx: 1, gy: 0, h: 1, label: 'D' },
            ].map((col, idx) =>
              Array.from({ length: col.h }, (_, z) => {
                const s = 26;
                const cx = (col.gx - col.gy) * s * 0.86;
                const cy = (col.gx + col.gy) * s * 0.48 - z * s * 0.92;
                const dx = s * 0.86;
                const dy = s * 0.48;
                const dz = s * 0.92;
                const isTop = z === col.h - 1;
                return (
                  <g key={`${idx}-${z}`}>
                    <polygon
                      points={`${cx},${cy - dz} ${cx + dx},${cy + dy - dz} ${cx},${cy + 2 * dy - dz} ${cx - dx},${cy + dy - dz}`}
                      fill={col.label === 'D' ? '#34D399' : '#38BDF8'}
                      stroke="#080D1A"
                      strokeWidth="1.5"
                    />
                    <polygon
                      points={`${cx - dx},${cy + dy - dz} ${cx},${cy + 2 * dy - dz} ${cx},${cy + 2 * dy} ${cx - dx},${cy + dy}`}
                      fill={col.label === 'D' ? '#059669' : '#0284C7'}
                      stroke="#080D1A"
                      strokeWidth="1.5"
                    />
                    <polygon
                      points={`${cx},${cy + 2 * dy - dz} ${cx + dx},${cy + dy - dz} ${cx + dx},${cy + dy} ${cx},${cy + 2 * dy}`}
                      fill={col.label === 'D' ? '#047857' : '#0369A1'}
                      stroke="#080D1A"
                      strokeWidth="1.5"
                    />
                    {isTop && (
                      <text x={cx} y={cy + dy - dz + 4} textAnchor="middle" fill="#080D1A" fontSize="11" fontWeight="800">
                        {col.label}
                      </text>
                    )}
                  </g>
                );
              })
            )}
          </g>
          <text x="48" y="152" fill="#FBBF24" fontSize="11" fontWeight="700">前面 ↗（D 前方遮住後方兩層的 C）</text>
        </svg>
      );

    case 'views-10cubes-sa':
      return (
        <svg viewBox="0 0 240 180" className="mx-auto h-44 w-auto" role="img" aria-label="10個邊長2公分正方體堆疊模型">
          <rect x="8" y="6" width="224" height="168" rx="14" fill="#080D1A" />
          {/* 10 cubes: back [3,2,0]=5, front [2,2,1]=5 */}
          <g transform="translate(112, 142)">
            {[
              { gx: -1, gy: -1, h: 3 },
              { gx: 0, gy: -1, h: 2 },
              { gx: -1, gy: 0, h: 2 },
              { gx: 0, gy: 0, h: 2 },
              { gx: 1, gy: 0, h: 1 },
            ].map((col, idx) =>
              Array.from({ length: col.h }, (_, z) => {
                const s = 23;
                const cx = (col.gx - col.gy) * s * 0.86;
                const cy = (col.gx + col.gy) * s * 0.48 - z * s * 0.92;
                const dx = s * 0.86;
                const dy = s * 0.48;
                const dz = s * 0.92;
                return (
                  <g key={`${idx}-${z}`}>
                    <polygon
                      points={`${cx},${cy - dz} ${cx + dx},${cy + dy - dz} ${cx},${cy + 2 * dy - dz} ${cx - dx},${cy + dy - dz}`}
                      fill="#A78BFA"
                      stroke="#080D1A"
                      strokeWidth="1.4"
                    />
                    <polygon
                      points={`${cx - dx},${cy + dy - dz} ${cx},${cy + 2 * dy - dz} ${cx},${cy + 2 * dy} ${cx - dx},${cy + dy}`}
                      fill="#7C3AED"
                      stroke="#080D1A"
                      strokeWidth="1.4"
                    />
                    <polygon
                      points={`${cx},${cy + 2 * dy - dz} ${cx + dx},${cy + dy - dz} ${cx + dx},${cy + dy} ${cx},${cy + 2 * dy}`}
                      fill="#5B21B6"
                      stroke="#080D1A"
                      strokeWidth="1.4"
                    />
                  </g>
                );
              })
            )}
          </g>
          <text x="120" y="160" textAnchor="middle" fill="#FBBF24" fontSize="11" fontWeight="700">
            共 10 塊（每塊邊長 2 cm）
          </text>
        </svg>
      );

    default:
      return null;
  }
}
