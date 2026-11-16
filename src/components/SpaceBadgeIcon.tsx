import { Lock } from 'lucide-react';
import { SpaceAchievementBadge } from '../data/achievements';

interface SpaceBadgeIconProps {
  badge: SpaceAchievementBadge;
  unlocked: boolean;
  size?: 'sm' | 'lg';
  isDark?: boolean;
}

export function SpaceBadgeIcon({
  badge,
  unlocked,
  size = 'sm',
  isDark = true,
}: SpaceBadgeIconProps) {
  const dimClass = size === 'lg' ? 'h-20 w-20' : 'h-10 w-10';
  const strokeMain = unlocked
    ? badge.accentHex
    : isDark
      ? '#475569'
      : '#94A3B8';
  const fillSoft = unlocked
    ? badge.accentHex
    : isDark
      ? '#1E293B'
      : '#E2E8F0';

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center ${dimClass}`}
      style={{
        filter: unlocked && isDark ? `drop-shadow(0 0 8px ${badge.glowHex})` : undefined,
      }}
    >
      <svg
        viewBox="0 0 64 64"
        className="h-full w-full"
        aria-hidden="true"
      >
        {/* Outer Shield / Orbital Ring */}
        <circle
          cx="32"
          cy="32"
          r="27"
          fill={fillSoft}
          fillOpacity={unlocked ? (isDark ? 0.16 : 0.14) : 0.35}
          stroke={strokeMain}
          strokeWidth={unlocked ? 2.2 : 1.5}
          strokeDasharray={unlocked ? undefined : '4 3'}
        />

        {badge.tier === 1 && (
          <g>
            {/* Tier 1: Orbital Trainee Star & Tilted Orbit */}
            <ellipse
              cx="32"
              cy="32"
              rx="20"
              ry="8"
              transform="rotate(-24 32 32)"
              fill="none"
              stroke={strokeMain}
              strokeWidth="2"
              strokeOpacity={unlocked ? 0.9 : 0.6}
            />
            <polygon
              points="32,14 35.8,26.2 48,30 35.8,33.8 32,46 28.2,33.8 16,30 28.2,26.2"
              fill={unlocked ? strokeMain : 'none'}
              fillOpacity={unlocked ? 0.85 : 0}
              stroke={strokeMain}
              strokeWidth="1.8"
            />
            <circle cx="47" cy="22" r="2.6" fill={unlocked ? '#FDE68A' : strokeMain} />
          </g>
        )}

        {badge.tier === 2 && (
          <g>
            {/* Tier 2: Comet Navigator Delta Wing */}
            <path
              d="M17 44 Q24 27 45 18"
              fill="none"
              stroke={strokeMain}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="3 3"
            />
            <polygon
              points="46,16 36,41 31,32 22,27"
              fill={unlocked ? strokeMain : 'none'}
              fillOpacity={unlocked ? 0.82 : 0}
              stroke={strokeMain}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="46" cy="17" r="3" fill={unlocked ? '#FEF08A' : strokeMain} />
          </g>
        )}

        {badge.tier === 3 && (
          <g>
            {/* Tier 3: Nebula Explorer Astrolabe Compass */}
            <polygon
              points="32,12 46,18 52,32 46,46 32,52 18,46 12,32 18,18"
              fill="none"
              stroke={strokeMain}
              strokeWidth="1.8"
            />
            <polygon
              points="32,16 36.5,27.5 48,32 36.5,36.5 32,48 27.5,36.5 16,32 27.5,27.5"
              fill={unlocked ? strokeMain : 'none'}
              fillOpacity={unlocked ? 0.8 : 0}
              stroke={strokeMain}
              strokeWidth="1.8"
            />
            <circle cx="32" cy="32" r="4" fill={unlocked ? '#FEF3C7' : strokeMain} />
          </g>
        )}

        {badge.tier === 4 && (
          <g>
            {/* Tier 4: Stellar Commander Crest & Command Chevrons */}
            <circle
              cx="32"
              cy="32"
              r="18"
              fill="none"
              stroke={strokeMain}
              strokeWidth="1.6"
              strokeDasharray="6 3"
            />
            <path
              d="M21 38 L32 28 L43 38"
              fill="none"
              stroke={strokeMain}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M23 45 L32 37 L41 45"
              fill="none"
              stroke={strokeMain}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points="32,14 34.5,20.5 41.5,21 36,25 38,31.5 32,27.8 26,31.5 28,25 22.5,21 29.5,20.5"
              fill={unlocked ? strokeMain : 'none'}
              stroke={strokeMain}
              strokeWidth="1.6"
            />
          </g>
        )}

        {badge.tier === 5 && (
          <g>
            {/* Tier 5: Galactic Captain Crown Crest */}
            <path
              d="M17 42 A21 21 0 0 1 18 22 M47 42 A21 21 0 0 0 46 22"
              fill="none"
              stroke={strokeMain}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <polygon
              points="18,41 21,23 28,31 32,17 36,31 43,23 46,41"
              fill={unlocked ? strokeMain : 'none'}
              fillOpacity={unlocked ? 0.82 : 0}
              stroke={strokeMain}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <rect
              x="18"
              y="43"
              width="28"
              height="4.5"
              rx="2.2"
              fill={unlocked ? '#FDE68A' : strokeMain}
            />
            <circle cx="32" cy="14" r="2.6" fill={unlocked ? '#FEF08A' : strokeMain} />
          </g>
        )}
      </svg>

      {!unlocked && (
        <span
          className={`absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border ${
            size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
          } ${
            isDark
              ? 'border-slate-700 bg-slate-900 text-slate-400'
              : 'border-slate-300 bg-white text-slate-500'
          }`}
        >
          <Lock className={size === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5'} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
