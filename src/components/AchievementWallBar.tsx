import { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, ChevronRight, Lock, X } from 'lucide-react';
import {
  SPACE_ACHIEVEMENT_BADGES,
  SpaceAchievementBadge,
  getAchievementSummary,
} from '../data/achievements';
import { ProfileRecord, ThemeMode } from '../types';
import { SpaceBadgeIcon } from './SpaceBadgeIcon';

interface AchievementWallBarProps {
  profile: ProfileRecord;
  theme: ThemeMode;
}

export function AchievementWallBar({ profile, theme }: AchievementWallBarProps) {
  const [selectedBadge, setSelectedBadge] = useState<SpaceAchievementBadge | null>(null);
  const isDark = theme === 'dark';

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
      <section
        aria-label="成就獎章牆"
        className="mb-5 rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-[#0D1424]/92 dark:shadow-none"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Title, Current Rank & Next Threshold Progress */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <div className="flex items-center gap-2">
                <Award
                  className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                  成就獎章牆
                </h2>
              </div>

              <span className="text-xs text-slate-400 dark:text-slate-600" aria-hidden="true">
                ·
              </span>

              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                目前稱號：{summary.currentRankLabel}
              </span>

              <span className="text-xs text-slate-400 dark:text-slate-600" aria-hidden="true">
                ·
              </span>

              <span className="font-mono text-xs text-slate-600 tabular-nums dark:text-slate-300">
                已解鎖 {summary.unlockedCount} / {summary.totalCount} 枚
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={summary.tierProgressPct}
                aria-label="距離下一枚太空徽章積分進度"
              >
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${summary.tierProgressPct}%`,
                    backgroundColor: summary.nextBadge
                      ? summary.nextBadge.accentHex
                      : '#F43F5E',
                  }}
                />
              </div>

              <span className="shrink-0 font-mono text-[11px] text-slate-600 tabular-nums dark:text-slate-300">
                {summary.nextBadge
                  ? `總積分 ${profile.totalScore} · 距「${summary.nextBadge.shortTitle}」差 ${summary.remainingPoints} 分`
                  : `總積分 ${profile.totalScore} · 已解鎖全階段銀河榮譽`}
              </span>
            </div>
          </div>

          {/* Right: 5-Tier Compact Horizontal Space Badges */}
          <div className="grid grid-cols-5 gap-2 sm:flex sm:shrink-0 sm:items-center sm:gap-2">
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
                  className={`group flex flex-col items-center gap-1 rounded-xl border px-2 py-1.5 text-center transition-transform duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none sm:min-w-[82px] sm:flex-row sm:gap-2 sm:px-2.5 sm:text-left dark:focus-visible:ring-cyan-400 ${
                    unlocked
                      ? isDark
                        ? `${badge.darkBorderActive} ${badge.darkBgActive}`
                        : `${badge.lightBorderActive} ${badge.lightBgActive}`
                      : 'border-slate-200/90 bg-slate-50/75 opacity-80 hover:opacity-100 dark:border-slate-800 dark:bg-slate-900/60'
                  }`}
                >
                  <SpaceBadgeIcon badge={badge} unlocked={unlocked} size="sm" isDark={isDark} />

                  <div className="min-w-0">
                    <div
                      className={`truncate text-[11px] font-bold ${
                        unlocked
                          ? isDark
                            ? badge.darkAccentText
                            : badge.lightAccentText
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {badge.shortTitle}
                    </div>
                    <div className="flex items-center justify-center gap-1 font-mono text-[10px] text-slate-500 tabular-nums sm:justify-start dark:text-slate-400">
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

      {/* Space Badge Detail Modal */}
      {selectedBadge && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-detail-title"
          onClick={() => setSelectedBadge(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#0D1424] dark:text-slate-100"
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
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
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
