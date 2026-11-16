import { useEffect, useMemo, useState } from 'react';
import { SECTORS, getSectorStarStats, getTotalSystemStars } from './data/sectors';
import {
  AppMode,
  HomeViewMode,
  LEGACY_STORAGE_KEY,
  MultiProfileStore,
  ProfileRecord,
  SECTOR_KEYS_SAFE,
  STORAGE_KEY_V3,
  STORAGE_KEY_V4,
  SectorId,
  TerminalTab,
  ThemeMode,
  createEmptySectorProgress,
  createEmptySectorsRecord,
  createEmptySubLevelProgress,
  createInitialProfile,
  createInitialStore,
} from './types';
import { ThemeContext } from './components/ThemeContext';
import { StarfieldCanvas } from './components/StarfieldCanvas';
import { TopBar } from './components/TopBar';
import { PlanetHomeView } from './components/PlanetHomeView';
import { SpaceSectorMap } from './components/SpaceSectorMap';
import { SectorTerminal } from './components/SectorTerminal';
import { ProgressManagerModal } from './components/ProgressManagerModal';
import { WrongReviewModal } from './components/WrongReviewModal';
import { SpaceFairyGuide } from './components/SpaceFairyGuide';
import { CelebrationBurst, CelebrationPayload } from './components/CelebrationBurst';

