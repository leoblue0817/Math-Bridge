import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import {
  SECTORS,
  getMergedSectors,
  getSectorStarStats,
  getSubLessonQuestions,
  getTotalSystemStars,
} from './data/sectors';
import {
  SPACE_ACHIEVEMENT_BADGES,
  SpaceAchievementBadge,
  reconcileAchievementBadges,
} from './data/achievements';
import {
  AppMode,
  CUSTOM_QUESTIONS_STORAGE_KEY,
  CustomQuestionRecord,
  HomeViewMode,
  LEGACY_STORAGE_KEY,
  MultiProfileStore,
  ProfileRecord,
  SECTOR_KEYS_SAFE,
  STORAGE_KEY_V3,
  STORAGE_KEY_V4,
  STORAGE_KEY_V5,
  SectorId,
  SubLevelProgress,
  TerminalTab,
  ThemeMode,
  createEmptySectorProgress,
  createEmptySectorsRecord,
  createEmptySubLevelProgress,
  createInitialProfile,
  createInitialStore,
  getNextThemeMode,
  isDarkTheme,
  normalizeThemeMode,
} from './types';
import {
  deleteCloudCustomQuestion,
  fetchCloudCustomQuestions,
  fetchUserCloudData,
  saveUserCloudData,
  upsertCloudCustomQuestions,
} from './utils/cloudSync';
import { soundEngine } from './utils/soundEngine';
import { ThemeContext } from './components/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StarfieldCanvas } from './components/StarfieldCanvas';
import { TopBar } from './components/TopBar';
import { PlanetHomeView } from './components/PlanetHomeView';
import { SpaceSectorMap } from './components/SpaceSectorMap';
import { OnlineBattleView } from './components/OnlineBattleView';
import { SectorTerminal } from './components/SectorTerminal';
import { ProgressManagerModal } from './components/ProgressManagerModal';
import { WrongReviewModal } from './components/WrongReviewModal';
import { SpaceFairyGuide } from './components/SpaceFairyGuide';
import { CelebrationBurst, CelebrationPayload } from './components/CelebrationBurst';

export type { ProfileRecord } from './types';

function normalizeProfile(raw: Partial<ProfileRecord>, fallbackName: string): ProfileRecord {
  const base = createInitialProfile(raw.name || fallbackName);
  const merged = createEmptySectorsRecord();

  if (raw.sectors) {
    for (const key of SECTOR_KEYS_SAFE) {
      const incoming = raw.sectors[key];
      if (!incoming) continue;

      const sectorDef = SECTORS.find((s) => s.id === key);
      const rawSubLevels = incoming.subLevels ?? {};
      const subLevels: Record<string, SubLevelProgress> = {};

      if (sectorDef && Object.keys(rawSubLevels).length === 0) {
        // Legacy v2/v3 migration: backfill subLevels from top-level answers
        sectorDef.subLessons.forEach((sub) => {
          const subAnswers: Record<number, number> = {};
          const subAnswersById: Record<string, number> = {};
          let correct = 0;
          sub.questionIndices.forEach((qi) => {
            const quiz = sectorDef.quizzes[qi];
            if (incoming.answers && incoming.answers[qi] !== undefined && quiz) {
              subAnswers[qi] = incoming.answers[qi];
              subAnswersById[quiz.id] = incoming.answers[qi];
              if (incoming.answers[qi] === quiz.ans) {
                correct += 1;
              }
            }
          });
          subLevels[sub.id] = {
            completed: Boolean(incoming.quiz),
            bestScore: incoming.quiz ? sub.questionIndices.length : correct,
            answers: subAnswers,
            answersById: subAnswersById,
          };
        });
      } else {
        // Migrate existing subLevels to include answersById mapped via stable question IDs
        for (const [subId, sp] of Object.entries(rawSubLevels)) {
          const answersById: Record<string, number> = { ...(sp.answersById ?? {}) };
          if (sectorDef && sp.answers) {
            for (const [qiStr, opt] of Object.entries(sp.answers)) {
              const qi = Number(qiStr);
              const quiz = sectorDef.quizzes[qi];
              if (quiz && answersById[quiz.id] === undefined) {
                answersById[quiz.id] = opt;
              }
            }
          }
          subLevels[subId] = {
            completed: Boolean(sp.completed),
            bestScore: typeof sp.bestScore === 'number' ? sp.bestScore : 0,
            answers: { ...(sp.answers ?? {}) },
            answersById,
          };
        }
      }

      const answersById: Record<string, number> = { ...(incoming.answersById ?? {}) };
      if (sectorDef && incoming.answers) {
        for (const [qiStr, opt] of Object.entries(incoming.answers)) {
          const qi = Number(qiStr);
          const quiz = sectorDef.quizzes[qi];
          if (quiz && answersById[quiz.id] === undefined) {
            answersById[quiz.id] = opt;
          }
        }
      }

      const wrongQuestions = Array.isArray(incoming.wrongQuestions) ? incoming.wrongQuestions : [];
      const wrongIdSet = new Set<string>(
        Array.isArray(incoming.wrongQuestionIds) ? incoming.wrongQuestionIds : []
      );
      if (sectorDef) {
        wrongQuestions.forEach((qi) => {
          const quiz = sectorDef.quizzes[qi];
          if (quiz) wrongIdSet.add(quiz.id);
        });
      }

      merged[key] = {
        ...createEmptySectorProgress(),
        ...incoming,
        warmup: Boolean(incoming.warmup),
        answersById,
        subLevels,
        wrongQuestions,
        wrongQuestionIds: Array.from(wrongIdSet),
      };
    }
  }

  const resolvedScore = typeof raw.totalScore === 'number' ? raw.totalScore : base.totalScore;
  const { nextBadges } = reconcileAchievementBadges(
    resolvedScore,
    Array.isArray(raw.achievementBadges) ? raw.achievementBadges : []
  );

  return {
    name: raw.name || fallbackName,
    sectors: merged,
    totalScore: resolvedScore,
    achievementBadges: nextBadges,
    claimedBattleRooms: Array.isArray(raw.claimedBattleRooms) ? raw.claimedBattleRooms : [],
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

function hydrateStore(parsed: Partial<MultiProfileStore>, defaultTheme?: ThemeMode): MultiProfileStore | null {
  if (!parsed || !parsed.profiles || Object.keys(parsed.profiles).length === 0) return null;
  const cleanedProfiles: Record<string, ProfileRecord> = {};
  for (const [k, v] of Object.entries(parsed.profiles)) {
    cleanedProfiles[k] = normalizeProfile(v, k);
  }
  const activeName =
    parsed.activeName && cleanedProfiles[parsed.activeName]
      ? parsed.activeName
      : Object.keys(cleanedProfiles)[0];
  return {
    activeName,
    profiles: cleanedProfiles,
    mode: parsed.mode === 'projector' ? 'projector' : 'student',
    theme: defaultTheme ?? normalizeThemeMode(parsed.theme),
  };
}

function loadCustomQuestionsLocal(): CustomQuestionRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOM_QUESTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (q): q is CustomQuestionRecord =>
        Boolean(q) && typeof q.id === 'string' && typeof q.sectorId === 'string' && typeof q.q === 'string'
    );
  } catch {
    return [];
  }
}

