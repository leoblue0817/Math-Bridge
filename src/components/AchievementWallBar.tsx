import { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Compass, Lock, X } from 'lucide-react';
import {
  SPACE_ACHIEVEMENT_BADGES,
  SpaceAchievementBadge,
  getAchievementSummary,
} from '../data/achievements';
import { ProfileRecord, ThemeMode, isDarkTheme } from '../types';
import { SpaceBadgeIcon } from './SpaceBadgeIcon';

interface AchievementWallBarProps {
  profile: ProfileRecord;
  theme: ThemeMode;
  variant?: 'banner' | 'corner';
  noBlur?: boolean;
}

export function AchievementWallBar({
  profile,
  theme,
  variant = 'banner',
  noBlur = false,
}: AchievementWallBarProps) {
  const [selectedBadge, setSelectedBadge] = useState<SpaceAchievementBadge | null>(null);
  const [cornerExpanded, setCornerExpanded] = useState(false);
  const isDark = isDarkTheme(theme);

  const achievementBadges = profile.achievementBadges ?? [];
  const unlockedSet = useMemo(() => new Set(achievementBadges), [achievementBadges]);

  const summary = useMemo(
    () => getAchievementSummary(profile.totalScore, achievementBadges),
    [profile.totalScore, achievementBadges]
  );

  useEffect(() => {
    if (!selectedBadge) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBadge(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBadge]);

  return (
    <>
      {variant === 'corner' ? (
        !cornerExpanded ? (
          <button
            type="button"
            onClick={() => setCornerExpanded(true)}
            aria-expanded="false"
            aria-label="展開探索者成就與勳章面板"
            className={`${
              noBlur ? 'webgl-hud-surface' : 'glass-hud-corner'
            } inline-flex min-h-[38px] max-w-full items-center gap-2 rounded-2xl px-3 py-1.5 text-left shadow-md transition-colors hover:border-sky-400/60 dark:hover:border-cyan-400/50`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-slate-950 shadow-sm">
              <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </span>
            <span className="truncate text-xs font-extrabold tracking-tight text-slate-900 dark:text-white">
              {profile.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] font-bold text-sky-700 tabular-nums dark:text-cyan-300">
              {profile.totalScore} XP
            </span>
            <span className="hidden shrink-0 font-mono text-[11px] font-semibold text-slate-500 tabular-nums sm:inline dark:text-slate-300">
              · 勳章 {summary.unlockedCount}/{summary.totalCount}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-300" aria-hidden="true" />
          </button>
        ) : (
          <section
            aria-label="艦長檔案與成就獎章牆"
            className={`${
              noBlur ? 'webgl-hud-surface' : 'glass-hud-corner'
            } w-[290px] max-w-[calc(100vw-1.25rem)] rounded-2xl p-3 shadow-2xl sm:w-[325px] sm:rounded-3xl sm:p-3.5`}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCornerExpanded(false)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-2.5"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.45)] sm:h-8 sm:w-8 sm:rounded-xl">
                  <Award className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h2 className="truncate text-xs font-extrabold tracking-tight text-slate-900 sm:text-sm dark:text-white">
                      {profile.name}
                    </h2>
                    <span className="shrink-0 text-[11px] font-bold text-sky-700 dark:text-cyan-300">
                      · {summary.currentRankLabel}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] font-semibold text-slate-600 tabular-nums sm:text-[11px] dark:text-slate-300">
                    勳章 {summary.unlockedCount}/{summary.totalCount}
                  </div>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1.5">
                <div className="text-right">
                  <div className="font-mono text-xs font-black text-sky-700 tabular-nums sm:text-sm dark:text-cyan-300">
                    {profile.totalScore}
                  </div>
                  <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase sm:text-[10px] dark:text-slate-400">
                    XP 積分
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCornerExpanded(false)}
                  aria-expanded="true"
                  aria-label="收合探索者勳章牆"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/5 text-slate-700 hover:bg-sky-500/15 dark:bg-white/10 dark:text-slate-200"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Esports Metallic High-Gloss Progress Bar */}
            <div className="mt-2.5 sm:mt-3">
              <div
                className="esports-progress-track relative h-2.5 w-full overflow-hidden rounded-full p-[2px]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={summary.tierProgressPct}
                aria-label="距離下一枚太空徽章積分進度"
              >
                <div
                  className="esports-progress-fill h-full rounded-full transition-[width] duration-500 ease-out"
                  style={
                    {
                      width: `${Math.max(5, summary.tierProgressPct)}%`,
                      '--bar-from': summary.nextBadge ? summary.nextBadge.accentHex : '#10B981',
                      '--bar-mid': isDark ? '#38BDF8' : '#0EA5E9',
                      '--bar-to': '#FDE047',
                      '--bar-glow': summary.nextBadge
                        ? `${summary.nextBadge.accentHex}99`
                        : 'rgba(251,191,36,0.75)',
                    } as React.CSSProperties
                  }
                />
                <div className="pointer-events-none absolute inset-0 flex justify-evenly">
                  <span className="h-full w-px bg-white/30 dark:bg-slate-950/50" />
                  <span className="h-full w-px bg-white/30 dark:bg-slate-950/50" />
                  <span className="h-full w-px bg-white/30 dark:bg-slate-950/50" />
                </div>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-600 tabular-nums dark:text-slate-300">
                <span>
                  {summary.nextBadge
                    ? `下一階：${summary.nextBadge.shortTitle}`
                    : '銀河傳說全制霸'}
                </span>
                <span className="font-mono">
                  {summary.nextBadge ? `差 ${summary.remainingPoints} 分` : 'MAX'}
                </span>
              </div>
            </div>

            {/* 5-Tier Space Medallions Row */}
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {SPACE_ACHIEVEMENT_BADGES.map((badge) => {
                const unlocked = unlockedSet.has(badge.id);

                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setSelectedBadge(badge)}
                    aria-label={`${badge.title}（${badge.threshold} 分門檻，${
                      unlocked ? '已解鎖' : '未解鎖'
                    }），點擊查看詳情`}
                    style={
                      unlocked
                        ? {
                            boxShadow: isDark
                              ? `0 3px 0 rgba(2,6,23,0.75), 0 0 14px -4px ${badge.accentHex}88`
                              : `0 3px 0 ${badge.accentHex}33, 0 8px 16px -8px ${badge.accentHex}66`,
                          }
                        : undefined
                    }
                    className={`iso-node-card flex flex-col items-center justify-center gap-0.5 rounded-2xl border px-1 py-1.5 text-center focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none dark:focus-visible:ring-cyan-400 ${
                      unlocked
                        ? isDark
                          ? `${badge.darkBorderActive} bg-slate-900/75`
                          : `${badge.lightBorderActive} bg-white/85`
                        : 'border-slate-200/70 bg-white/40 opacity-70 hover:opacity-100 dark:border-slate-700/60 dark:bg-slate-900/45'
                    }`}
                  >
                    <SpaceBadgeIcon badge={badge} unlocked={unlocked} size="sm" isDark={isDark} />
                    <span
                      className={`w-full truncate text-[10px] font-extrabold ${
                        unlocked
                          ? isDark
                            ? badge.darkAccentText
                            : badge.lightAccentText
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {badge.threshold}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-200/60 pt-2 text-[10px] font-semibold text-slate-600 dark:border-slate-700/60 dark:text-slate-300">
              <Compass className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-cyan-300" aria-hidden="true" />
              <span>拖曳 360° 環視宇宙 · 縮放視角 · 點擊星球飛近登陸</span>
            </div>
          </section>
        )
      ) : (
        <section
          aria-label="成就獎章牆"
          className="glass-hud-panel mb-5 rounded-3xl px-5 py-3.5"
        >
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Rank Title & Esports Metallic XP Progress Bar */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-slate-950 shadow-[0_3px_10px_rgba(245,158,11,0.45)]">
                    <Award className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                    成就獎章牆
                  </h2>
                </div>

                <span className="text-xs text-slate-400 dark:text-slate-500" aria-hidden="true">
                  ·
                </span>

                <span className="text-xs font-bold text-sky-800 dark:text-cyan-300">
                  艦長稱號：{summary.currentRankLabel}
                </span>

                <span className="text-xs text-slate-400 dark:text-slate-500" aria-hidden="true">
                  ·
                </span>

                <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                  已解鎖 {summary.unlockedCount} / {summary.totalCount} 枚勳章
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-3.5">
                {/* Esports Metallic High-Gloss Progress Bar */}
                <div
                  className="esports-progress-track relative h-3 flex-1 overflow-hidden rounded-full p-[2px]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={summary.tierProgressPct}
                  aria-label="距離下一枚太空徽章積分進度"
                >
                  <div
                    className="esports-progress-fill h-full rounded-full transition-[width] duration-500 ease-out"
                    style={
                      {
                        width: `${Math.max(4, summary.tierProgressPct)}%`,
                        '--bar-from': summary.nextBadge ? summary.nextBadge.accentHex : '#10B981',
                        '--bar-mid': isDark ? '#38BDF8' : '#0EA5E9',
                        '--bar-to': '#FDE047',
                        '--bar-glow': summary.nextBadge
                          ? `${summary.nextBadge.accentHex}99`
                          : 'rgba(251,191,36,0.75)',
                      } as React.CSSProperties
                    }
                  />
                  {/* Segmented Esports Gauge Ticks */}
                  <div className="pointer-events-none absolute inset-0 flex justify-evenly">
                    <span className="h-full w-px bg-white/30 dark:bg-slate-950/50" />
                    <span className="h-full w-px bg-white/30 dark:bg-slate-950/50" />
                    <span className="h-full w-px bg-white/30 dark:bg-slate-950/50" />
                  </div>
                </div>

                <span className="shrink-0 font-mono text-xs font-bold text-slate-800 tabular-nums dark:text-cyan-200">
                  {summary.nextBadge
                    ? `${profile.totalScore} XP · 距「${summary.nextBadge.shortTitle}」差 ${summary.remainingPoints}`
                    : `${profile.totalScore} XP · 銀河傳說全制霸`}
                </span>
              </div>
            </div>

            {/* Right: 5-Tier Floating 3D Emblem Medallions */}
            <div className="grid grid-cols-5 gap-2 sm:flex sm:shrink-0 sm:items-center sm:gap-2.5">
              {SPACE_ACHIEVEMENT_BADGES.map((badge) => {
                const unlocked = unlockedSet.has(badge.id);

                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setSelectedBadge(badge)}
                    aria-label={`${badge.title}（${badge.threshold} 分門檻，${
                      unlocked ? '已解鎖' : '未解鎖'
                    }），點擊查看詳情`}
                    style={
                      unlocked
                        ? {
                            boxShadow: isDark
                              ? `0 4px 0 rgba(2,6,23,0.75), 0 0 18px -4px ${badge.accentHex}88`
                              : `0 4px 0 ${badge.accentHex}33, 0 10px 20px -10px ${badge.accentHex}66`,
                          }
                        : undefined
                    }
                    className={`iso-node-card group flex flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-center focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none sm:min-w-[88px] sm:flex-row sm:gap-2 sm:px-2.5 sm:text-left dark:focus-visible:ring-cyan-400 ${
                      unlocked
                        ? isDark
                          ? `${badge.darkBorderActive} bg-slate-900/75 backdrop-blur-md`
                          : `${badge.lightBorderActive} bg-white/85 backdrop-blur-md`
                        : 'border-slate-200/70 bg-white/45 opacity-75 backdrop-blur-sm hover:opacity-100 dark:border-slate-700/60 dark:bg-slate-900/45'
                    }`}
                  >
                    <SpaceBadgeIcon badge={badge} unlocked={unlocked} size="sm" isDark={isDark} />

                    <div className="min-w-0">
                      <div
                        className={`truncate text-[11px] font-extrabold ${
                          unlocked
                            ? isDark
                              ? badge.darkAccentText
                              : badge.lightAccentText
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {badge.shortTitle}
                      </div>
                      <div className="flex items-center justify-center gap-1 font-mono text-[10px] font-semibold text-slate-600 tabular-nums sm:justify-start dark:text-slate-300">
                        <span>{badge.threshold}分</span>
                        {unlocked && (
                          <CheckCircle2
                            className={`h-2.5 w-2.5 shrink-0 ${
                              isDark ? badge.darkAccentText : badge.lightAccentText
                            }`}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Space Badge Detail Modal */}
      {selectedBadge && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-detail-title"
          onClick={() => setSelectedBadge(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="pb-safe max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:rounded-2xl sm:p-6 dark:border-slate-700 dark:bg-[#0D1424] dark:text-slate-100"
          >
            {(() => {
              const isUnlocked = unlockedSet.has(selectedBadge.id);
              const diff = Math.max(0, selectedBadge.threshold - profile.totalScore);
              const pct = Math.min(100, Math.round((profile.totalScore / selectedBadge.threshold) * 100));

              return (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>第 {selectedBadge.tier} 階太空勳章</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {selectedBadge.threshold} 分門檻
                        </span>
                      </div>
                      <h3
                        id="badge-detail-title"
                        className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white"
                      >
                        {selectedBadge.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedBadge(null)}
                      aria-label="關閉徽章詳情"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:h-8 sm:w-8 sm:rounded-lg dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-5 flex items-center gap-4">
                    <div
                      className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border ${
                        isUnlocked
                          ? isDark
                            ? `${selectedBadge.darkBorderActive} ${selectedBadge.darkBgActive}`
                            : `${selectedBadge.lightBorderActive} ${selectedBadge.lightBgActive}`
                          : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <SpaceBadgeIcon
                        badge={selectedBadge}
                        unlocked={isUnlocked}
                        size="lg"
                        isDark={isDark}
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        {isUnlocked ? (
                          <>
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 ${
                                isDark ? selectedBadge.darkAccentText : selectedBadge.lightAccentText
                              }`}
                              aria-hidden="true"
                            />
                            <span
                              className={
                                isDark ? selectedBadge.darkAccentText : selectedBadge.lightAccentText
                              }
                            >
                              已獲得此太空徽章
                            </span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                            <span className="text-slate-600 dark:text-slate-300">尚未解鎖</span>
                          </>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        軍階稱號：{selectedBadge.rankLabel}
                      </div>

                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {selectedBadge.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#080D1A]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300">達成條件進度</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums dark:text-white">
                        {profile.totalScore} / {selectedBadge.threshold} 分
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: selectedBadge.accentHex,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {isUnlocked
                        ? '已永久收錄至你的「achievementBadges」星際檔案紀錄中。'
                        : `再累積 ${diff} 分（完成簡報、熱身、微關卡、錯題訂正或創意對戰皆可獲得積分）即可自動解鎖！`}
                    </p>
                  </div>

                  {/* Quick Switch Across All 5 Badges */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3.5 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      {SPACE_ACHIEVEMENT_BADGES.map((b) => {
                        const active = b.id === selectedBadge.id;
                        const has = unlockedSet.has(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBadge(b)}
                            className={`rounded-lg px-2 py-1 font-mono text-[11px] font-semibold tabular-nums transition-colors ${
                              active
                                ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                                : has
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                                  : 'text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800'
                            }`}
                          >
                            {b.threshold}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedBadge(null)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <span>返回星圖</span>
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
