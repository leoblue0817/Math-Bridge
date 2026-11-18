import { useMemo, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Check,
  Cloud,
  CloudUpload,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  LogIn,
  RefreshCw,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { SectorData } from '../data/sectors';
import { signInWithGoogle } from '../firebase';
import { CustomQuestionRecord, MultiProfileStore, SectorId } from '../types';
import {
  compressImageBlobToDataUrl,
  downloadExcelTemplate,
  exportQuestionsToExcel,
  parseExcelQuestionsFile,
  parseWordDocxFile,
} from '../utils/questionBankIO';
import { soundEngine } from '../utils/soundEngine';

interface ProgressManagerModalProps {
  store: MultiProfileStore;
  sectorsSource: SectorData[];
  customQuestions: CustomQuestionRecord[];
  cloudUser: FirebaseUser | null;
  cloudSyncing: boolean;
  lastCloudSyncAt: number | null;
  onSyncNowToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
  onImportCustomQuestions: (items: CustomQuestionRecord[]) => Promise<void>;
  onDeleteCustomQuestion: (questionId: string) => Promise<void>;
  onClose: () => void;
  onSwitchProfile: (name: string) => void;
  onClearSector: (scope: 'active' | 'all', sectorId: SectorId) => void;
  onClearAll: (scope: 'active' | 'all') => void;
  onImportBackup: (jsonText: string) => { ok: boolean; msg: string };
}

type ModalTab = 'progress' | 'questionBank';

export function ProgressManagerModal({
  store,
  sectorsSource,
  customQuestions,
  cloudUser,
  cloudSyncing,
  lastCloudSyncAt,
  onSyncNowToCloud,
  onPullFromCloud,
  onImportCustomQuestions,
  onDeleteCustomQuestion,
  onClose,
  onSwitchProfile,
  onClearSector,
  onClearAll,
  onImportBackup,
}: ProgressManagerModalProps) {
  const [modalTab, setModalTab] = useState<ModalTab>('progress');

  // Progress Tab State
  const [newName, setNewName] = useState('');
  const [clearScope, setClearScope] = useState<'active' | 'all'>('active');
  const [selectedSector, setSelectedSector] = useState<SectorId>('s1');
  const [confirmAction, setConfirmAction] = useState<'sector' | 'all' | null>(null);
  const [exportScope, setExportScope] = useState<'active' | 'all'>('active');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Question Bank Excel / Word Tab State
  const [qbExportScope, setQbExportScope] = useState<string>('all');
  const [targetSectorId, setTargetSectorId] = useState<SectorId>('s1');
  const [targetSubId, setTargetSubId] = useState<string>('s1-1');
  const [parsingBusy, setParsingBusy] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState<CustomQuestionRecord[]>([]);
  const [extractedImages, setExtractedImages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  const profileNames = Object.keys(store.profiles);

  const targetSectorObj = useMemo(
    () => sectorsSource.find((s) => s.id === targetSectorId) ?? sectorsSource[0],
    [sectorsSource, targetSectorId]
  );

  const buildBackupPayload = () => {
    if (exportScope === 'active') {
      return JSON.stringify(
        {
          version: 5,
          exportedAt: new Date().toISOString(),
          profiles: { [store.activeName]: store.profiles[store.activeName] },
        },
        null,
        2
      );
    }
    return JSON.stringify(
      {
        version: 5,
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

  const handleExportExcel = () => {
    soundEngine.playClick();
    const res = exportQuestionsToExcel(qbExportScope, sectorsSource);
    setStatusMsg({ ok: true, text: `已匯出 ${res.count} 題至 Excel：${res.filename}` });
  };

  const handleDownloadTemplate = () => {
    soundEngine.playClick();
    const fname = downloadExcelTemplate();
    setStatusMsg({ ok: true, text: `已下載標準匯入範本：${fname}` });
  };

  const handleQuestionBankFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsingBusy(true);
    setStatusMsg(null);
    setParseWarnings([]);

    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.docx')) {
        const res = await parseWordDocxFile(file, targetSectorId, targetSubId);
        setDraftQuestions(res.questions);
        setExtractedImages(res.extractedImages);
        setParseWarnings(res.warnings);
        if (res.questions.length > 0) {
          soundEngine.playMatchSuccess();
          setStatusMsg({
            ok: true,
            text: `已從 Word 解析 ${res.questions.length} 題與 ${res.extractedImages.length} 張嵌入圖片！請檢查下方預覽後點擊寫入題庫。`,
          });
        }
      } else {
        const res = await parseExcelQuestionsFile(file, targetSectorId, targetSubId);
        setDraftQuestions(res.questions);
        setExtractedImages([]);
        setParseWarnings(res.warnings);
        if (res.questions.length > 0) {
          soundEngine.playMatchSuccess();
          setStatusMsg({
            ok: true,
            text: `已從 Excel 解析 ${res.questions.length} 題！請檢查預覽後點擊寫入題庫。`,
          });
        }
      }
    } catch (err) {
      setStatusMsg({
        ok: false,
        text: `檔案解析失敗：${err instanceof Error ? err.message : '格式異常'}`,
      });
    } finally {
      setParsingBusy(false);
      e.target.value = '';
    }
  };

  const handleUploadImageForDraft = async (
    draftIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImageBlobToDataUrl(file, 640);
    if (dataUrl) {
      setDraftQuestions((prev) =>
        prev.map((q, idx) => (idx === draftIndex ? { ...q, imageUrl: dataUrl } : q))
      );
      soundEngine.playMatchSuccess();
    }
    e.target.value = '';
  };

  const handleCommitDraftQuestions = async () => {
    if (draftQuestions.length === 0) return;
    soundEngine.playClick();
    await onImportCustomQuestions(draftQuestions);
    soundEngine.playCelebrate();
    setStatusMsg({
      ok: true,
      text: `成功匯入 ${draftQuestions.length} 題至題庫${
        cloudUser ? '並已同步至雲端帳號（跨裝置即時可用）！' : '（已儲存在本機，登入 Google 即可跨裝置同步）'
      }`,
    });
    setDraftQuestions([]);
    setExtractedImages([]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="pb-safe max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-[#FAF7F2] p-4 text-slate-900 shadow-2xl sm:rounded-2xl sm:p-6 dark:border-slate-700 dark:bg-[#0D1424] dark:text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id="progress-modal-title" className="text-lg font-extrabold sm:text-xl">
              進度同步與題庫管理中心
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              學生檔案：<span className="font-semibold text-slate-900 dark:text-white">{store.activeName}</span>
              {' · '}支援跨裝置雲端設定同步 ＆ Excel／Word 圖文題庫批次擴充
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="關閉管理中心"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 sm:h-9 sm:w-9 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Top Modal Switch Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 sm:gap-2 dark:border-slate-800 dark:bg-[#080D1A]">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setModalTab('progress');
            }}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold ${
              modalTab === 'progress'
                ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            <Cloud className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">雲端 ＆ 學生進度</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setModalTab('questionBank');
            }}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold ${
              modalTab === 'questionBank'
                ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">圖文題庫（+{customQuestions.length}）</span>
          </button>
        </div>

        {statusMsg && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-xs font-semibold ${
              statusMsg.ok
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200'
                : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {modalTab === 'progress' ? (
          <div className="mt-5 space-y-5">
            {/* Cross-device Cloud Sync Card */}
            <section className="rounded-xl border border-sky-200 bg-sky-50/75 p-4 dark:border-cyan-500/35 dark:bg-cyan-500/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-sky-900 dark:text-cyan-200">
                    <Cloud className="h-4 w-4" aria-hidden="true" />
                    <span>跨裝置動態雲端資料庫同步</span>
                  </div>
                  <p className="mt-1 text-xs text-sky-800/85 dark:text-cyan-100/80">
                    {cloudUser
                      ? `已連線帳號：${cloudUser.displayName || cloudUser.email} · 換電腦或平板登入同一帳號即同步設定、進度與自訂題庫。`
                      : '登入 Google 帳號後，管理設定、學生進度與匯入的題庫都會自動跨裝置雲端同步！'}
                  </p>
                  {cloudUser && lastCloudSyncAt && (
                    <div className="mt-1 font-mono text-[11px] text-sky-700 dark:text-cyan-300">
                      最近雲端同步：{new Date(lastCloudSyncAt).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {cloudUser ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={cloudSyncing}
                      onClick={() => void onSyncNowToCloud()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50 dark:bg-cyan-500 dark:text-slate-950"
                    >
                      <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{cloudSyncing ? '同步中...' : '立即上傳同步'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={cloudSyncing}
                      onClick={() => void onPullFromCloud()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400 bg-white px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 dark:border-cyan-400/50 dark:bg-slate-900 dark:text-cyan-200"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>讀取雲端最新</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      void signInWithGoogle();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950"
                  >
                    <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>登入 Google 啟用雲端同步</span>
                  </button>
                )}
              </div>
            </section>

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
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                      store.activeName === name
                        ? 'border border-[#C2410C] bg-[#FFF7ED] text-[#C2410C] dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-200'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {name}（{store.profiles[name].totalScore} 分）
                  </button>
                ))}
              </div>

              <form onSubmit={handleAddOrSwitchName} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="輸入新同學名字（例：小明）"
                  className="min-h-[40px] flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>新增／切換</span>
                </button>
              </form>
            </section>

            {/* Clear Record */}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold">清除單一主題島</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      簡報、實戰演練、創意對戰與錯題紀錄都會歸零
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
                      {sectorsSource.map((sec) => (
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
              </div>
            </section>

            {/* JSON Backup & Import */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080D1A]">
              <h3 className="text-sm font-bold">進度備份與離線還原 (.json)</h3>

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
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{copied ? '已複製備份文字' : '複製備份文字'}</span>
                </button>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>選擇備份檔案 (.json)</span>
                  <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
                </label>

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={2}
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
                  匯入並還原 JSON
                </button>
              </div>
            </section>
          </div>
        ) : (
          /* Question Bank Tab: Excel Export/Import + Publisher Word (.docx) Image Parser */
          <div className="mt-5 space-y-5">
            {/* Section 1: Export all or specific unit/chapter to Excel (.xlsx) */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080D1A]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>匯出題庫為 Excel (.xlsx) 檔案</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  下載空白 Excel 範本
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                可一鍵匯出全部或指定特定單元／微關卡小節為 Excel 活頁簿，方便教研編輯或批次加題後再匯回系統。
              </p>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  aria-label="選擇匯出題庫範圍"
                  value={qbExportScope}
                  onChange={(e) => setQbExportScope(e.target.value)}
                  className="min-h-[40px] w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 sm:flex-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="all">全部八大主題題庫（含擴充題）</option>
                  {sectorsSource.map((sec) => (
                    <optgroup key={sec.id} label={sec.shortTitle}>
                      <option value={sec.id}>{sec.shortTitle}（整單元 {sec.quizzes.length} 題）</option>
                      {sec.subLessons.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          └ {sub.code} {sub.title}（{sub.questionIds.length} 題）
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>匯出 Excel (.xlsx)</span>
                </button>
              </div>
            </section>

            {/* Section 2: Import Excel (.xlsx) OR Publisher Word (.docx with embedded figures) */}
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080D1A]">
              <div className="flex items-center gap-2 text-sm font-bold">
                <FileText className="h-4 w-4 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
                <span>批次匯入出版社 Word (.docx 含圖) 或 Excel (.xlsx) 題庫</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                系統內建 Word 壓縮結構解析器：上傳出版社提供的 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.docx</code> 試卷時，會自動抓取題幹、選項 (A)–(D)、答案解析以及內嵌幾何／立體圖形並自動壓縮配對！
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    匯入目標單元（Word 預設歸屬）
                  </label>
                  <select
                    value={targetSectorId}
                    onChange={(e) => {
                      const nextId = e.target.value as SectorId;
                      setTargetSectorId(nextId);
                      const first = sectorsSource.find((s) => s.id === nextId)?.subLessons[0]?.id;
                      if (first) setTargetSubId(first);
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {sectorsSource.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.shortTitle} · {sec.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    匯入目標實戰演練分段
                  </label>
                  <select
                    value={targetSubId}
                    onChange={(e) => setTargetSubId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {targetSectorObj.subLessons.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} {sub.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>{parsingBusy ? '解析檔案中...' : '選擇 Word (.docx) 或 Excel (.xlsx) 檔案'}</span>
                  <input
                    type="file"
                    accept=".docx,.xlsx,.xls,.csv"
                    disabled={parsingBusy}
                    onChange={handleQuestionBankFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  提示：Word 請使用 1. / (A)(B)(C)(D) / 答案： 條列格式，並將公式與圖形存為 .docx
                </span>
              </div>

              {parseWarnings.length > 0 && (
                <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
                  {parseWarnings.map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                </div>
              )}

              {/* Preview Workbench for Parsed Questions & Extracted Images */}
              {draftQuestions.length > 0 && (
                <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-extrabold text-sky-700 dark:text-cyan-300">
                      匯入前圖文預覽校對（共 {draftQuestions.length} 題待寫入）
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftQuestions([]);
                          setExtractedImages([]);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                      >
                        清空預覽
                      </button>
                      <button
                        type="button"
                        onClick={handleCommitDraftQuestions}
                        className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950"
                      >
                        確認寫入題庫並同步雲端
                      </button>
                    </div>
                  </div>

                  {extractedImages.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="mb-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        已從 Word 提取 {extractedImages.length} 張圖片（若需手動綁定到某題，可於下方卡片點選）：
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {extractedImages.map((img, i) => (
                          <img
                            key={i}
                            src={img.dataUrl}
                            alt={img.name}
                            title={img.name}
                            className="h-14 w-14 rounded-lg border border-slate-300 bg-white object-contain p-0.5 dark:border-slate-700"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                    {draftQuestions.map((dq, idx) => (
                      <div
                        key={dq.id}
                        className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/60"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono font-bold text-sky-700 dark:text-cyan-300">
                            #{idx + 1} · {dq.subId} · 正解 {String.fromCharCode(65 + dq.ans)}
                          </span>
                          <div className="flex items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              <ImagePlus className="h-3 w-3" aria-hidden="true" />
                              <span>{dq.imageUrl ? '更換圖片' : '補貼圖片'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => void handleUploadImageForDraft(idx, e)}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftQuestions((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                              title="移除此題"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <div className="font-semibold text-slate-900 dark:text-white">{dq.q}</div>

                        {dq.imageUrl && (
                          <img
                            src={dq.imageUrl}
                            alt="解析圖片預覽"
                            className="max-h-28 rounded-lg border border-slate-200 bg-white object-contain p-1 dark:border-slate-700"
                          />
                        )}

                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          {dq.options.map((opt, oi) => (
                            <button
                              key={oi}
                              type="button"
                              onClick={() =>
                                setDraftQuestions((prev) =>
                                  prev.map((item, k) => (k === idx ? { ...item, ans: oi } : item))
                                )
                              }
                              className={`truncate rounded-md border px-2 py-1 text-left ${
                                dq.ans === oi
                                  ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                              }`}
                            >
                              ({String.fromCharCode(65 + oi)}) {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Section 3: Existing Custom Synced Questions List */}
            {customQuestions.length > 0 && (
              <section className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080D1A]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">已匯入的自訂／雲端擴充題目</h3>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    共 {customQuestions.length} 題
                  </span>
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {customQuestions.map((cq) => (
                    <div
                      key={cq.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-sky-700 dark:text-cyan-300">
                          <span>{cq.subId}</span>
                          <span>·</span>
                          <span>{cq.id}</span>
                          {cq.imageUrl && (
                            <span className="rounded bg-amber-100 px-1.5 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                              含圖
                            </span>
                          )}
                        </div>
                        <div className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {cq.q}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onDeleteCustomQuestion(cq.id)}
                        title="刪除此擴充題目"
                        className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-slate-800 dark:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