function loadMultiProfileStore(): MultiProfileStore {
  try {
    const rawV5 = localStorage.getItem(STORAGE_KEY_V5);
    if (rawV5) {
      const hydrated = hydrateStore(JSON.parse(rawV5) as Partial<MultiProfileStore>);
      if (hydrated) return hydrated;
    }

    const rawV4 = localStorage.getItem(STORAGE_KEY_V4);
    if (rawV4) {
      const hydrated = hydrateStore(JSON.parse(rawV4) as Partial<MultiProfileStore>);
      if (hydrated) return hydrated;
    }

    const rawV3 = localStorage.getItem(STORAGE_KEY_V3);
    if (rawV3) {
      const hydrated = hydrateStore(JSON.parse(rawV3) as Partial<MultiProfileStore>, 'space');
      if (hydrated) return hydrated;
    }

    const rawV2 = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV2) {
      const parsedV2 = JSON.parse(rawV2) as {
        sectors?: ProfileRecord['sectors'];
        totalScore?: number;
        mode?: AppMode;
      };
      if (parsedV2 && parsedV2.sectors) {
        const store = createInitialStore();
        store.profiles[store.activeName] = normalizeProfile(
          {
            name: store.activeName,
            sectors: parsedV2.sectors,
            totalScore: parsedV2.totalScore ?? 0,
          },
          store.activeName
        );
        store.mode = parsedV2.mode === 'projector' ? 'projector' : 'student';
        return store;
      }
    }
  } catch {
    // fallback
  }
  return createInitialStore();
}

