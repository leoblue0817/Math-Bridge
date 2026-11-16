export interface SpaceAchievementBadge {
  id: string;
  tier: number;
  threshold: number;
  title: string;
  shortTitle: string;
  rankLabel: string;
  description: string;
  accentHex: string;
  glowHex: string;
  darkAccentText: string;
  lightAccentText: string;
  darkBorderActive: string;
  lightBorderActive: string;
  darkBgActive: string;
  lightBgActive: string;
}

export const SPACE_ACHIEVEMENT_BADGES: SpaceAchievementBadge[] = [
  {
    id: 'badge_100',
    tier: 1,
    threshold: 100,
    title: '軌道見習星章',
    shortTitle: '軌道見習',
    rankLabel: '軌道見習探員',
    description: '累積積分達 100 分！成功完成初期數學星圖啟航任務，點亮第一枚軌道定位信標。',
    accentHex: '#06B6D4',
    glowHex: 'rgba(6, 182, 212, 0.35)',
    darkAccentText: 'text-cyan-300',
    lightAccentText: 'text-sky-700',
    darkBorderActive: 'border-cyan-400/60',
    lightBorderActive: 'border-sky-300',
    darkBgActive: 'bg-cyan-500/10',
    lightBgActive: 'bg-sky-50/90',
  },
  {
    id: 'badge_300',
    tier: 2,
    threshold: 300,
    title: '流星領航徽章',
    shortTitle: '流星領航',
    rankLabel: '流星領航員',
    description: '累積積分達 300 分！能熟練穿梭數線、倍數與分數航道，展現穩健的數學演算速度。',
    accentHex: '#10B981',
    glowHex: 'rgba(16, 185, 129, 0.35)',
    darkAccentText: 'text-emerald-300',
    lightAccentText: 'text-emerald-700',
    darkBorderActive: 'border-emerald-400/60',
    lightBorderActive: 'border-emerald-300',
    darkBgActive: 'bg-emerald-500/10',
    lightBgActive: 'bg-emerald-50/90',
  },
  {
    id: 'badge_500',
    tier: 3,
    threshold: 500,
    title: '星雲探索勳章',
    shortTitle: '星雲探索',
    rankLabel: '星雲探索官',
    description: '累積積分達 500 分！已成功橫越半數升國中核心單元，能在複雜幾何與代數題中找出規律。',
    accentHex: '#F59E0B',
    glowHex: 'rgba(245, 158, 11, 0.38)',
    darkAccentText: 'text-amber-300',
    lightAccentText: 'text-amber-700',
    darkBorderActive: 'border-amber-400/60',
    lightBorderActive: 'border-amber-300',
    darkBgActive: 'bg-amber-500/10',
    lightBgActive: 'bg-amber-50/90',
  },
  {
    id: 'badge_800',
    tier: 4,
    threshold: 800,
    title: '恆星指揮徽記',
    shortTitle: '恆星指揮',
    rankLabel: '恆星指揮官',
    description: '累積積分達 800 分！具備卓越的跨領域整合推論能力與創意對戰表現，是星艦核心主力。',
    accentHex: '#8B5CF6',
    glowHex: 'rgba(139, 92, 246, 0.38)',
    darkAccentText: 'text-violet-300',
    lightAccentText: 'text-violet-700',
    darkBorderActive: 'border-violet-400/60',
    lightBorderActive: 'border-violet-300',
    darkBgActive: 'bg-violet-500/10',
    lightBgActive: 'bg-violet-50/90',
  },
  {
    id: 'badge_1200',
    tier: 5,
    threshold: 1200,
    title: '銀河艦長皇冠章',
    shortTitle: '銀河艦長',
    rankLabel: '銀河星艦總指揮',
    description: '累積積分達 1200 分！全面制霸小六升國一數學八大主題星球，獲頒最高榮譽銀河艦長徽章。',
    accentHex: '#F43F5E',
    glowHex: 'rgba(244, 63, 94, 0.4)',
    darkAccentText: 'text-rose-300',
    lightAccentText: 'text-rose-700',
    darkBorderActive: 'border-rose-400/65',
    lightBorderActive: 'border-rose-300',
    darkBgActive: 'bg-rose-500/10',
    lightBgActive: 'bg-rose-50/90',
  },
];

export function reconcileAchievementBadges(
  totalScore: number,
  existingBadges: string[] = []
): {
  nextBadges: string[];
  newlyUnlocked: SpaceAchievementBadge[];
} {
  const existingSet = new Set(existingBadges);
  const newlyUnlocked: SpaceAchievementBadge[] = [];

  for (const badge of SPACE_ACHIEVEMENT_BADGES) {
    if (totalScore >= badge.threshold && !existingSet.has(badge.id)) {
      existingSet.add(badge.id);
      newlyUnlocked.push(badge);
    }
  }

  const orderedKnown = SPACE_ACHIEVEMENT_BADGES.filter((b) => existingSet.has(b.id)).map((b) => b.id);
  const knownIds = new Set(SPACE_ACHIEVEMENT_BADGES.map((b) => b.id));
  const extraIds = Array.from(existingSet).filter((id) => !knownIds.has(id));

  return {
    nextBadges: [...orderedKnown, ...extraIds],
    newlyUnlocked,
  };
}

export function getAchievementSummary(totalScore: number, achievementBadges: string[]) {
  const unlockedSet = new Set(achievementBadges);
  const unlockedBadges = SPACE_ACHIEVEMENT_BADGES.filter((b) => unlockedSet.has(b.id));
  const highestBadge = unlockedBadges[unlockedBadges.length - 1] ?? null;
  const nextBadge = SPACE_ACHIEVEMENT_BADGES.find((b) => !unlockedSet.has(b.id)) ?? null;

  const prevThreshold = highestBadge ? highestBadge.threshold : 0;
  const nextThreshold = nextBadge ? nextBadge.threshold : SPACE_ACHIEVEMENT_BADGES[SPACE_ACHIEVEMENT_BADGES.length - 1].threshold;
  const remainingPoints = nextBadge ? Math.max(0, nextBadge.threshold - totalScore) : 0;

  let tierProgressPct = 100;
  if (nextBadge) {
    const span = Math.max(1, nextThreshold - prevThreshold);
    const gainedInTier = Math.max(0, totalScore - prevThreshold);
    tierProgressPct = Math.min(100, Math.round((gainedInTier / span) * 100));
  }

  return {
    unlockedBadges,
    unlockedCount: unlockedBadges.length,
    totalCount: SPACE_ACHIEVEMENT_BADGES.length,
    highestBadge,
    nextBadge,
    remainingPoints,
    tierProgressPct,
    currentRankLabel: highestBadge?.rankLabel ?? '見習探索者',
  };
}
