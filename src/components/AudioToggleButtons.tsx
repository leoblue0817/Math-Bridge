import { useEffect, useState } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

export function AudioToggleButtons({ compact = false }: { compact?: boolean }) {
  const [audio, setAudio] = useState(() => soundEngine.getPrefs());

  useEffect(() => {
    return soundEngine.subscribe(() => {
      setAudio(soundEngine.getPrefs());
    });
  }, []);

  const handleToggleSfx = () => {
    soundEngine.unlockIfNeeded();
    soundEngine.toggleSfx();
  };

  const handleToggleBgm = () => {
    soundEngine.unlockIfNeeded();
    soundEngine.toggleBgm();
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleToggleSfx}
        title={audio.sfxEnabled ? '關閉星際互動音效' : '開啟星際互動音效'}
        aria-pressed={audio.sfxEnabled}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          audio.sfxEnabled
            ? 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-cyan-500/45 dark:bg-cyan-500/15 dark:text-cyan-200 dark:hover:bg-cyan-500/25'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
        }`}
      >
        {audio.sfxEnabled ? (
          <Volume2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <VolumeX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>{compact ? (audio.sfxEnabled ? '音效開' : '靜音') : audio.sfxEnabled ? '音效開啟' : '音效關閉'}</span>
      </button>

      <button
        type="button"
        onClick={handleToggleBgm}
        title={audio.bgmEnabled ? '關閉宇宙背景合成樂' : '開啟宇宙背景合成樂'}
        aria-pressed={audio.bgmEnabled}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          audio.bgmEnabled
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
        }`}
      >
        <Music className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{compact ? (audio.bgmEnabled ? '音樂開' : '音樂關') : audio.bgmEnabled ? '太空音樂開' : '太空音樂關'}</span>
      </button>
    </div>
  );
}
