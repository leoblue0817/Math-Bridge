import { useEffect, useState } from 'react';
import { Disc3, Music, Volume2, VolumeX } from 'lucide-react';
import { BGM_TRACK_LABELS, soundEngine } from '../utils/soundEngine';

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

  const handleCycleTrack = () => {
    soundEngine.unlockIfNeeded();
    soundEngine.cycleBgmTrack();
  };

  const trackLabel = BGM_TRACK_LABELS[audio.bgmTrack];

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        data-sfx="custom"
        onClick={handleToggleSfx}
        title={audio.sfxEnabled ? '切換為靜音模式（關閉互動音效）' : '開啟競技互動音效'}
        aria-pressed={audio.sfxEnabled}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${
          audio.sfxEnabled
            ? 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-cyan-500/45 dark:bg-cyan-500/15 dark:text-cyan-200 dark:hover:bg-cyan-500/25'
            : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200'
        }`}
      >
        {audio.sfxEnabled ? (
          <Volume2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <VolumeX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>{compact ? (audio.sfxEnabled ? '音效開' : '靜音中') : audio.sfxEnabled ? '音效開啟' : '靜音關閉'}</span>
      </button>

      <button
        type="button"
        onClick={handleToggleBgm}
        title={audio.bgmEnabled ? '靜音背景配樂' : '開啟背景配樂'}
        aria-pressed={audio.bgmEnabled}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${
          audio.bgmEnabled
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
        }`}
      >
        <Music className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{audio.bgmEnabled ? '配樂開' : '配樂靜音'}</span>
      </button>

      <button
        type="button"
        onClick={handleCycleTrack}
        title="點按輪流切換 3 套背景配樂風格（史詩管弦 / 霓虹競技 / 星雲探索）"
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-violet-300 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-400/45 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25"
      >
        <Disc3 className={`h-3.5 w-3.5 shrink-0 ${audio.bgmEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} aria-hidden="true" />
        <span>{trackLabel} ↻</span>
      </button>
    </div>
  );
}