export default function App() {
  const [store, setStore] = useState<MultiProfileStore>(() => loadMultiProfileStore());
  const [customQuestions, setCustomQuestions] = useState<CustomQuestionRecord[]>(() =>
    loadCustomQuestionsLocal()
  );
  const [homeView, setHomeView] = useState<HomeViewMode>('planet');
  const [activeSectorId, setActiveSectorId] = useState<SectorId | null>(null);
  const [activeTab, setActiveTab] = useState<TerminalTab>('slides');
  const [activeSubId, setActiveSubId] = useState<string>('s1-1');
  const [lastQuizOutcome, setLastQuizOutcome] = useState<'correct' | 'wrong' | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);

  const [cloudUser, setCloudUser] = useState<FirebaseUser | null>(null);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<number | null>(null);
  const [audioSyncTick, setAudioSyncTick] = useState(0);
  const cloudHydratedUidRef = useRef<string | null>(null);
  const suppressCloudPushRef = useRef(false);
  const storeRef = useRef(store);
  storeRef.current = store;
  const customQuestionsRef = useRef(customQuestions);
  customQuestionsRef.current = customQuestions;

  const triggerCelebration = useCallback(
    (
      title: string,
      subtitle: string,
      bonusText: string,
      badge?: SpaceAchievementBadge
    ) => {
      soundEngine.playCelebrate();
      setCelebration({
        id: Date.now(),
        title,
        subtitle,
        bonusText,
        badge,
      });
    },
    []
  );

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => setCelebration(null), 3200);
    return () => clearTimeout(t);
  }, [celebration]);

  // Global physical tactile button click SFX & audio unlock
  useEffect(() => {
    const handleGlobalClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      const btn = target?.closest('button, [role="button"]');
      if (!btn) return;
      if ((btn as HTMLButtonElement).disabled || btn.getAttribute('aria-disabled') === 'true') return;
      soundEngine.unlockIfNeeded();
      if (btn.getAttribute('data-sfx') === 'custom') return;
      soundEngine.playClick();
    };
    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true });
  }, []);

  // Subscribe to soundEngine changes so audio prefs also sync across devices
  useEffect(() => {
    return soundEngine.subscribe(() => setAudioSyncTick((v) => v + 1));
  }, []);

  // Sync Tailwind v4 .dark class on <html> for dark themes ('space' | 'cyber')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkTheme(store.theme));
  }, [store.theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_V5, JSON.stringify(store));
    } catch {
      // Ignore storage quota errors
    }
  }, [store]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_QUESTIONS_STORAGE_KEY, JSON.stringify(customQuestions));
    } catch {
      // Ignore storage quota errors
    }
  }, [customQuestions]);

  // Helper: Pull and merge user settings, profiles & custom questions from Firestore
  const applyCloudSnapshot = useCallback(async (uid: string, forceRemote: boolean) => {
    setCloudSyncing(true);
    try {
      const [cloudSnap, remoteQuestions] = await Promise.all([
        fetchUserCloudData(uid),
        fetchCloudCustomQuestions(uid),
      ]);

      if (cloudSnap) {
        const localCur = storeRef.current;
        const localMaxUpdated = Math.max(
          0,
          ...Object.values(localCur.profiles).map((p) => p.updatedAt ?? 0)
        );
        const localProfileCount = Object.keys(localCur.profiles).length;
        const localTotalScore = Object.values(localCur.profiles).reduce(
          (sum, p) => sum + (p.totalScore ?? 0),
          0
        );
        const localIsUntouched = localProfileCount === 1 && localTotalScore === 0;

        if (forceRemote || localIsUntouched || cloudSnap.updatedAtMs > localMaxUpdated) {
          suppressCloudPushRef.current = true;
          const hydrated = hydrateStore({
            ...localCur,
            ...cloudSnap.store,
            profiles: {
              ...localCur.profiles,
              ...(cloudSnap.store.profiles ?? {}),
            },
          });
          if (hydrated) {
            setStore(hydrated);
          }
          if (cloudSnap.audioPrefs) {
            soundEngine.applyCloudPrefs(cloudSnap.audioPrefs);
          }
        }
        setLastCloudSyncAt(cloudSnap.updatedAtMs);
      } else {
        // First time this account connects: upload current local store
        await saveUserCloudData(uid, storeRef.current, soundEngine.getPrefs());
        setLastCloudSyncAt(Date.now());
      }

      if (remoteQuestions.length > 0 || customQuestionsRef.current.length > 0) {
        const byId = new Map<string, CustomQuestionRecord>();
        customQuestionsRef.current.forEach((q) => byId.set(q.id, q));
        remoteQuestions.forEach((rq) => {
          const prev = byId.get(rq.id);
          if (!prev || forceRemote || (rq.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) {
            byId.set(rq.id, rq);
          }
        });
        const mergedList = Array.from(byId.values());
        setCustomQuestions(mergedList);

        // Push any local-only questions up to cloud
        const remoteIds = new Set(remoteQuestions.map((r) => r.id));
        const missingRemotely = mergedList.filter((q) => !remoteIds.has(q.id));
        if (missingRemotely.length > 0) {
          await upsertCloudCustomQuestions(uid, missingRemotely);
        }
      }
    } catch {
      // Handled by Firestore error helper / non-blocking offline mode
    } finally {
      cloudHydratedUidRef.current = uid;
      setCloudSyncing(false);
    }
  }, []);

  // Listen to Firebase Auth state for automatic cross-device sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCloudUser(user);
      if (user) {
        if (cloudHydratedUidRef.current !== user.uid) {
          void applyCloudSnapshot(user.uid, false);
        }
      } else {
        cloudHydratedUidRef.current = null;
      }
    });
    return () => unsub();
  }, [applyCloudSnapshot]);

  // Debounced auto-push of settings & progress to Firestore when signed in
  useEffect(() => {
    if (!cloudUser) return;
    if (cloudHydratedUidRef.current !== cloudUser.uid) return;
    if (suppressCloudPushRef.current) {
      suppressCloudPushRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      setCloudSyncing(true);
      void saveUserCloudData(cloudUser.uid, store, soundEngine.getPrefs())
        .then(() => setLastCloudSyncAt(Date.now()))
        .catch(() => {})
        .finally(() => setCloudSyncing(false));
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [store, audioSyncTick, cloudUser]);

  const activeProfile =
    store.profiles[store.activeName] ?? createInitialProfile(store.activeName);

  const prevBadgesRef = useRef<{ name: string; badges: string[] }>({
    name: store.activeName,
    badges: activeProfile.achievementBadges ?? [],
  });

  useEffect(() => {
    const currentBadges = activeProfile.achievementBadges ?? [];
    if (prevBadgesRef.current.name !== store.activeName) {
      prevBadgesRef.current = { name: store.activeName, badges: currentBadges };
      return;
    }

    const prevSet = new Set(prevBadgesRef.current.badges);
    const addedIds = currentBadges.filter((id) => !prevSet.has(id));
    prevBadgesRef.current = { name: store.activeName, badges: currentBadges };

    if (addedIds.length > 0) {
      const unlockedDefs = SPACE_ACHIEVEMENT_BADGES.filter((b) => addedIds.includes(b.id));
      const topBadge = unlockedDefs[unlockedDefs.length - 1];
      if (topBadge) {
        triggerCelebration(
          `解鎖太空徽章：${topBadge.title}`,
          `總積分達 ${topBadge.threshold} 分 · 晉升「${topBadge.rankLabel}」`,
          `${topBadge.threshold} 分達成`,
          topBadge
        );
      }
    }
  }, [store.activeName, activeProfile.achievementBadges, triggerCelebration]);

  const wrongCount = useMemo(
    () =>
      SECTOR_KEYS_SAFE.reduce((acc, key) => {
        const sp = activeProfile.sectors[key];
        const count =
          sp.wrongQuestionIds && sp.wrongQuestionIds.length > 0
            ? sp.wrongQuestionIds.length
            : sp.wrongQuestions?.length ?? 0;
        return acc + count;
      }, 0),
    [activeProfile]
  );

  const mergedSectors = useMemo(() => getMergedSectors(customQuestions), [customQuestions]);

  const totalSystemStars = useMemo(() => getTotalSystemStars(mergedSectors), [mergedSectors]);
  const totalEarnedStars = useMemo(
    () =>
      mergedSectors.reduce(
        (acc, sec) => acc + getSectorStarStats(sec, activeProfile.sectors[sec.id]).earned,
        0
      ),
    [activeProfile, mergedSectors]
  );

  const activeSector = activeSectorId
    ? mergedSectors.find((sec) => sec.id === activeSectorId) ?? null
    : null;

  const activeSubLesson = useMemo(() => {
    if (!activeSector) return null;
    return (
      activeSector.subLessons.find((sub) => sub.id === activeSubId) ??
      activeSector.subLessons[0] ??
      null
    );
  }, [activeSector, activeSubId]);

  const selectSector = (id: SectorId) => {
    const sectorDef = mergedSectors.find((s) => s.id === id);
    const sp = activeProfile.sectors[id];
    const firstIncompleteSub =
      sectorDef?.subLessons.find((sub) => !sp.subLevels?.[sub.id]?.completed) ??
      sectorDef?.subLessons[0];
    setActiveSectorId(id);
    setActiveTab('slides');
    setActiveSubId(firstIncompleteSub?.id ?? `${id}-1`);
    setLastQuizOutcome(null);
  };

  const updateActiveProfile = useCallback((updater: (p: ProfileRecord) => ProfileRecord) => {
    setStore((prev) => {
      const cur = prev.profiles[prev.activeName] ?? createInitialProfile(prev.activeName);
      const updated = updater(cur);
      const { nextBadges } = reconcileAchievementBadges(
        updated.totalScore,
        updated.achievementBadges ?? []
      );
      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [prev.activeName]: {
            ...updated,
            achievementBadges: nextBadges,
            updatedAt: Date.now(),
          },
        },
      };
    });
  }, []);

  const handleSetTheme = (theme: ThemeMode) => {
    setStore((prev) => ({ ...prev, theme }));
  };

  const handleToggleTheme = () => {
    setStore((prev) => ({ ...prev, theme: getNextThemeMode(prev.theme) }));
  };

  const handleChangeMode = (mode: AppMode) => {
    setStore((prev) => ({ ...prev, mode }));
  };

  const handleSyncNowToCloud = async () => {
    if (!cloudUser) return;
    setCloudSyncing(true);
    try {
      await saveUserCloudData(cloudUser.uid, store, soundEngine.getPrefs());
      if (customQuestions.length > 0) {
        await upsertCloudCustomQuestions(cloudUser.uid, customQuestions);
      }
      setLastCloudSyncAt(Date.now());
    } finally {
      setCloudSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!cloudUser) return;
    await applyCloudSnapshot(cloudUser.uid, true);
  };

  const handleImportCustomQuestions = async (items: CustomQuestionRecord[]) => {
    if (items.length === 0) return;
    setCustomQuestions((prev) => {
      const map = new Map(prev.map((q) => [q.id, q]));
      items.forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    });
    if (cloudUser) {
      setCloudSyncing(true);
      try {
        await upsertCloudCustomQuestions(cloudUser.uid, items);
        setLastCloudSyncAt(Date.now());
      } finally {
        setCloudSyncing(false);
      }
    }
  };

  const handleDeleteCustomQuestion = async (questionId: string) => {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== questionId));
    if (cloudUser) {
      setCloudSyncing(true);
      try {
        await deleteCloudCustomQuestion(cloudUser.uid, questionId);
        setLastCloudSyncAt(Date.now());
      } finally {
        setCloudSyncing(false);
      }
    }
  };

  const handleCompleteSlides = (sectorId: SectorId) => {
    const sectorDef = mergedSectors.find((s) => s.id === sectorId);
    const wasDone = activeProfile.sectors[sectorId].slides;
    updateActiveProfile((prof) => {
      const target = prof.sectors[sectorId];
      if (target.slides) return prof;
      return {
        ...prof,
        totalScore: prof.totalScore + 20,
        sectors: { ...prof.sectors, [sectorId]: { ...target, slides: true } },
      };
    });
    if (!wasDone) {
      triggerCelebration(
        '獲得簡報星星！',
        `${sectorDef?.shortTitle ?? ''} 單元簡報探索完成`,
        '+20 分'
      );
    }
  };

  const handleCompleteWarmup = (sectorId: SectorId) => {
    const sectorDef = mergedSectors.find((s) => s.id === sectorId);
    const wasDone = activeProfile.sectors[sectorId].warmup;
    updateActiveProfile((prof) => {
      const target = prof.sectors[sectorId];
      if (target.warmup) return prof;
      return {
        ...prof,
        totalScore: prof.totalScore + 25,
        sectors: { ...prof.sectors, [sectorId]: { ...target, warmup: true } },
      };
    });
    if (!wasDone) {
      triggerCelebration(
        '熱身關卡過關！',
        `${sectorDef?.shortTitle ?? ''} 點亮熱身星星`,
        '+25 分'
      );
    }
  };

  const handleAnswerSubQuiz = (
    sectorId: SectorId,
    subId: string,
    qId: string,
    qIdx: number,
    optIdx: number,
    isCorrect: boolean
  ) => {
    const sectorDef = mergedSectors.find((s) => s.id === sectorId);
    const subDef = sectorDef?.subLessons.find((s) => s.id === subId);
    if (!sectorDef || !subDef) return;

    const subQuestions = getSubLessonQuestions(sectorDef, subDef);
    const currentTarget = activeProfile.sectors[sectorId];
    const currentSub = currentTarget.subLevels?.[subId] ?? createEmptySubLevelProgress();
    const alreadyAnswered =
      (currentSub.answersById && currentSub.answersById[qId] !== undefined) ||
      (qIdx >= 0 && currentSub.answers[qIdx] !== undefined);

    const previewAnswersById = { ...(currentSub.answersById ?? {}), [qId]: optIdx };
    const previewAnswers = { ...currentSub.answers };
    if (qIdx >= 0) previewAnswers[qIdx] = optIdx;

    const previewAllAnswered = subQuestions.every((item) => {
      const idx = sectorDef.quizzes.findIndex((qq) => qq.id === item.id);
      return previewAnswersById[item.id] !== undefined || (idx >= 0 && previewAnswers[idx] !== undefined);
    });
    const previewCorrect = subQuestions.filter((item) => {
      const idx = sectorDef.quizzes.findIndex((qq) => qq.id === item.id);
      const picked = previewAnswersById[item.id] ?? (idx >= 0 ? previewAnswers[idx] : undefined);
      return picked === item.ans;
    }).length;
    const previewPass = previewCorrect >= Math.ceil(subQuestions.length * 0.6);
    const willCelebrateSub =
      !alreadyAnswered && previewAllAnswered && previewPass && !currentSub.completed;

    updateActiveProfile((prof) => {
      const target = prof.sectors[sectorId];
      const prevSub = target.subLevels?.[subId] ?? createEmptySubLevelProgress();
      if (
        (prevSub.answersById && prevSub.answersById[qId] !== undefined) ||
        (qIdx >= 0 && prevSub.answers[qIdx] !== undefined)
      ) {
        return prof;
      }

      const nextAnswersById = { ...(prevSub.answersById ?? {}), [qId]: optIdx };
      const nextAnswers = { ...prevSub.answers };
      if (qIdx >= 0) nextAnswers[qIdx] = optIdx;

      const allSubAnswered = subQuestions.every((item) => {
        const idx = sectorDef.quizzes.findIndex((qq) => qq.id === item.id);
        return nextAnswersById[item.id] !== undefined || (idx >= 0 && nextAnswers[idx] !== undefined);
      });
      const subCorrectCount = subQuestions.filter((item) => {
        const idx = sectorDef.quizzes.findIndex((qq) => qq.id === item.id);
        const picked = nextAnswersById[item.id] ?? (idx >= 0 ? nextAnswers[idx] : undefined);
        return picked === item.ans;
      }).length;
      const passSub = subCorrectCount >= Math.ceil(subQuestions.length * 0.6);

      const newlyCompletedSub = allSubAnswered && passSub && !prevSub.completed;
      const nextSubLevels: Record<string, SubLevelProgress> = {
        ...(target.subLevels ?? {}),
        [subId]: {
          completed: prevSub.completed || (allSubAnswered && passSub),
          bestScore: Math.max(prevSub.bestScore, subCorrectCount),
          answers: nextAnswers,
          answersById: nextAnswersById,
        },
      };

      const allSubsDone = sectorDef.subLessons.every((s) => nextSubLevels[s.id]?.completed);
      const existingWrong = target.wrongQuestions ?? [];
      const existingWrongIds = target.wrongQuestionIds ?? [];

      const nextWrong =
        !isCorrect && qIdx >= 0 && !existingWrong.includes(qIdx)
          ? [...existingWrong, qIdx]
          : existingWrong;
      const nextWrongIds =
        !isCorrect && !existingWrongIds.includes(qId)
          ? [...existingWrongIds, qId]
          : existingWrongIds;

      const scoreGain = (isCorrect ? 15 : 0) + (newlyCompletedSub ? 30 : 0);

      const nextTopAnswers = { ...target.answers };
      if (qIdx >= 0) nextTopAnswers[qIdx] = optIdx;

      return {
        ...prof,
        totalScore: prof.totalScore + scoreGain,
        sectors: {
          ...prof.sectors,
          [sectorId]: {
            ...target,
            quiz: target.quiz || allSubsDone,
            answers: nextTopAnswers,
            answersById: { ...(target.answersById ?? {}), [qId]: optIdx },
            subLevels: nextSubLevels,
            wrongQuestions: nextWrong,
            wrongQuestionIds: nextWrongIds,
          },
        },
      };
    });

    if (willCelebrateSub) {
      triggerCelebration(
        `小節 ${subDef.code} 奪星成功！`,
        `${subDef.title} 微關卡已通關`,
        '+30 分'
      );
    }
  };

  const handleResetSubQuiz = (sectorId: SectorId, subId: string) => {
    updateActiveProfile((prof) => {
      const target = prof.sectors[sectorId];
      const prevSub = target.subLevels?.[subId] ?? createEmptySubLevelProgress();
      return {
        ...prof,
        sectors: {
          ...prof.sectors,
          [sectorId]: {
            ...target,
            subLevels: {
              ...(target.subLevels ?? {}),
              [subId]: {
                ...prevSub,
                answers: {},
                answersById: {},
              },
            },
          },
        },
      };
    });
  };

  const handleCompleteLab = (sectorId: SectorId, bonus: number) => {
    const sectorDef = mergedSectors.find((s) => s.id === sectorId);
    const wasDone = activeProfile.sectors[sectorId].lab;
    updateActiveProfile((prof) => {
      const target = prof.sectors[sectorId];
      if (target.lab) return prof;
      return {
        ...prof,
        totalScore: prof.totalScore + bonus,
        sectors: { ...prof.sectors, [sectorId]: { ...target, lab: true } },
      };
    });
    if (!wasDone) {
      triggerCelebration(
        '創意對戰通關！',
        `${sectorDef?.creativeName ?? ''} 獲勝奪星`,
        `+${bonus} 分`
      );
    }
  };

  const handleResolveWrong = (sectorId: SectorId, qId: string, qIdx: number) => {
    updateActiveProfile((prof) => {
      const target = prof.sectors[sectorId];
      const nextWrong = (target.wrongQuestions ?? []).filter((id) => id !== qIdx);
      const nextWrongIds = (target.wrongQuestionIds ?? []).filter((id) => id !== qId);
      return {
        ...prof,
        totalScore: prof.totalScore + 5,
        sectors: {
          ...prof.sectors,
          [sectorId]: {
            ...target,
            wrongQuestions: nextWrong,
            wrongQuestionIds: nextWrongIds,
          },
        },
      };
    });
  };

  const handleClaimBattleBonus = useCallback(
    (roomCode: string, bonusScore: number, isWinner: boolean) => {
      const alreadyClaimed = activeProfile.claimedBattleRooms?.includes(roomCode);
      if (alreadyClaimed) return;
      updateActiveProfile((prof) => {
        if (prof.claimedBattleRooms?.includes(roomCode)) return prof;
        return {
          ...prof,
          totalScore: prof.totalScore + bonusScore,
          claimedBattleRooms: [...(prof.claimedBattleRooms ?? []), roomCode],
        };
      });
      triggerCelebration(
        isWinner ? '線上對戰稱霸全場！' : '星際線上對戰完成！',
        `房號 ${roomCode} 實戰結算獎勵已入帳`,
        `+${bonusScore} 分`
      );
    },
    [activeProfile.claimedBattleRooms, triggerCelebration, updateActiveProfile]
  );

  const handleSwitchProfile = (name: string) => {
    setStore((prev) => {
      const exists = prev.profiles[name];
      return {
        ...prev,
        activeName: name,
        profiles: exists ? prev.profiles : { ...prev.profiles, [name]: createInitialProfile(name) },
      };
    });
  };

  const handleClearSector = (scope: 'active' | 'all', sectorId: SectorId) => {
    setStore((prev) => {
      const nextProfiles = { ...prev.profiles };
      const targets = scope === 'active' ? [prev.activeName] : Object.keys(nextProfiles);
      targets.forEach((name) => {
        const prof = nextProfiles[name];
        if (!prof) return;
        nextProfiles[name] = {
          ...prof,
          sectors: {
            ...prof.sectors,
            [sectorId]: createEmptySectorProgress(),
          },
          updatedAt: Date.now(),
        };
      });
      return { ...prev, profiles: nextProfiles };
    });
  };

  const handleClearAll = (scope: 'active' | 'all') => {
    setStore((prev) => {
      if (scope === 'all') {
        const resetProfiles: Record<string, ProfileRecord> = {};
        Object.keys(prev.profiles).forEach((name) => {
          resetProfiles[name] = createInitialProfile(name);
        });
        return { ...prev, profiles: resetProfiles };
      }
      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [prev.activeName]: createInitialProfile(prev.activeName),
        },
      };
    });
  };

  const handleImportBackup = (jsonText: string): { ok: boolean; msg: string } => {
    try {
      const parsed = JSON.parse(jsonText) as {
        profiles?: Record<string, Partial<ProfileRecord>>;
      };
      if (!parsed || typeof parsed !== 'object' || !parsed.profiles) {
        return { ok: false, msg: '備份格式無效：找不到 profiles 欄位。' };
      }
      const incomingEntries = Object.entries(parsed.profiles);
      if (incomingEntries.length === 0) {
        return { ok: false, msg: '備份內容為空，請確認檔案是否正確。' };
      }

      setStore((prev) => {
        const nextProfiles = { ...prev.profiles };
        for (const [name, rec] of incomingEntries) {
          nextProfiles[name] = normalizeProfile(rec, name);
        }
        const nextActive = nextProfiles[prev.activeName]
          ? prev.activeName
          : incomingEntries[0][0];
        return {
          ...prev,
          activeName: nextActive,
          profiles: nextProfiles,
        };
      });
      return {
        ok: true,
        msg: `成功匯入並還原 ${incomingEntries.length} 份學生紀錄！`,
      };
    } catch {
      return { ok: false, msg: '無法解析 JSON 文字，請確認備份內容完整無誤。' };
    }
  };

  const outerThemeClass =
    store.theme === 'space'
      ? 'space-grid-bg bg-[#030714] text-slate-100'
      : 'light-sky-bg text-slate-900';

  return (
    <ErrorBoundary>
      <ThemeContext.Provider value={store.theme}>
        <div className={`relative min-h-screen overflow-x-hidden transition-colors ${outerThemeClass}`}>
          {isDarkTheme(store.theme) ? (
            <>
              {/* Cosmic Nebula Volumetric Backdrop */}
              <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
                <div
                  className="animate-nebula-drift absolute -top-28 -left-24 h-[520px] w-[520px] rounded-full blur-[95px]"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(14,165,233,0.28) 0%, rgba(56,189,248,0.08) 55%, transparent 75%)',
                  }}
                />
                <div
                  className="animate-nebula-drift absolute top-1/4 -right-24 h-[560px] w-[560px] rounded-full blur-[110px]"
                  style={{
                    animationDelay: '-4.5s',
                    background:
                      'radial-gradient(circle, rgba(139,92,246,0.26) 0%, rgba(236,72,153,0.08) 52%, transparent 76%)',
                  }}
                />
                <div
                  className="animate-nebula-drift absolute -bottom-32 left-1/3 h-[460px] w-[640px] rounded-full blur-[100px]"
                  style={{
                    animationDelay: '-8s',
                    background:
                      'radial-gradient(circle, rgba(20,184,166,0.2) 0%, rgba(14,165,233,0.05) 60%, transparent 78%)',
                  }}
                />
              </div>
              <StarfieldCanvas />
            </>
          ) : (
            /* High-Altitude Cosmic Daylight Atmosphere Backdrop */
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
              <div
                className="animate-nebula-drift absolute -top-24 right-[6%] h-[420px] w-[420px] rounded-full blur-[80px]"
                style={{
                  background:
                    'radial-gradient(circle, rgba(254,240,138,0.62) 0%, rgba(186,230,253,0.16) 60%, transparent 80%)',
                }}
              />
              <div
                className="animate-nebula-drift absolute -bottom-24 left-[8%] h-[380px] w-[520px] rounded-full blur-[90px]"
                style={{
                  animationDelay: '-5s',
                  background:
                    'radial-gradient(circle, rgba(56,189,248,0.32) 0%, rgba(14,165,233,0.08) 60%, transparent 80%)',
                }}
              />
              <svg
                viewBox="0 0 1440 900"
                preserveAspectRatio="xMidYMid slice"
                className="h-full w-full opacity-90"
              >
                {/* Faint Cosmic Orbital Horizon Arcs */}
                <ellipse
                  cx="720"
                  cy="920"
                  rx="860"
                  ry="240"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeOpacity="0.45"
                  strokeWidth="1.5"
                  strokeDasharray="10 12"
                />
                {/* Layered Soft Stratospheric Clouds */}
                <g fill="#FFFFFF" fillOpacity="0.48">
                  <ellipse cx="180" cy="210" rx="115" ry="32" />
                  <ellipse cx="235" cy="196" rx="70" ry="26" />
                  <ellipse cx="1210" cy="240" rx="130" ry="34" />
                  <ellipse cx="1150" cy="222" rx="78" ry="28" />
                  <ellipse cx="740" cy="128" rx="102" ry="24" fillOpacity="0.34" />
                </g>
                {/* Daylight Stardust Sparkles */}
                <g fill="#FFFFFF" fillOpacity="0.72">
                  <circle cx="140" cy="110" r="2.2" />
                  <circle cx="380" cy="95" r="1.8" />
                  <circle cx="960" cy="105" r="2.4" />
                  <circle cx="1310" cy="145" r="2" />
                  <circle cx="260" cy="690" r="2.2" />
                  <circle cx="1180" cy="710" r="2.4" />
                </g>
              </svg>
            </div>
          )}

          <div className="relative z-10 flex min-h-screen flex-col">
            <TopBar
              activeSectorId={activeSectorId}
              homeView={homeView}
              theme={store.theme}
              wrongCount={wrongCount}
              onGoHomePlanet={() => {
                setActiveSectorId(null);
                setHomeView('planet');
                setLastQuizOutcome(null);
              }}
              onGoHomeGrid={() => {
                setActiveSectorId(null);
                setHomeView('grid');
                setLastQuizOutcome(null);
              }}
              onGoBattle={() => {
                setActiveSectorId(null);
                setHomeView('battle');
                setLastQuizOutcome(null);
              }}
              onOpenProgress={() => setShowProgressModal(true)}
              onOpenWrongReview={() => setShowWrongModal(true)}
              onToggleTheme={handleToggleTheme}
            />

            <main className={activeSector === null && homeView === 'planet' ? 'flex-1' : 'flex-1 pb-24'}>
              {activeSector ? (
                <SectorTerminal
                  key={activeSector.id}
                  sector={activeSector}
                  profile={activeProfile}
                  mode={store.mode}
                  activeTab={activeTab}
                  activeSubId={activeSubLesson?.id ?? activeSubId}
                  onChangeTab={(t) => {
                    setActiveTab(t);
                    setLastQuizOutcome(null);
                  }}
                  onSelectSubId={(subId) => {
                    setActiveSubId(subId);
                    setLastQuizOutcome(null);
                  }}
                  onBackToHome={() => {
                    setActiveSectorId(null);
                    setLastQuizOutcome(null);
                  }}
                  onSelectSector={selectSector}
                  onChangeMode={handleChangeMode}
                  onCompleteSlides={handleCompleteSlides}
                  onCompleteWarmup={handleCompleteWarmup}
                  onAnswerSubQuiz={handleAnswerSubQuiz}
                  onResetSubQuiz={handleResetSubQuiz}
                  onCompleteLab={handleCompleteLab}
                  onFeedback={(outcome) => setLastQuizOutcome(outcome)}
                />
              ) : homeView === 'planet' ? (
                <PlanetHomeView
                  profile={activeProfile}
                  mode={store.mode}
                  theme={store.theme}
                  wrongCount={wrongCount}
                  onSelectSector={selectSector}
                  onSwitchToGrid={() => setHomeView('grid')}
                  onOpenBattle={() => setHomeView('battle')}
                  onToggleTheme={handleSetTheme}
                  onChangeMode={handleChangeMode}
                  onOpenProgressModal={() => setShowProgressModal(true)}
                  onOpenWrongModal={() => setShowWrongModal(true)}
                />
              ) : homeView === 'battle' ? (
                <OnlineBattleView
                  profile={activeProfile}
                  theme={store.theme}
                  customQuestions={customQuestions}
                  sectorsSource={mergedSectors}
                  onCycleTheme={handleToggleTheme}
                  onClaimBattleBonus={handleClaimBattleBonus}
                  onBackToHome={() => setHomeView('planet')}
                />
              ) : (
                <SpaceSectorMap
                  profile={activeProfile}
                  mode={store.mode}
                  theme={store.theme}
                  onSelectSector={selectSector}
                  onChangeMode={handleChangeMode}
                  onSwitchToPlanet={() => setHomeView('planet')}
                  onOpenProgressModal={() => setShowProgressModal(true)}
                />
              )}
            </main>
          </div>

          {/* Blue老師課堂巡遊小精靈 */}
          <SpaceFairyGuide
            theme={store.theme}
            mode={store.mode}
            isPlanetHome={activeSector === null && homeView === 'planet'}
            activeSector={activeSector}
            activeTab={activeTab}
            activeSubLesson={activeSubLesson}
            lastQuizOutcome={lastQuizOutcome}
            totalEarnedStars={totalEarnedStars}
            totalSystemStars={totalSystemStars}
          />

          {/* 非阻斷式破關星芒祝賀特效 */}
          <CelebrationBurst
            celebration={celebration}
            onDismiss={() => setCelebration(null)}
          />

          {showProgressModal && (
            <ProgressManagerModal
              store={store}
              sectorsSource={mergedSectors}
              customQuestions={customQuestions}
              cloudUser={cloudUser}
              cloudSyncing={cloudSyncing}
              lastCloudSyncAt={lastCloudSyncAt}
              onSyncNowToCloud={handleSyncNowToCloud}
              onPullFromCloud={handlePullFromCloud}
              onImportCustomQuestions={handleImportCustomQuestions}
              onDeleteCustomQuestion={handleDeleteCustomQuestion}
              onClose={() => setShowProgressModal(false)}
              onSwitchProfile={handleSwitchProfile}
              onClearSector={handleClearSector}
              onClearAll={handleClearAll}
              onImportBackup={handleImportBackup}
            />
          )}

          {showWrongModal && (
            <WrongReviewModal
              profile={activeProfile}
              sectorsSource={mergedSectors}
              onClose={() => setShowWrongModal(false)}
              onResolveWrong={handleResolveWrong}
            />
          )}
        </div>
      </ThemeContext.Provider>
    </ErrorBoundary>
  );
}
