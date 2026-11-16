import { createContext, useContext } from 'react';
import { ThemeMode } from '../types';

export const ThemeContext = createContext<ThemeMode>('light');

export function useThemeMode(): ThemeMode {
  return useContext(ThemeContext);
}