function normalizeProfile(raw: Partial<ProfileRecord>, fallbackName: string): ProfileRecord {
  const base = createInitialProfile(raw.name || fallbackName);
  const merged = createEmptySectorsRecord();

  if (raw.sectors) {
    for (const key of SECTOR_KEYS_SAFE) {
      const incoming = raw.sectors[key];
      if (!incoming) continue;

      const sectorDef = SECTORS.find((s) => s.id === key);
      const subLevels = { ...(incoming.subLevels ?? {}) };

      // Smooth migration: if legacy quiz answers or completion exist without subLevels, backfill them
      if (sectorDef && Object.keys(subLevels).length === 0) {
        sectorDef.subLessons.forEach((sub) => {
          const subAnswers: Record<number, number> = {};
          let correct = 0;
          sub.questionIndices.forEach((qi) => {
            if (incoming.answers && incoming.answers[qi] !== undefined) {
              subAnswers[qi] = incoming.answers[qi];
              if (incoming.answers[qi] === sectorDef.quizzes[qi]?.ans) {
                correct += 1;
              }
            }
          });
          subLevels[sub.id] = {
            completed: Boolean(incoming.quiz),
            bestScore: incoming.quiz ? sub.questionIndices.length : correct,
            answers: subAnswers,
          };
        });
      }

      merged[key] = {
        ...createEmptySectorProgress(),
        ...incoming,
        warmup: Boolean(incoming.warmup),
        subLevels,
        wrongQuestions: Array.isArray(incoming.wrongQuestions) ? incoming.wrongQuestions : [],
      };
    }
  }

  return {
    name: raw.name || fallbackName,
    sectors: merged,
    totalScore: typeof raw.totalScore === 'number' ? raw.totalScore : base.totalScore,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

function loadMultiProfileStore(): MultiProfileStore {
  try {
    const rawV4 = localStorage.getItem(STORAGE_KEY_V4);
    if (rawV4) {
      const parsed = JSON.parse(rawV4) as Partial<MultiProfileStore>;
      if (parsed && parsed.profiles && Object.keys(parsed.profiles).length > 0) {
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
          theme: parsed.theme === 'light' ? 'light' : 'dark',
        };
      }
    }

    // Migrate from v3 (upgrading default theme to 'dark' so user lands on Animated Space Solar System)
    const rawV3 = localStorage.getItem(STORAGE_KEY_V3);
    if (rawV3) {
      const parsed = JSON.parse(rawV3) as Partial<MultiProfileStore>;
      if (parsed && parsed.profiles && Object.keys(parsed.profiles).length > 0) {
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
          theme: 'dark',
        };
      }
    }

    // Migrate from v2 if present
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
  const [homeView, setHomeView] = useState<HomeViewMode>('planet');
  const [activeSectorId, setActiveSectorId] = useState<SectorId | null>(null);
  const [activeTab, setActiveTab] = useState<TerminalTab>('slides');
  const [activeSubId, setActiveSubId] = useState<string>('s1-1');
  const [lastQuizOutcome, setLastQuizOutcome] = useState<'correct' | 'wrong' | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);

  const triggerCelebration = (title: string, subtitle: string, bonusText: string) => {
    setCelebration({
      id: Date.now(),
      title,
      subtitle,
      bonusText,
    });
  };

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => setCelebration(null), 3200);
    return () => clearTimeout(t);
  }, [celebration]);

  // Sync Tailwind v4 .dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', store.theme === 'dark');
  }, [store.theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(store));
    } catch {
      // Ignore storage quota errors
    }
  }, [store]);

  const activeProfile =
    store.profiles[store.activeName] ?? createInitialProfile(store.activeName);

  const wrongCount = useMemo(
    () =>
      SECTOR_KEYS_SAFE.reduce(
        (acc, key) => acc + (activeProfile.sectors[key].wrongQuestions?.length ?? 0),
        0
      ),
    [activeProfile]
  );

  const totalSystemStars = useMemo(() => getTotalSystemStars(SECTORS), []);
  const totalEarnedStars = useMemo(
    () =>
      SECTORS.reduce(
        (acc, sec) => acc + getSectorStarStats(sec, activeProfile.sectors[sec.id]).earned,
        0
      ),
    [activeProfile]
  );

  const activeSector = activeSectorId
    ? SECTORS.find((sec) => sec.id === activeSectorId) ?? null
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
    const sectorDef = SECTORS.find((s) => s.id === id);
    const sp = activeProfile.sectors[id];
    const firstIncompleteSub =
      sectorDef?.subLessons.find((sub) => !sp.subLevels?.[sub.id]?.completed) ??
      sectorDef?.subLessons[0];
    setActiveSectorId(id);
    setActiveTab('slides');
    setActiveSubId(firstIncompleteSub?.id ?? `${id}-1`);
    setLastQuizOutcome(null);
  };

  const updateActiveProfile = (updater: (p: ProfileRecord) => ProfileRecord) => {
    setStore((prev) => {
      const cur = prev.profiles[prev.activeName] ?? createInitialProfile(prev.activeName);
      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [prev.activeName]: {
            ...updater(cur),
            updatedAt: Date.now(),
          },
        },
      };
    });
  };

  const handleSetTheme = (theme: ThemeMode) => {
    setStore((prev) => ({ ...prev, theme }));
  };

  const handleToggleTheme = () => {
    setStore((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  const handleChangeMode = (mode: AppMode) => {
    setStore((prev) => ({ ...prev, mode }));
  };

  const handleCompleteSlides = (sectorId: SectorId) => {
    const sectorDef = SECTORS.find((s) => s.id === sectorId);
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
    const sectorDef = SECTORS.find((s) => s.id === sectorId);
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
    qIdx: number,
    optIdx: number,
    isCorrect: boolean
  ) => {
    const sectorDef = SECTORS.find((s) => s.id === sectorId);
    const subDef = sectorDef?.subLessons.find((s) => s.id === subId);
    if (!sectorDef || !subDef) return;

    const currentTarget = activeProfile.sectors[sectorId];
    const currentSub = currentTarget.subLevels?.[subId] ?? createEmptySubLevelProgress();
    const previewAnswers = { ...currentSub.answers, [qIdx]: optIdx };
    const previewAllAnswered = subDef.questionIndices.every((qi) => previewAnswers[qi] !== undefined);
    const previewCorrect = subDef.questionIndices.filter(
      (qi) => previewAnswers[qi] === sectorDef.quizzes[qi]?.ans
    ).length;
    const previewPass = previewCorrect >= Math.ceil(subDef.questionIndices.length * 0.6);
    const willCelebrateSub =
      currentSub.answers[qIdx] === undefined &&
      previewAllAnswered &&
      previewPass &&
      !currentSub.completed;

    updateActiveProfile((prof) => {
      const target = prof.sectors[sectorId];
      const prevSub = target.subLevels?.[subId] ?? createEmptySubLevelProgress();
      if (prevSub.answers[qIdx] !== undefined) return prof;

      const nextAnswers = { ...prevSub.answers, [qIdx]: optIdx };
      const allSubAnswered = subDef.questionIndices.every((qi) => nextAnswers[qi] !== undefined);
      const subCorrectCount = subDef.questionIndices.filter(
        (qi) => nextAnswers[qi] === sectorDef.quizzes[qi]?.ans
      ).length;
      const passSub = subCorrectCount >= Math.ceil(subDef.questionIndices.length * 0.6);

      const newlyCompletedSub = allSubAnswered && passSub && !prevSub.completed;
      const nextSubLevels = {
        ...(target.subLevels ?? {}),
        [subId]: {
          completed: prevSub.completed || (allSubAnswered && passSub),
          bestScore: Math.max(prevSub.bestScore, subCorrectCount),
          answers: nextAnswers,
        },
      };

      const allSubsDone = sectorDef.subLessons.every((s) => nextSubLevels[s.id]?.completed);
      const existingWrong = target.wrongQuestions ?? [];
      const nextWrong =
        !isCorrect && !existingWrong.includes(qIdx)
          ? [...existingWrong, qIdx]
          : existingWrong;

      const scoreGain = (isCorrect ? 15 : 0) + (newlyCompletedSub ? 30 : 0);

      return {
        ...prof,
        totalScore: prof.totalScore + scoreGain,
        sectors: {
          ...prof.sectors,
          [sectorId]: {
            ...target,
            quiz: target.quiz || allSubsDone,
            answers: { ...target.answers, [qIdx]: optIdx },
            subLevels: nextSubLevels,
            wrongQuestions: nextWrong,
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
              },
            },
          },
        },
      };
    });
  };

  const handleCompleteLab = (sectorId: SectorId, bonus: number) => {
    const sectorDef = SECTORS.find((s) => s.id === sectorId);
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

  const handleResolveWrong = (sectorId: SectorId, qIdx: number) => {
    updateActiveProfile((prof) => {
      const target = prof.sectors[sectorId];
      const nextWrong = (target.wrongQuestions ?? []).filter((id) => id !== qIdx);
      return {
        ...prof,
        totalScore: prof.totalScore + 5,
        sectors: {
          ...prof.sectors,
          [sectorId]: {
            ...target,
            wrongQuestions: nextWrong,
          },
        },
      };
    });
  };

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

  return (
    <ThemeContext.Provider value={store.theme}>
      <div
        className={`relative min-h-screen transition-colors ${
          store.theme === 'dark' ? 'space-grid-bg bg-[#070B14] text-slate-100' : 'light-sky-bg text-slate-900'
        }`}
      >
        {store.theme === 'dark' && <StarfieldCanvas />}

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
            onOpenProgress={() => setShowProgressModal(true)}
            onOpenWrongReview={() => setShowWrongModal(true)}
            onToggleTheme={handleToggleTheme}
          />

          <main className="flex-1 pb-24">
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
                onToggleTheme={handleSetTheme}
                onChangeMode={handleChangeMode}
                onOpenProgressModal={() => setShowProgressModal(true)}
                onOpenWrongModal={() => setShowWrongModal(true)}
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
            onClose={() => setShowWrongModal(false)}
            onResolveWrong={handleResolveWrong}
          />
        )}
      </div>
    </ThemeContext.Provider>
  );
}
