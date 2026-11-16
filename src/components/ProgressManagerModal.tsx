import { useState } from 'react';
import { Check, Copy, Download, Trash2, Upload, UserPlus, X } from 'lucide-react';
import { SECTORS } from '../data/sectors';
import { MultiProfileStore, SectorId } from '../types';

interface ProgressManagerModalProps {
  store: MultiProfileStore;
  onClose: () => void;
  onSwitchProfile: (name: string) => void;
  onClearSector: (scope: 'active' | 'all', sectorId: SectorId) => void;
  onClearAll: (scope: 'active' | 'all') => void;
  onImportBackup: (jsonText: string) => { ok: boolean; msg: string };
}

export function ProgressManagerModal({
  store,
  onClose,
  onSwitchProfile,
  onClearSector,
  onClearAll,
  onImportBackup,
}: ProgressManagerModalProps) {
  const [newName, setNewName] = useState('');
  const [clearScope, setClearScope] = useState<'active' | 'all'>('active');
  const [selectedSector, setSelectedSector] = useState<SectorId>('s1');
  const [confirmAction, setConfirmAction] = useState<'sector' | 'all' | null>(null);

  const [exportScope, setExportScope] = useState<'active' | 'all'>('active');
  const [copied, setCopied] = useState(false);

  const [importText, setImportText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const profileNames = Object.keys(store.profiles);

  const buildBackupPayload = () => {
    if (exportScope === 'active') {
      return JSON.stringify(
        {
          version: 4,
          exportedAt: new Date().toISOString(),
          profiles: { [store.activeName]: store.profiles[store.activeName] },
        },
        null,
        2
      );
    }
    return JSON.stringify(
      {
        version: 4,
        exportedAt: new Date().toISOString(),
        profiles: store.profiles,
      },
      null,
      2
    );
  };

  const handleDownloadBackup = () => {
    const dataStr = buildBackupPayload();
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename =
      exportScope === 'active'
        ? `math-planet-backup-${store.activeName}.json`
        : 'math-planet-backup-all.json';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMsg({ ok: true, text: `已下載備份檔案：${filename}` });
  };

  const handleCopyBackup = async () => {
    try {
      await navigator.clipboard.writeText(buildBackupPayload());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatusMsg({ ok: false, text: '無法自動複製，請改用「下載備份檔」。' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setImportText(content);
      const res = onImportBackup(content);
      setStatusMsg({ ok: res.ok, text: res.msg });
    };
    reader.readAsText(file);
  };

  const handleAddOrSwitchName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onSwitchProfile(trimmed);
    setNewName('');
    setStatusMsg({ ok: true, text: `已切換至學生檔案「${trimmed}」！` });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-[#FAF7F2] p-6 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#0D1424] dark:text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 id="progress-modal-title" className="text-xl font-bold">
              進度管理
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              目前的名字：<span className="font-semibold text-slate-900 dark:text-white">{store.activeName}</span>
              。進度依名字分開紀錄。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉進度管理"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Student Profile Switcher */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="text-sm font-bold">學生名字檔案切換</div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {profileNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onSwitchProfile(name);
                    setStatusMsg({ ok: true, text: `已切換至「${name}」的學習進度` });
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    store.activeName === name
                      ? 'border border-[#C2410C] bg-[#FFF7ED] text-[#C2410C] dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-200'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {name}（{store.profiles[name].totalScore} 分）
                </button>
              ))}
            </div>

            <form onSubmit={handleAddOrSwitchName} className="mt-3 flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="輸入新同學名字（例：小明）"
                className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>新增／切換</span>
              </button>
            </form>
          </section>

          {/* 清除紀錄 (Matches screenshot 2) */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080D1A]">
            <h3 className="text-sm font-bold">清除紀錄</h3>

            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setClearScope('active');
                  setConfirmAction(null);
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  clearScope === 'active'
                    ? 'border-[#C2410C] bg-[#FFF7ED] text-[#C2410C] dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-200'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full border border-current bg-current" />
                <span>只有「{store.activeName}」</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setClearScope('all');
                  setConfirmAction(null);
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  clearScope === 'all'
                    ? 'border-[#C2410C] bg-[#FFF7ED] text-[#C2410C] dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-200'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full border border-current" />
                <span>這台裝置上所有名字</span>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* 清除單一主題島 */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold">清除單一主題島</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    簡報、熱身、小節微關卡、創意與錯題紀錄都會歸零
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="選擇要清除的主題"
                    value={selectedSector}
                    onChange={(e) => {
                      setSelectedSector(e.target.value as SectorId);
                      setConfirmAction(null);
                    }}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {SECTORS.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.shortTitle}
                      </option>
                    ))}
                  </select>
                  {confirmAction === 'sector' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClearSector(clearScope, selectedSector);
                        setConfirmAction(null);
                        setStatusMsg({ ok: true, text: '已清除指定主題島嶼進度。' });
                      }}
                      className="rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                    >
                      確認清除
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmAction('sector')}
                      className="rounded-full border border-rose-400 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/15"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>

              {/* 清除全部進度 */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold">清除全部進度</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    八座主題島嶼的所有紀錄與對戰積分
                  </div>
                </div>
                {confirmAction === 'all' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClearAll(clearScope);
                      setConfirmAction(null);
                      setStatusMsg({ ok: true, text: '已清除全部進度紀錄。' });
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    <span>確認全部歸零</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmAction('all')}
                    className="rounded-full border border-rose-400 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/15"
                  >
                    清除
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                清除後無法復原，建議先在下方備份。
              </p>
            </div>
          </section>

          {/* 備份與匯出 */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080D1A]">
            <h3 className="text-sm font-bold">備份與匯出</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              把紀錄存成檔案或備份文字，換裝置、換瀏覽器時可以匯入還原。
            </p>

            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setExportScope('active')}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  exportScope === 'active'
                    ? 'border-[#C2410C] bg-[#FFF7ED] text-[#C2410C] dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-200'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                只有「{store.activeName}」
              </button>
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  exportScope === 'all'
                    ? 'border-[#C2410C] bg-[#FFF7ED] text-[#C2410C] dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-200'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                所有名字
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#9A3412] dark:bg-cyan-500 dark:text-slate-950"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>下載備份檔</span>
              </button>
              <button
                type="button"
                onClick={handleCopyBackup}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                <span>{copied ? '已複製備份文字' : '複製備份文字'}</span>
              </button>
            </div>
          </section>

          {/* 匯入 / 還原 */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080D1A]">
            <h3 className="text-sm font-bold">匯入 / 還原</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              選擇備份檔，或把備份文字貼在下面。同一個名字、同一座島的紀錄會被覆蓋。
            </p>

            <div className="mt-3 space-y-2.5">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>選擇備份檔案 (.json)</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={3}
                placeholder="或將複製的備份 JSON 文字貼在這裡…"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />

              <button
                type="button"
                disabled={!importText.trim()}
                onClick={() => {
                  const res = onImportBackup(importText);
                  setStatusMsg({ ok: res.ok, text: res.msg });
                }}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-cyan-500 dark:text-slate-950"
              >
                匯入並還原
              </button>
            </div>
          </section>

          {statusMsg && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
                statusMsg.ok
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                  : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200'
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
