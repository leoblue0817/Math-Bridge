export interface DiagramProps {
  id: string;
}

export function MathDiagram({ id }: DiagramProps) {
  switch (id) {
    case 'area-inscribed-square':
      return (
        <svg viewBox="0 0 220 200" className="mx-auto h-44 w-auto" role="img" aria-label="直徑20公分的圓內接正方形">
          <circle cx="110" cy="100" r="76" fill="rgba(56,189,248,0.22)" stroke="#38BDF8" strokeWidth="2" />
          <polygon points="110,24 186,100 110,176 34,100" fill="#080D1A" stroke="#E2E8F0" strokeWidth="2" />
          <line x1="110" y1="24" x2="110" y2="176" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="34" y1="100" x2="186" y2="100" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4,4" />
          <text x="110" y="16" textAnchor="middle" fill="#E2E8F0" fontSize="12">A</text>
          <text x="22" y="104" textAnchor="middle" fill="#E2E8F0" fontSize="12">B</text>
          <text x="110" y="192" textAnchor="middle" fill="#E2E8F0" fontSize="12">C</text>
          <text x="198" y="104" textAnchor="middle" fill="#E2E8F0" fontSize="12">D</text>
          <text x="144" y="94" fill="#FBBF24" fontSize="12" fontWeight="700">20cm</text>
        </svg>
      );

    case 'area-goat-barn':
      return (
        <svg viewBox="0 0 260 200" className="mx-auto h-44 w-auto" role="img" aria-label="倉庫16m乘8m與繩長10m羊吃草範圍">
          {/* 3/4 circle of radius 10m (scaled 1m = 6px -> r=60) centered at bottom-right corner (145, 95) */}
          <path
            d="M 145 95 L 145 35 A 60 60 0 1 1 85 95 Z"
            fill="rgba(52,211,153,0.22)"
            stroke="#34D399"
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />
          {/* Extra 1/4 circle around top-right corner (145, 47) with r = 10-8 = 2m (12px) */}
          <path
            d="M 145 47 L 133 47 A 12 12 0 0 1 145 35 Z"
            fill="rgba(56,189,248,0.35)"
            stroke="#38BDF8"
            strokeWidth="1.5"
          />
          {/* Barn 16m x 8m -> 96 x 48 */}
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
          <rect x="40" y="25" width="120" height="120" fill="#080D1A" stroke="#E2E8F0" strokeWidth="2" />
          <path
            d="M 40 145 A 120 120 0 0 1 160 25 A 120 120 0 0 1 40 145 Z"
            fill="rgba(56,189,248,0.28)"
            stroke="#38BDF8"
            strokeWidth="2"
          />
          <text x="32" y="20" fill="#E2E8F0" fontSize="12">A</text>
          <text x="165" y="20" fill="#E2E8F0" fontSize="12">B</text>
          <text x="165" y="158" fill="#E2E8F0" fontSize="12">C</text>
          <text x="30" y="158" fill="#E2E8F0" fontSize="12">D</text>
          <text x="100" y="165" textAnchor="middle" fill="#FBBF24" fontSize="12" fontWeight="700">邊長 8cm</text>
        </svg>
      );

    case 'area-clover-20cm':
      return (
        <svg viewBox="0 0 210 190" className="mx-auto h-44 w-auto" role="img" aria-label="邊長20cm正方形內的四葉草面積">
          <rect x="40" y="25" width="120" height="120" fill="#080D1A" stroke="#E2E8F0" strokeWidth="2" />
          {/* 4 petals using overlapping arcs */}
          <path d="M 100 85 A 60 60 0 0 1 40 25 A 60 60 0 0 1 100 85 Z" fill="rgba(167,139,250,0.32)" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 100 85 A 60 60 0 0 1 160 25 A 60 60 0 0 1 100 85 Z" fill="rgba(167,139,250,0.32)" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 100 85 A 60 60 0 0 1 160 145 A 60 60 0 0 1 100 85 Z" fill="rgba(167,139,250,0.32)" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 100 85 A 60 60 0 0 1 40 145 A 60 60 0 0 1 100 85 Z" fill="rgba(167,139,250,0.32)" stroke="#A78BFA" strokeWidth="1.5" />
          {/* Wait: draw clean 4 semicircles outline */}
          <path d="M 40 25 A 60 60 0 0 0 160 25" fill="none" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 40 145 A 60 60 0 0 1 160 145" fill="none" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 40 25 A 60 60 0 0 1 40 145" fill="none" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M 160 25 A 60 60 0 0 0 160 145" fill="none" stroke="#A78BFA" strokeWidth="1.5" />
          <text x="100" y="18" textAnchor="middle" fill="#FBBF24" fontSize="12" fontWeight="700">20cm</text>
          <text x="176" y="88" fill="#FBBF24" fontSize="12" fontWeight="700">20cm</text>
        </svg>
      );

    case 'area-two-semicircles':
      return (
        <svg viewBox="0 0 240 180" className="mx-auto h-44 w-auto" role="img" aria-label="邊長25cm正方形兩側各做半圓">
          <path d="M 70 35 A 55 55 0 0 0 70 145 Z" fill="rgba(56,189,248,0.28)" stroke="#38BDF8" strokeWidth="2" />
          <path d="M 170 35 A 55 55 0 0 1 170 145 Z" fill="rgba(56,189,248,0.28)" stroke="#38BDF8" strokeWidth="2" />
          <rect x="70" y="35" width="100" height="110" fill="#080D1A" stroke="#E2E8F0" strokeWidth="2" />
          <text x="120" y="25" textAnchor="middle" fill="#FBBF24" fontSize="12" fontWeight="700">25cm</text>
          <text x="90" y="94" fill="#94A3B8" fontSize="11">25cm</text>
        </svg>
      );

    case 'area-45-triangle-semicircle':
      return (
        <svg viewBox="0 0 220 180" className="mx-auto h-44 w-auto" role="img" aria-label="底10cm的45度直角三角形與直徑10cm半圓割補">
          {/* Left curved lune + right upper triangle */}
          <path d="M 40 140 A 55 55 0 0 1 95 85 L 95 140 Z" fill="rgba(52,211,153,0.3)" />
          <path d="M 95 85 L 150 30 L 150 140 L 150 140 A 55 55 0 0 0 95 85 Z" fill="rgba(52,211,153,0.3)" />
          {/* Triangle outline */}
          <polygon points="40,140 150,140 150,30" fill="none" stroke="#E2E8F0" strokeWidth="2" />
          {/* Semicircle outline on base */}
          <path d="M 40 140 A 55 55 0 0 1 150 140" fill="none" stroke="#34D399" strokeWidth="2" />
          <line x1="95" y1="85" x2="95" y2="140" stroke="#94A3B8" strokeWidth="1.5" />
          <text x="68" y="132" fill="#FBBF24" fontSize="11" fontWeight="700">45°</text>
          <text x="95" y="158" textAnchor="middle" fill="#FBBF24" fontSize="12" fontWeight="700">10cm</text>
        </svg>
      );

    case 'area-rect-in-triangle':
      return (
        <svg viewBox="0 0 240 170" className="mx-auto h-44 w-auto" role="img" aria-label="直角三角形ABC內接長方形BDFE，AD=8cm，EC=5cm">
          <polygon points="45,25 45,135 205,135" fill="#080D1A" stroke="#E2E8F0" strokeWidth="2" />
          <rect x="45" y="95" width="102" height="40" fill="rgba(148,163,184,0.45)" stroke="#38BDF8" strokeWidth="2" />
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

    case 'views-stacked-cubes':
      return (
        <svg viewBox="0 0 220 180" className="mx-auto h-44 w-auto" role="img" aria-label="立體堆疊積木圖：前排左中右共3個底座，左後方疊至3層，中後方疊至2層">
          {/* Isometric helper: draw 3D cubes */}
          {/* Stack heights: back-left (0,0)=3, back-mid (1,0)=2, front-right (2,1)=1, front-left (0,1)=1, front-mid (1,1)=1 */}
          <g transform="translate(110, 145)">
            {[
              { gx: -1, gy: -1, h: 3 },
              { gx: 0, gy: -1, h: 2 },
              { gx: -1, gy: 0, h: 1 },
              { gx: 0, gy: 0, h: 1 },
              { gx: 1, gy: 0, h: 1 },
            ].map((col, idx) =>
              Array.from({ length: col.h }, (_, z) => {
                const s = 26;
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
          <text x="48" y="158" fill="#FBBF24" fontSize="11" fontWeight="700">前面 ↗</text>
        </svg>
      );

    default:
      return null;
  }
}
