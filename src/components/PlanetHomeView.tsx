import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  Flag,
  LayoutGrid,
  Moon,
  Pause,
  Play,
  SlidersHorizontal,
  Star,
  Sun,
  Trophy,
  User,
} from 'lucide-react';
import { SECTORS, getSectorStarStats, getTotalSystemStars } from '../data/sectors';
import { AppMode, ProfileRecord, SectorId, ThemeMode } from '../types';

interface PlanetHomeViewProps {
  profile: ProfileRecord;
  mode: AppMode;
  theme: ThemeMode;
  wrongCount: number;
  onSelectSector: (id: SectorId) => void;
  onSwitchToGrid: () => void;
  onToggleTheme: (t: ThemeMode) => void;
  onChangeMode: (m: AppMode) => void;
  onOpenProgressModal: () => void;
  onOpenWrongModal: () => void;
}

export interface PlanetOrbitMeta {
  id: SectorId;
  lon: number;
  lat: number;
  orbitRadius: number;
  orbitDuration: number;
  startAngle: number;
  planetRadius: number;
  colorLight: string;
  color: string;
  colorDeep: string;
  glowColor: string;
  bandColor: string;
  landFill: string;
  shoreFill: string;
  hasRing?: boolean;
  hasMoon?: boolean;
}

export const PLANET_META: Record<SectorId, PlanetOrbitMeta> = {
  s1: {
    id: 's1',
    lon: -28,
    lat: 24,
    orbitRadius: 90,
    orbitDuration: 24,
    startAngle: -28,
    planetRadius: 18,
    colorLight: '#C4B5FD',
    color: '#8B5CF6',
    colorDeep: '#4C1D95',
    glowColor: '#C4B5FD',
    bandColor: '#EDE9FE',
    landFill: '#C084FC',
    shoreFill: '#FDE68A',
  },
  s2: {
    id: 's2',
    lon: 34,
    lat: 20,
    orbitRadius: 122,
    orbitDuration: 30,
    startAngle: 46,
    planetRadius: 20,
    colorLight: '#F9A8D4',
    color: '#EC4899',
    colorDeep: '#831843',
    glowColor: '#F9A8D4',
    bandColor: '#FCE7F3',
    landFill: '#F472B6',
    shoreFill: '#FEF08A',
    hasMoon: true,
  },
  s3: {
    id: 's3',
    lon: -16,
    lat: -18,
    orbitRadius: 154,
    orbitDuration: 38,
    startAngle: 128,
    planetRadius: 22,
    colorLight: '#FDE68A',
    color: '#F59E0B',
    colorDeep: '#78350F',
    glowColor: '#FCD34D',
    bandColor: '#FEF3C7',
    landFill: '#FBBF24',
    shoreFill: '#FEF9C3',
  },
  s4: {
    id: 's4',
    lon: 48,
    lat: -24,
    orbitRadius: 186,
    orbitDuration: 46,
    startAngle: 206,
    planetRadius: 23,
    colorLight: '#99F6E4',
    color: '#14B8A6',
    colorDeep: '#134E4A',
    glowColor: '#5EEAD4',
    bandColor: '#CCFBF1',
    landFill: '#2DD4BF',
    shoreFill: '#E0F2FE',
    hasRing: true,
  },
  s5: {
    id: 's5',
    lon: 112,
    lat: 18,
    orbitRadius: 218,
    orbitDuration: 54,
    startAngle: -102,
    planetRadius: 21,
    colorLight: '#FED7AA',
    color: '#F97316',
    colorDeep: '#7C2D12',
    glowColor: '#FDBA74',
    bandColor: '#FFEDD5',
    landFill: '#FB923C',
    shoreFill: '#FEF3C7',
    hasMoon: true,
  },
  s6: {
    id: 's6',
    lon: 162,
    lat: -16,
    orbitRadius: 250,
    orbitDuration: 62,
    startAngle: -14,
    planetRadius: 25,
    colorLight: '#A7F3D0',
    color: '#10B981',
    colorDeep: '#064E3B',
    glowColor: '#6EE7B7',
    bandColor: '#D1FAE5',
    landFill: '#34D399',
    shoreFill: '#ECFDF5',
    hasRing: true,
  },
  s7: {
    id: 's7',
    lon: -128,
    lat: 14,
    orbitRadius: 282,
    orbitDuration: 72,
    startAngle: 92,
    planetRadius: 22,
    colorLight: '#BAE6FD',
    color: '#0EA5E9',
    colorDeep: '#0C4A6E',
    glowColor: '#7DD3FC',
    bandColor: '#E0F2FE',
    landFill: '#38BDF8',
    shoreFill: '#F0F9FF',
    hasRing: true,
  },
  s8: {
    id: 's8',
    lon: -88,
    lat: -22,
    orbitRadius: 314,
    orbitDuration: 84,
    startAngle: 174,
    planetRadius: 24,
    colorLight: '#C7D2FE',
    color: '#6366F1',
    colorDeep: '#312E81',
    glowColor: '#A5B4FC',
    bandColor: '#E0E7FF',
    landFill: '#818CF8',
    shoreFill: '#EEF2FF',
    hasMoon: true,
  },
};

