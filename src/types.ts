export type SectorId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7' | 's8';

export type AppMode = 'student' | 'projector';

export type ThemeMode = 'space' | 'bright';

export const THEME_CYCLE_ORDER: ThemeMode[] = ['space', 'bright'];

export interface ThemeMetaInfo {
  id: ThemeMode;
  label: string;
  shortLabel: string;
  desc: string;
  isDark: boolean;
}

export const THEME_META: Record<ThemeMode, ThemeMetaInfo> = {
  space: {
    id: 'space',
    label: '星夜極光',
    shortLabel: '星夜極光',
    desc: '深邃宇宙極光夜空與發光微縮太空主星',
    isDark: true,
  },
  bright: {
    id: 'bright',
    label: '星晝晨光',
    shortLabel: '星晝晨光',
    desc: '高空星晝晨光大氣與清透微縮太空主星',
    isDark: false,
  },
};

export function normalizeThemeMode(raw: unknown): ThemeMode {
  if (raw === 'bright' || raw === 'light' || raw === 'academy') {
    return 'bright';
  }
  return 'space';
}

export function isDarkTheme(theme: ThemeMode): boolean {
  return theme === 'space';
}

export function getNextThemeMode(current: ThemeMode): ThemeMode {
  const idx = THEME_CYCLE_ORDER.indexOf(current);
  return THEME_CYCLE_ORDER[(idx + 1) % THEME_CYCLE_ORDER.length];
}

export type HomeViewMode = 'planet' | 'grid' | 'battle';

export type TerminalTab = 'slides' | 'drill' | 'lab';

export interface CustomQuestionRecord {
  id: string;
  sectorId: SectorId;
  subId: string;
  q: string;
  options: string[];
  ans: number;
  exp: string;
  diagramId?: string;
  imageUrl?: string;
  source?: 'excel' | 'word' | 'manual';
  updatedAt?: number;
}

export interface SubLevelProgress {
  completed: boolean;
  bestScore: number;
  answers: Record<number, number>;
  answersById?: Record<string, number>;
}

export interface SectorProgress {
  slides: boolean;
  warmup: boolean;
  teach: boolean;
  quiz: boolean;
  lab: boolean;
  quizIdx: number;
  quizScore: number;
  answers: Record<number, number>;
  answersById?: Record<string, number>;
  subLevels: Record<string, SubLevelProgress>;
  wrongQuestions: number[];
  wrongQuestionIds?: string[];
}

export interface AppProgressState {
  sectors: Record<SectorId, SectorProgress>;
  totalScore: number;
  mode: AppMode;
}

export interface ProfileRecord {
  name: string;
  sectors: Record<SectorId, SectorProgress>;
  totalScore: number;
  achievementBadges: string[];
  claimedBattleRooms?: string[];
  updatedAt: number;
}

export interface MultiProfileStore {
  activeName: string;
  profiles: Record<string, ProfileRecord>;
  mode: AppMode;
  theme: ThemeMode;
}

export const SECTOR_KEYS_SAFE: SectorId[] = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];

export function createEmptySubLevelProgress(): SubLevelProgress {
  return {
    completed: false,
    bestScore: 0,
    answers: {},
    answersById: {},
  };
}

export function createEmptySectorProgress(): SectorProgress {
  return {
    slides: false,
    warmup: false,
    teach: false,
    quiz: false,
    lab: false,
    quizIdx: 0,
    quizScore: 0,
    answers: {},
    answersById: {},
    subLevels: {},
    wrongQuestions: [],
    wrongQuestionIds: [],
  };
}

export function createEmptySectorsRecord(): Record<SectorId, SectorProgress> {
  return {
    s1: createEmptySectorProgress(),
    s2: createEmptySectorProgress(),
    s3: createEmptySectorProgress(),
    s4: createEmptySectorProgress(),
    s5: createEmptySectorProgress(),
    s6: createEmptySectorProgress(),
    s7: createEmptySectorProgress(),
    s8: createEmptySectorProgress(),
  };
}

export function createInitialProfile(name: string): ProfileRecord {
  return {
    name,
    sectors: createEmptySectorsRecord(),
    totalScore: 0,
    achievementBadges: [],
    claimedBattleRooms: [],
    updatedAt: Date.now(),
  };
}

export function createInitialStore(): MultiProfileStore {
  const defaultName = '探索者';
  return {
    activeName: defaultName,
    profiles: {
      [defaultName]: createInitialProfile(defaultName),
    },
    mode: 'student',
    theme: 'space',
  };
}

export function createInitialProgress(): AppProgressState {
  return {
    sectors: createEmptySectorsRecord(),
    totalScore: 0,
    mode: 'student',
  };
}

export const LEGACY_STORAGE_KEY = 'math_voyager_8sectors_v2';
export const STORAGE_KEY_V3 = 'math_voyager_8sectors_v3';
export const STORAGE_KEY_V4 = 'math_voyager_8sectors_v4';
export const STORAGE_KEY_V5 = 'math_voyager_8sectors_v5';
export const CUSTOM_QUESTIONS_STORAGE_KEY = 'math_voyager_custom_questions_v1';
