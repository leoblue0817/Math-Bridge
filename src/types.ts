export type SectorId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7' | 's8';

export type AppMode = 'student' | 'projector';

export type ThemeMode = 'light' | 'dark';

export type HomeViewMode = 'planet' | 'grid';

export type TerminalTab = 'slides' | 'warmup' | 'micro' | 'lab';

export interface SubLevelProgress {
  completed: boolean;
  bestScore: number;
  answers: Record<number, number>;
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
  subLevels: Record<string, SubLevelProgress>;
  wrongQuestions: number[];
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
    subLevels: {},
    wrongQuestions: [],
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
    theme: 'dark',
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