function projectSphere(lonDeg: number, latDeg: number, rotLon: number, rotLat: number, radius: number) {
  const toRad = Math.PI / 180;
  const lambda = (lonDeg - rotLon) * toRad;
  const phi = latDeg * toRad;
  const phi0 = rotLat * toRad;

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosPhi0 = Math.cos(phi0);
  const sinPhi0 = Math.sin(phi0);
  const cosLam = Math.cos(lambda);
  const sinLam = Math.sin(lambda);

  const z = sinPhi0 * sinPhi + cosPhi0 * cosPhi * cosLam;
  const x = cosPhi * sinLam * radius;
  const y = -(cosPhi0 * sinPhi - sinPhi0 * cosPhi * cosLam) * radius;

  return { x, y, z };
}

const ASTEROID_BELT = Array.from({ length: 36 }, (_, i) => {
  const angle = (i * 10 * Math.PI) / 180;
  const radius = 202 + ((i * 7) % 9) - 4;
  return {
    x: 340 + radius * Math.cos(angle),
    y: 340 + radius * Math.sin(angle),
    r: (i % 3) * 0.7 + 0.9,
  };
});

export function PlanetHomeView({
  profile,
  mode,
  theme,
  wrongCount,
  onSelectSector,
  onSwitchToGrid,
  onToggleTheme,
  onChangeMode,
  onOpenProgressModal,
  onOpenWrongModal,
}: PlanetHomeViewProps) {
  const [rotLon, setRotLon] = useState(-10);
  const [rotLat, setRotLat] = useState(8);
  const [hoveredSector, setHoveredSector] = useState<SectorId | null>(null);
  const [isMotionPaused, setIsMotionPaused] = useState(false);

  const dragRef = useRef<{ active: boolean; x: number; y: number; moved: boolean }>({
    active: false,
    x: 0,
    y: 0,
    moved: false,
  });

  const isDark = theme === 'dark';
  const totalSystemStars = useMemo(() => getTotalSystemStars(SECTORS), []);

  const stats = useMemo(() => {
    let stars = 0;
    let flags = 0;
    SECTORS.forEach((sec) => {
      const s = getSectorStarStats(sec, profile.sectors[sec.id]);
      stars += s.earned;
      if (s.allDone) flags += 1;
    });
    return { stars, flags };
  }, [profile]);

  const effectivePaused = isMotionPaused || hoveredSector !== null;

  // Smooth auto-spin on Bright Planet when not paused, hovered, or dragged
  useEffect(() => {
    if (isDark || effectivePaused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      if (!dragRef.current.active) {
        setRotLon((prev) => prev + dt * 0.008);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isDark, effectivePaused]);

  const focusIslandOnMap = (id: SectorId) => {
    setHoveredSector(id);
    if (!isDark) {
      const geo = PLANET_META[id];
      setRotLon(geo.lon);
      setRotLat(geo.lat * 0.45);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = { active: true, x: e.clientX, y: e.clientY, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    setRotLon((prev) => prev - dx * 0.45);
    setRotLat((prev) => Math.max(-45, Math.min(45, prev + dy * 0.35)));
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  // Bright Planet Globe Geometry (Larger 70% Stage)
  const R = 216;
  const cx = 310;
  const cy = 310;

  const graticulePaths = useMemo(() => {
    if (isDark) return [];
    const paths: string[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      let d = '';
      let pen = false;
      for (let lon = -180; lon <= 180; lon += 8) {
        const p = projectSphere(lon, lat, rotLon, rotLat, R);
        if (p.z > 0) {
          d += `${pen ? 'L' : 'M'}${(cx + p.x).toFixed(1)},${(cy + p.y).toFixed(1)} `;
          pen = true;
        } else {
          pen = false;
        }
      }
      if (d) paths.push(d);
    }
    for (let lon = -150; lon <= 180; lon += 30) {
      let d = '';
      let pen = false;
      for (let lat = -85; lat <= 85; lat += 6) {
        const p = projectSphere(lon, lat, rotLon, rotLat, R);
        if (p.z > 0) {
          d += `${pen ? 'L' : 'M'}${(cx + p.x).toFixed(1)},${(cy + p.y).toFixed(1)} `;
          pen = true;
        } else {
          pen = false;
        }
      }
      if (d) paths.push(d);
    }
    return paths;
  }, [isDark, rotLon, rotLat]);

  const projectedIslands = useMemo(() => {
    if (isDark) return [];
    return SECTORS.map((sec) => {
      const geo = PLANET_META[sec.id];
      const p = projectSphere(geo.lon, geo.lat, rotLon, rotLat, R);
      const starStats = getSectorStarStats(sec, profile.sectors[sec.id]);
      return {
        sec,
        geo,
        ...p,
        starStats,
      };
    })
      .filter((item) => item.z > -0.06)
      .sort((a, b) => a.z - b.z);
  }, [isDark, rotLon, rotLat, profile]);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-5">
      {/* Compact Workspace Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-[#0D1424]/90 dark:shadow-none">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenProgressModal}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-cyan-400"
          >
            <User className="h-3.5 w-3.5 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
            <span>學生：{profile.name}</span>
          </button>

          <button
            type="button"
            onClick={onOpenProgressModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>進度管理</span>
          </button>

          <button
            type="button"
            onClick={onOpenWrongModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
          >
            <BookMarked className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="tabular-nums">錯題複習（{wrongCount}）</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-[#080D1A]">
            <button
              type="button"
              onClick={() => onToggleTheme('dark')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                theme === 'dark'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>動感太空</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleTheme('light')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Sun className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span>明亮星球</span>
            </button>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-[#080D1A]">
            <button
              type="button"
              onClick={() => onChangeMode('student')}
              className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold ${
                mode === 'student'
                  ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              學生自學
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('projector')}
              className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold ${
                mode === 'projector'
                  ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              教室投影
            </button>
          </div>

          <button
            type="button"
            onClick={onSwitchToGrid}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400"
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            <span>八區航圖</span>
          </button>
        </div>
      </div>

      {/* 70% Main Visual Stage (col-span-8) + 30% Streamlined Sidebar (col-span-4) */}
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        {/* Left ~70% Big Animated Stage */}
        <div className="flex flex-col items-center lg:col-span-8">
          {isDark ? (
            <div className="relative w-full max-w-[740px] select-none rounded-3xl border border-slate-800/90 bg-[#050A16]/85 p-4 shadow-2xl backdrop-blur-md">
              <div className="mb-1 flex items-center justify-between px-2 text-xs">
                <span className="font-mono font-semibold text-cyan-300">
                  星際太陽系星圖 · 點選軌道大行星即刻啟航
                </span>
                <button
                  type="button"
                  onClick={() => setIsMotionPaused((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-cyan-400"
                >
                  {isMotionPaused ? (
                    <>
                      <Play className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span>繼續公轉</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                      <span>暫停公轉</span>
                    </>
                  )}
                </button>
              </div>

              <svg
                viewBox="0 0 680 680"
                className="h-auto w-full overflow-visible"
                role="img"
                aria-label="動感大型軌道太陽系星圖，顯示 8 顆立體銜接數學行星公轉與自轉"
              >
                <defs>
                  <radialGradient id="nebulaAura" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.16" />
                    <stop offset="55%" stopColor="#6366F1" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="sunCoreGrad" cx="40%" cy="38%" r="62%">
                    <stop offset="0%" stopColor="#FEF9C3" />
                    <stop offset="40%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#EA580C" />
                  </radialGradient>
                  <radialGradient id="sunCorona" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.52" />
                    <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </radialGradient>
                  {SECTORS.map((sec) => {
                    const meta = PLANET_META[sec.id];
                    return (
                      <g key={`defs-${sec.id}`}>
                        <radialGradient id={`planet-grad-${sec.id}`} cx="32%" cy="30%" r="72%">
                          <stop offset="0%" stopColor={meta.colorLight} />
                          <stop offset="52%" stopColor={meta.color} />
                          <stop offset="100%" stopColor={meta.colorDeep} />
                        </radialGradient>
                        <clipPath id={`planet-clip-${sec.id}`}>
                          <circle cx="0" cy="0" r={meta.planetRadius} />
                        </clipPath>
                      </g>
                    );
                  })}
                </defs>

                {/* Deep Nebula Backdrop */}
                <circle cx="340" cy="340" r="325" fill="url(#nebulaAura)" />

                {/* Subtle Asteroid Belt Dots */}
                <g opacity="0.45">
                  {ASTEROID_BELT.map((ast, idx) => (
                    <circle key={idx} cx={ast.x} cy={ast.y} r={ast.r} fill="#94A3B8" />
                  ))}
                </g>

                {/* Dual Shooting Comets */}
                <g className="animate-comet-glide" style={{ opacity: 0.78 }}>
                  <line x1="78" y1="150" x2="124" y2="118" stroke="#7DD3FC" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.55" />
                  <circle cx="124" cy="118" r="3" fill="#E0F2FE" />
                </g>
                <g className="animate-comet-glide" style={{ animationDelay: '-3.4s', opacity: 0.65 }}>
                  <line x1="480" y1="540" x2="520" y2="512" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.5" />
                  <circle cx="520" cy="512" r="2.6" fill="#FEF9C3" />
                </g>

                {/* Concentric Orbit Rings */}
                {SECTORS.map((sec) => {
                  const meta = PLANET_META[sec.id];
                  const isHov = hoveredSector === sec.id;
                  return (
                    <circle
                      key={`orbit-${sec.id}`}
                      cx="340"
                      cy="340"
                      r={meta.orbitRadius}
                      fill="none"
                      stroke={isHov ? meta.glowColor : '#38BDF8'}
                      strokeOpacity={isHov ? 0.85 : 0.18}
                      strokeWidth={isHov ? 2.2 : 1.1}
                      strokeDasharray={isHov ? 'none' : '5 6'}
                    />
                  );
                })}

                {/* Central Sun Core */}
                <g transform="translate(340, 340)">
                  <circle cx="0" cy="0" r="64" fill="url(#sunCorona)" className="animate-solar-pulse" />
                  <circle
                    cx="0"
                    cy="0"
                    r="44"
                    fill="none"
                    stroke="#FDE68A"
                    strokeOpacity="0.35"
                    strokeWidth="1.5"
                    strokeDasharray="6 8"
                    className="animate-cloud-drift"
                  />
                  <circle cx="0" cy="0" r="34" fill="url(#sunCoreGrad)" stroke="#FEF08A" strokeWidth="2" />
                  <text x="0" y="-2" textAnchor="middle" fill="#451A03" fontSize="13" fontWeight="800">
                    數學
                  </text>
                  <text x="0" y="13" textAnchor="middle" fill="#451A03" fontSize="11" fontWeight="700">
                    太陽核心
                  </text>
                </g>

                {/* 8 Large Orbiting & Rotating Planets */}
                {SECTORS.map((sec) => {
                  const meta = PLANET_META[sec.id];
                  const starStats = getSectorStarStats(sec, profile.sectors[sec.id]);
                  const isHov = hoveredSector === sec.id;

                  return (
                    <g
                      key={sec.id}
                      className="animate-orbit-spin"
                      style={{
                        transformOrigin: '340px 340px',
                        animationDuration: `${meta.orbitDuration}s`,
                        animationDelay: `${-((meta.startAngle / 360) * meta.orbitDuration)}s`,
                        animationPlayState: effectivePaused ? 'paused' : 'running',
                      }}
                    >
                      <g
                        transform={`translate(${340 + meta.orbitRadius}, 340)`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredSector(sec.id)}
                        onMouseLeave={() => setHoveredSector((cur) => (cur === sec.id ? null : cur))}
                        onClick={() => onSelectSector(sec.id)}
                      >
                        <g
                          className="animate-counter-orbit-spin"
                          style={{
                            transformOrigin: '0px 0px',
                            animationDuration: `${meta.orbitDuration}s`,
                            animationDelay: `${-((meta.startAngle / 360) * meta.orbitDuration)}s`,
                            animationPlayState: effectivePaused ? 'paused' : 'running',
                          }}
                        >
                          {/* Atmosphere Halo & Hover/Cleared Beacon */}
                          <circle
                            cx="0"
                            cy="0"
                            r={meta.planetRadius + 7}
                            fill={meta.glowColor}
                            fillOpacity={isHov ? 0.24 : 0.1}
                          />
                          {(isHov || starStats.allDone) && (
                            <circle
                              cx="0"
                              cy="0"
                              r={meta.planetRadius + 9}
                              fill="none"
                              stroke={starStats.allDone ? '#34D399' : '#FFFFFF'}
                              strokeWidth={isHov ? 2.2 : 1.4}
                              strokeOpacity={0.9}
                            />
                          )}

                          {/* Tilted Double Planetary Ring (Back Arc) */}
                          {meta.hasRing && (
                            <ellipse
                              cx="0"
                              cy="0"
                              rx={meta.planetRadius + 13}
                              ry={6.5}
                              transform="rotate(-22)"
                              fill="none"
                              stroke={meta.glowColor}
                              strokeOpacity="0.78"
                              strokeWidth="3"
                            />
                          )}

                          {/* 3D-Shaded Large Planet Body */}
                          <circle
                            cx="0"
                            cy="0"
                            r={meta.planetRadius}
                            fill={`url(#planet-grad-${sec.id})`}
                            stroke={isHov ? '#FFFFFF' : meta.glowColor}
                            strokeWidth={isHov ? 2.2 : 1}
                          />

                          {/* Axial Rotating Surface Clouds & Craters */}
                          <g clipPath={`url(#planet-clip-${sec.id})`}>
                            <g className="animate-planet-axial">
                              <ellipse
                                cx="-6"
                                cy="-6"
                                rx={meta.planetRadius * 0.85}
                                ry="3.8"
                                fill={meta.bandColor}
                                fillOpacity="0.48"
                              />
                              <ellipse
                                cx="4"
                                cy="3"
                                rx={meta.planetRadius * 0.72}
                                ry="3.2"
                                fill={meta.bandColor}
                                fillOpacity="0.32"
                              />
                              <circle
                                cx="-5"
                                cy="8"
                                r="3.2"
                                fill={meta.colorDeep}
                                fillOpacity="0.42"
                              />
                              <circle
                                cx="8"
                                cy="-4"
                                r="2.4"
                                fill={meta.colorDeep}
                                fillOpacity="0.35"
                              />
                            </g>
                          </g>

                          {/* Orbiting Mini Moon Satellite */}
                          {meta.hasMoon && (
                            <g
                              className="animate-orbit-spin"
                              style={{
                                transformOrigin: '0px 0px',
                                animationDuration: '6s',
                                animationPlayState: effectivePaused ? 'paused' : 'running',
                              }}
                            >
                              <circle
                                cx={meta.planetRadius + 9}
                                cy="0"
                                r="4"
                                fill="#F8FAFC"
                                stroke={meta.glowColor}
                                strokeWidth="1"
                              />
                            </g>
                          )}

                          {/* Upright Planet Badge */}
                          <g transform={`translate(0, ${-meta.planetRadius - 17})`}>
                            <rect
                              x="-42"
                              y="-11"
                              width="84"
                              height="21"
                              rx="10.5"
                              fill="#070D1D"
                              fillOpacity={isHov ? 0.98 : 0.88}
                              stroke={isHov ? '#FFFFFF' : meta.glowColor}
                              strokeOpacity={isHov ? 1 : 0.7}
                              strokeWidth={isHov ? 1.6 : 1}
                            />
                            <text
                              x="0"
                              y="3"
                              textAnchor="middle"
                              fill="#F8FAFC"
                              fontSize="10.5"
                              fontWeight="700"
                            >
                              {sec.code.replace('SEC-', '')} {sec.domainLabel}
                              {starStats.allDone ? ' ★' : ''}
                            </text>
                          </g>
                        </g>
                      </g>
                    </g>
                  );
                })}
              </svg>

              <p className="mt-1 text-center text-xs text-slate-400">
                懸停於任一行星或右側星球列表即可暫停公轉，點擊大行星立即展開冒險！
              </p>
            </div>
          ) : (
            /* Bright Planet Mode: Large 70% Stage with Dynamic Cloud-Sea Halos, Orbiting Airships & Island Beacons */
            <div className="relative w-full max-w-[700px] select-none rounded-3xl border border-sky-200/80 bg-white/55 p-4 shadow-lg backdrop-blur-md">
              <div className="mb-1 flex items-center justify-between px-2 text-xs">
                <span className="font-mono font-semibold text-sky-800">
                  明亮數學星球 · 雲海光環自動巡航（可拖曳旋轉）
                </span>
                <button
                  type="button"
                  onClick={() => setIsMotionPaused((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-sky-400"
                >
                  {isMotionPaused ? (
                    <>
                      <Play className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      <span>繼續巡航</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                      <span>暫停巡航</span>
                    </>
                  )}
                </button>
              </div>

              <svg
                viewBox="0 0 620 620"
                className="h-auto w-full cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                role="img"
                aria-label="動態雲海光環與飛艇巡航的小六升國一明亮數學星球"
              >
                <defs>
                  <radialGradient id="planetOceanLight" cx="36%" cy="32%" r="72%">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="52%" stopColor="#1D64A8" />
                    <stop offset="100%" stopColor="#0C2F57" />
                  </radialGradient>
                  <radialGradient id="cloudHaloGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.65" />
                    <stop offset="88%" stopColor="#BAE6FD" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                  </radialGradient>
                  <clipPath id="globeClip">
                    <circle cx={cx} cy={cy} r={R} />
                  </clipPath>
                </defs>

                {/* Outer Atmosphere Halo */}
                <circle cx={cx} cy={cy} r={R + 58} fill="url(#cloudHaloGlow)" />

                {/* Dynamic Rotating Cloud-Sea Halo Ring 1 */}
                <g
                  className="animate-cloud-drift"
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    animationPlayState: effectivePaused ? 'paused' : 'running',
                  }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={R + 30}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeOpacity="0.6"
                    strokeWidth="2.5"
                    strokeDasharray="24 18 10 22"
                  />
                  {/* Sculpted Cloud Wisps */}
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <g key={deg} transform={`rotate(${deg} ${cx} ${cy})`}>
                      <ellipse cx={cx} cy={cy - R - 28} rx="30" ry="10" fill="#FFFFFF" fillOpacity="0.82" />
                      <ellipse cx={cx - 16} cy={cy - R - 24} rx="16" ry="8" fill="#FFFFFF" fillOpacity="0.72" />
                      <ellipse cx={cx + 18} cy={cy - R - 25} rx="18" ry="8.5" fill="#E0F2FE" fillOpacity="0.75" />
                    </g>
                  ))}
                </g>

                {/* Dynamic Counter-Rotating Cloud Ring 2 */}
                <g
                  className="animate-cloud-drift-reverse"
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    animationPlayState: effectivePaused ? 'paused' : 'running',
                  }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={R + 50}
                    fill="none"
                    stroke="#7DD3FC"
                    strokeOpacity="0.45"
                    strokeWidth="1.5"
                    strokeDasharray="12 16"
                  />
                  {[35, 155, 275].map((deg) => (
                    <g key={deg} transform={`rotate(${deg} ${cx} ${cy})`}>
                      <ellipse cx={cx} cy={cy - R - 48} rx="22" ry="7.5" fill="#FFFFFF" fillOpacity="0.65" />
                    </g>
                  ))}
                </g>

                {/* Orbiting Airships & Hot Air Balloons */}
                {/* Airship Orbit */}
                <g
                  className="animate-orbit-spin"
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    animationDuration: '32s',
                    animationPlayState: effectivePaused ? 'paused' : 'running',
                  }}
                >
                  <g transform={`translate(${cx + R + 42}, ${cy})`}>
                    <g
                      className="animate-counter-orbit-spin"
                      style={{
                        transformOrigin: '0px 0px',
                        animationDuration: '32s',
                        animationPlayState: effectivePaused ? 'paused' : 'running',
                      }}
                    >
                      {/* Sleek Sky Airship */}
                      <ellipse cx="0" cy="-6" rx="22" ry="11" fill="#F97316" stroke="#FFFFFF" strokeWidth="1.5" />
                      <path d="M -18,-6 Q 0,-12 18,-6" fill="none" stroke="#FEF3C7" strokeWidth="2.5" />
                      <rect x="-8" y="6" width="16" height="6" rx="2" fill="#78350F" />
                    </g>
                  </g>
                </g>

                {/* Purple Hot Air Balloon Orbit */}
                <g
                  className="animate-orbit-spin"
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    animationDuration: '44s',
                    animationDelay: '-14s',
                    animationPlayState: effectivePaused ? 'paused' : 'running',
                  }}
                >
                  <g transform={`translate(${cx + R + 34}, ${cy})`}>
                    <g
                      className="animate-counter-orbit-spin"
                      style={{
                        transformOrigin: '0px 0px',
                        animationDuration: '44s',
                        animationDelay: '-14s',
                        animationPlayState: effectivePaused ? 'paused' : 'running',
                      }}
                    >
                      <ellipse cx="0" cy="0" rx="14" ry="18" fill="#C084FC" stroke="#581C87" strokeWidth="1.2" />
                      <path d="M -4,-17 Q 0,0 -3,17 M 4,-17 Q 0,0 3,17" fill="none" stroke="#F5D0FE" strokeWidth="2.5" />
                      <rect x="-4" y="22" width="8" height="5.5" rx="1.2" fill="#78350F" />
                    </g>
                  </g>
                </g>

                {/* Teal Plane Orbit */}
                <g
                  className="animate-orbit-spin"
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    animationDuration: '26s',
                    animationDelay: '-8s',
                    animationPlayState: effectivePaused ? 'paused' : 'running',
                  }}
                >
                  <g transform={`translate(${cx}, ${cy + R + 38})`}>
                    <path d="M-36,4 Q-14,2 0,0" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2" strokeDasharray="3,3" fill="none" />
                    <polygon points="4,0 -14,-6 -10,0 -14,6" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.4" />
                  </g>
                </g>

                {/* Bright Ocean Globe */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={R}
                  fill="url(#planetOceanLight)"
                  stroke="#FFFFFF"
                  strokeOpacity={0.7}
                  strokeWidth="2.5"
                />

                <g clipPath="url(#globeClip)">
                  {graticulePaths.map((d, idx) => (
                    <path
                      key={idx}
                      d={d}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeOpacity={0.2}
                      strokeWidth="1"
                    />
                  ))}

                  {projectedIslands.map(({ sec, geo, x, y, z, starStats }) => {
                    const px = cx + x;
                    const py = cy + y;
                    const scale = 0.65 + Math.max(0, z) * 0.58;
                    const opacity = z < 0 ? 0.38 : 0.72 + z * 0.28;
                    const isHov = hoveredSector === sec.id;

                    return (
                      <g
                        key={sec.id}
                        transform={`translate(${px}, ${py}) scale(${scale})`}
                        style={{ opacity }}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!dragRef.current.moved) {
                            onSelectSector(sec.id);
                          }
                        }}
                        onMouseEnter={() => setHoveredSector(sec.id)}
                        onMouseLeave={() => setHoveredSector(null)}
                      >
                        {/* Pulsing Island Beacon Halo */}
                        <ellipse
                          cx="0"
                          cy="0"
                          rx="38"
                          ry="26"
                          fill="none"
                          stroke={isHov ? '#FFFFFF' : geo.shoreFill}
                          strokeWidth={isHov ? 2.5 : 1.5}
                          className="animate-island-beacon"
                        />
                        <ellipse cx="0" cy="0" rx="34" ry="23" fill={geo.shoreFill} fillOpacity="0.4" />
                        <ellipse cx="0" cy="0" rx="26" ry="18" fill={geo.shoreFill} />
                        <path
                          d="M -20,-4 Q -10,-16 8,-12 Q 22,-8 20,5 Q 14,15 -4,14 Q -22,12 -20,-4 Z"
                          fill={geo.landFill}
                          stroke={isHov ? '#FFFFFF' : 'rgba(15,23,42,0.35)'}
                          strokeWidth={isHov ? 2.6 : 1}
                        />
                        <polygon points="-7,4 0,-9 7,4" fill="#475569" />
                        <circle cx="10" cy="-3" r="3.2" fill="#15803D" />
                        <circle cx="-11" cy="-2" r="2.6" fill="#16A34A" />

                        {z > 0.1 && (
                          <g transform="translate(0, -30)">
                            <rect
                              x="-52"
                              y="-15"
                              width="104"
                              height="24"
                              rx="12"
                              fill="#FFFFFF"
                              stroke={geo.color}
                              strokeWidth={isHov ? 2.5 : 1.5}
                            />
                            <polygon points="-5,9 5,9 0,15" fill="#FFFFFF" />
                            <text
                              x="0"
                              y="1"
                              textAnchor="middle"
                              fill="#0F172A"
                              fontSize="11"
                              fontWeight="700"
                            >
                              {sec.shortTitle}
                              {starStats.allDone ? ' ★' : ''}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>

              <p className="mt-1 text-center text-xs text-slate-600">
                雲海光環與飛艇持續巡航中！按住拖曳可手動轉動星球，點擊島嶼座標即刻出發
              </p>
            </div>
          )}
        </div>

        {/* Right ~30% Streamlined Control Rail (col-span-4) */}
        <div className="space-y-4 lg:col-span-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 xl:text-3xl dark:text-white">
              {isDark ? '星際數學太陽系' : '明亮數學學習星球'}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 md:text-sm dark:text-slate-300">
              八大升國中銜接主題，點選星球完成簡報、熱身、微關卡與創意對戰！
            </p>
          </div>

          {/* Compact 2x2 Progress Telemetry */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Star className="h-3 w-3 text-amber-500" aria-hidden="true" />
                <span>課程星星</span>
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                {stats.stars} <span className="text-xs font-normal text-slate-500">/ {totalSystemStars}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Flag className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                <span>星球金旗</span>
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                {stats.flags} <span className="text-xs font-normal text-slate-500">/ 8</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Trophy className="h-3 w-3 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
                <span>探索積分</span>
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                {profile.totalScore}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenWrongModal}
              className="rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:shadow-none dark:hover:bg-rose-500/20"
            >
              <div className="flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-300">
                <BookMarked className="h-3 w-3" aria-hidden="true" />
                <span>錯題待複習</span>
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-rose-800 tabular-nums dark:text-rose-200">
                {wrongCount} <span className="text-xs font-normal">題</span>
              </div>
            </button>
          </div>

          {/* Streamlined Single-Column 8-Planet Quick List */}
          <div className="space-y-2">
            {SECTORS.map((sec) => {
              const geo = PLANET_META[sec.id];
              const starStats = getSectorStarStats(sec, profile.sectors[sec.id]);
              const isHov = hoveredSector === sec.id;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onMouseEnter={() => focusIslandOnMap(sec.id)}
                  onMouseLeave={() => setHoveredSector(null)}
                  onFocus={() => focusIslandOnMap(sec.id)}
                  onBlur={() => setHoveredSector(null)}
                  onClick={() => onSelectSector(sec.id)}
                  className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                    isHov
                      ? 'border-sky-500 bg-white shadow-md dark:border-cyan-400 dark:bg-[#111C33] dark:shadow-none'
                      : 'border-slate-200/90 bg-white/90 shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: geo.color,
                        boxShadow: isDark ? `0 0 8px ${geo.glowColor}` : 'none',
                      }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {sec.shortTitle}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-amber-600 tabular-nums dark:text-amber-300">
                      ★{starStats.earned}/{starStats.total}
                    </span>
                  </div>

                  <span
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold whitespace-nowrap transition-transform group-hover:translate-x-0.5"
                    style={{ color: isDark ? '#7DD3FC' : geo.color }}
                  >
                    <span>出發</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
