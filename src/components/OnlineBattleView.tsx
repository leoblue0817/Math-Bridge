import { useEffect, useMemo, useRef, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Check,
  Clock,
  Copy,
  Crown,
  LogIn,
  LogOut,
  Plus,
  Rocket,
  ShieldAlert,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import {
  SECTORS,
  findQuestionById,
  sampleBattleQuestionIds,
} from '../data/sectors';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  signInWithGoogle,
  signOutUser,
} from '../firebase';
import { ProfileRecord, SectorId } from '../types';
import { soundEngine } from '../utils/soundEngine';
import { AudioToggleButtons } from './AudioToggleButtons';
import { MathDiagram } from './MathDiagrams';

interface BattleRoomDoc {
  roomCode: string;
  hostUid: string;
  hostName: string;
  guestUid: string;
  guestName: string;
  sectorScope: 'all' | SectorId;
  questionIds: string[];
  questionSeconds: number;
  status: 'waiting' | 'playing' | 'finished';
  currentIndex: number;
  hostScore: number;
  guestScore: number;
  hostAnsweredCount: number;
  guestAnsweredCount: number;
  hostCorrectCount: number;
  guestCorrectCount: number;
  hostLastCorrect: boolean;
  guestLastCorrect: boolean;
  winnerUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

interface OnlineBattleViewProps {
  profile: ProfileRecord;
  onClaimBattleBonus: (roomCode: string, bonusScore: number, isWinner: boolean) => void;
  onBackToHome: () => void;
}

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function safeDisplayName(raw: string | null | undefined, fallback: string): string {
  const cleaned = (raw ?? '').trim().slice(0, 28);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function OnlineBattleView({
  profile,
  onClaimBattleBonus,
  onBackToHome,
}: OnlineBattleViewProps) {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Lobby config state
  const [nickname, setNickname] = useState(() => safeDisplayName(profile.name, '星際戰士'));
  const [sectorScope, setSectorScope] = useState<'all' | SectorId>('all');
  const [questionCount, setQuestionCount] = useState<5 | 8>(5);
  const [questionSeconds, setQuestionSeconds] = useState<15 | 20 | 30>(20);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Active room & user's room history
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<BattleRoomDoc | null>(null);
  const [hostRooms, setHostRooms] = useState<BattleRoomDoc[]>([]);
  const [guestRooms, setGuestRooms] = useState<BattleRoomDoc[]>([]);

  // Per-round gameplay UI state
  const [roundSecondsLeft, setRoundSecondsLeft] = useState(20);
  const [localPickedOpt, setLocalPickedOpt] = useState<number | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const lastIndexRef = useRef<number>(-1);
  const rewardTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    setNickname((prev) => prev || safeDisplayName(profile.name, '星際戰士'));
  }, [profile.name]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u?.displayName) {
        setNickname((prev) =>
          prev === '星際領航員' || !prev.trim() ? safeDisplayName(u.displayName, '星際戰士') : prev
        );
      }
    });
    return () => unsub();
  }, []);

  // Listen to my hosted & joined battle rooms
  useEffect(() => {
    if (!user) {
      setHostRooms([]);
      setGuestRooms([]);
      return;
    }

    const qHost = query(collection(db, 'battleRooms'), where('hostUid', '==', user.uid));
    const qGuest = query(collection(db, 'battleRooms'), where('guestUid', '==', user.uid));

    const unsubHost = onSnapshot(
      qHost,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as BattleRoomDoc);
        setHostRooms(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'battleRooms')
    );

    const unsubGuest = onSnapshot(
      qGuest,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as BattleRoomDoc);
        setGuestRooms(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'battleRooms')
    );

    return () => {
      unsubHost();
      unsubGuest();
    };
  }, [user]);

  const myRooms = useMemo(() => {
    const map = new Map<string, BattleRoomDoc>();
    [...hostRooms, ...guestRooms].forEach((r) => map.set(r.roomCode, r));
    return Array.from(map.values()).sort((a, b) => {
      const ta = a.updatedAt?.toMillis?.() ?? 0;
      const tb = b.updatedAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
  }, [hostRooms, guestRooms]);

  // Subscribe to the currently active battle room
  useEffect(() => {
    if (!activeRoomCode || !user) {
      setRoom(null);
      return;
    }

    const roomRef = doc(db, 'battleRooms', activeRoomCode);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          setRoom(null);
          setActiveRoomCode(null);
          return;
        }
        setRoom(snap.data() as BattleRoomDoc);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `battleRooms/${activeRoomCode}`)
    );

    return () => unsub();
  }, [activeRoomCode, user]);

  const isHost = Boolean(user && room && room.hostUid === user.uid);
  const isGuest = Boolean(user && room && room.guestUid === user.uid);

  // Reset local round state when question index changes
  useEffect(() => {
    if (!room) {
      lastIndexRef.current = -1;
      setLocalPickedOpt(null);
      return;
    }
    if (room.status === 'playing' && lastIndexRef.current !== room.currentIndex) {
      lastIndexRef.current = room.currentIndex;
      setLocalPickedOpt(null);
      setRoundSecondsLeft(room.questionSeconds);
    }
  }, [room?.status, room?.currentIndex, room?.questionSeconds]);

  // Countdown tick per round during active play
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    const timer = setInterval(() => {
      setRoundSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next > 0 && next <= 5) {
          soundEngine.playBattleTick();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [room?.status, room?.currentIndex]);

  const myAnsweredCount = room
    ? isHost
      ? room.hostAnsweredCount
      : room.guestAnsweredCount
    : 0;
  const oppAnsweredCount = room
    ? isHost
      ? room.guestAnsweredCount
      : room.hostAnsweredCount
    : 0;

  const hasAnsweredThisRound = room ? myAnsweredCount > room.currentIndex : false;
  const bothAnsweredThisRound = room
    ? room.hostAnsweredCount > room.currentIndex && room.guestAnsweredCount > room.currentIndex
    : false;

  const currentQuestionEntry = useMemo(() => {
    if (!room) return null;
    const qId = room.questionIds[room.currentIndex];
    return qId ? findQuestionById(qId) : null;
  }, [room?.questionIds, room?.currentIndex]);

  const submitAnswer = async (optIdx: number) => {
    if (!room || !user || !currentQuestionEntry) return;
    if (room.status !== 'playing') return;
    if (hasAnsweredThisRound || submittingAnswer) return;

    setSubmittingAnswer(true);
    setLocalPickedOpt(optIdx);
    const isCorrect = optIdx >= 0 && optIdx === currentQuestionEntry.quiz.ans;
    const speedBonus = Math.min(20, Math.max(0, Math.round((roundSecondsLeft / room.questionSeconds) * 20)));
    const gained = isCorrect ? 30 + speedBonus : 0;

    if (isCorrect) {
      soundEngine.playCorrect(2);
    } else {
      soundEngine.playWrong();
    }

    const roomRef = doc(db, 'battleRooms', room.roomCode);
    try {
      if (isHost) {
        await updateDoc(roomRef, {
          hostScore: room.hostScore + gained,
          hostAnsweredCount: room.hostAnsweredCount + 1,
          hostCorrectCount: room.hostCorrectCount + (isCorrect ? 1 : 0),
          hostLastCorrect: isCorrect,
          updatedAt: serverTimestamp(),
        });
      } else if (isGuest) {
        await updateDoc(roomRef, {
          guestScore: room.guestScore + gained,
          guestAnsweredCount: room.guestAnsweredCount + 1,
          guestCorrectCount: room.guestCorrectCount + (isCorrect ? 1 : 0),
          guestLastCorrect: isCorrect,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `battleRooms/${room.roomCode}`);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Auto-submit timeout (0 pts) if timer hits 0 and player hasn't answered
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    if (roundSecondsLeft === 0 && !hasAnsweredThisRound && !submittingAnswer) {
      void submitAnswer(-1);
    }
  }, [roundSecondsLeft, room?.status, hasAnsweredThisRound, submittingAnswer]);

  // Host automatically advances round 1.8s after both players answer (or after timer expires + 2s grace)
  useEffect(() => {
    if (!room || !isHost || room.status !== 'playing') return;
    const canAdvance = bothAnsweredThisRound || (roundSecondsLeft === 0 && hasAnsweredThisRound);
    if (!canAdvance) return;

    const delayMs = bothAnsweredThisRound ? 1800 : 2500;
    const timer = setTimeout(async () => {
      const roomRef = doc(db, 'battleRooms', room.roomCode);
      const isLast = room.currentIndex + 1 >= room.questionIds.length;
      try {
        if (isLast) {
          const winnerUid =
            room.hostScore > room.guestScore
              ? room.hostUid
              : room.guestScore > room.hostScore
              ? room.guestUid
              : 'draw';
          await updateDoc(roomRef, {
            currentIndex: room.currentIndex,
            status: 'finished',
            winnerUid,
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(roomRef, {
            currentIndex: room.currentIndex + 1,
            status: 'playing',
            winnerUid: '',
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `battleRooms/${room.roomCode}`);
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [
    room?.roomCode,
    room?.status,
    room?.currentIndex,
    room?.hostScore,
    room?.guestScore,
    isHost,
    bothAnsweredThisRound,
    roundSecondsLeft,
    hasAnsweredThisRound,
  ]);

  // Claim local profile bonus & play victory audio once match finishes
  useEffect(() => {
    if (!room || !user || room.status !== 'finished') return;
    if (rewardTriggeredRef.current === room.roomCode) return;
    rewardTriggeredRef.current = room.roomCode;

    const won = room.winnerUid === user.uid;
    const drew = room.winnerUid === 'draw';
    const bonus = won ? 60 : drew ? 40 : 25;
    soundEngine.playBattleVictory();
    onClaimBattleBonus(room.roomCode, bonus, won);
  }, [room?.status, room?.roomCode, room?.winnerUid, user?.uid, onClaimBattleBonus]);

  const handleGoogleLogin = async () => {
    soundEngine.unlockIfNeeded();
    soundEngine.playClick();
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('unauthorized-domain')) {
        setAuthError(
          '此網域尚未加入 Firebase 授權網域！請至 Firebase Console → Authentication → Settings → Authorized domains 新增此網站網域（例如 leoblue0817.github.io）。'
        );
      } else if (msg.includes('popup-closed-by-user')) {
        setAuthError('你已取消 Google 登入視窗，需要登入帳號才能進行跨裝置連線對戰喔！');
      } else {
        setAuthError(`Google 登入失敗：${msg}`);
      }
    }
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    soundEngine.unlockIfNeeded();
    soundEngine.playClick();
    setActionError(null);
    setActionBusy(true);

    try {
      const code = generateRoomCode();
      const qIds = sampleBattleQuestionIds(sectorScope, questionCount);
      if (qIds.length < 3) {
        setActionError('題庫不足 3 題，無法開房。');
        return;
      }

      const payload: Omit<BattleRoomDoc, 'createdAt' | 'updatedAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>;
        updatedAt: ReturnType<typeof serverTimestamp>;
      } = {
        roomCode: code,
        hostUid: user.uid,
        hostName: safeDisplayName(nickname, safeDisplayName(user.displayName, '星際隊長')),
        guestUid: '',
        guestName: '',
        sectorScope,
        questionIds: qIds,
        questionSeconds,
        status: 'waiting',
        currentIndex: 0,
        hostScore: 0,
        guestScore: 0,
        hostAnsweredCount: 0,
        guestAnsweredCount: 0,
        hostCorrectCount: 0,
        guestCorrectCount: 0,
        hostLastCorrect: false,
        guestLastCorrect: false,
        winnerUid: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'battleRooms', code), payload);
      soundEngine.playWarp();
      setActiveRoomCode(code);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'battleRooms');
    } finally {
      setActionBusy(false);
    }
  };

  const handleJoinRoom = async (targetCode?: string) => {
    if (!user) return;
    soundEngine.unlockIfNeeded();
    soundEngine.playClick();
    const cleanCode = (targetCode ?? joinCodeInput).trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(cleanCode)) {
      setActionError('請輸入正確的 6 碼房間代碼（英文字母大寫與數字 2–9）。');
      return;
    }

    setActionError(null);
    setActionBusy(true);
    try {
      const roomRef = doc(db, 'battleRooms', cleanCode);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        setActionError(`找不到房號 ${cleanCode}，請確認代碼是否輸入正確！`);
        return;
      }
      const existing = snap.data() as BattleRoomDoc;

      // Re-enter existing room if user is already Host or Guest
      if (existing.hostUid === user.uid || existing.guestUid === user.uid) {
        soundEngine.playWarp();
        setActiveRoomCode(cleanCode);
        return;
      }

      if (existing.status !== 'waiting' || existing.guestUid !== '') {
        setActionError('這間對戰艙已經開戰或客滿了，請另輸入其他房號或自己開新房間！');
        return;
      }

      await updateDoc(roomRef, {
        guestUid: user.uid,
        guestName: safeDisplayName(nickname, safeDisplayName(user.displayName, '星際挑戰者')),
        status: 'playing',
        updatedAt: serverTimestamp(),
      });
      soundEngine.playWarp();
      setActiveRoomCode(cleanCode);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `battleRooms/${cleanCode}`);
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancelWaitingRoom = async (roomCode: string) => {
    soundEngine.playClick();
    try {
      await deleteDoc(doc(db, 'battleRooms', roomCode));
      if (activeRoomCode === roomCode) {
        setActiveRoomCode(null);
        setRoom(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `battleRooms/${roomCode}`);
    }
  };

  const handleCopyCode = async (code: string) => {
    soundEngine.playClick();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Ignore clipboard fallback error
    }
  };

  const scopeLabel = (scope: 'all' | SectorId) => {
    if (scope === 'all') return '八大主題綜合賽';
    return SECTORS.find((s) => s.id === scope)?.shortTitle ?? scope;
  };

  // --- UI Render ---
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 pt-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-[#0D1424]/95 dark:shadow-none">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
            <Swords className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-cyan-400">
              <span>跨裝置即時連線競技場</span>
              <span aria-hidden="true">·</span>
              <span>八大主題限時搶答積分賽</span>
            </div>
            <h1 className="mt-0.5 text-xl font-extrabold text-slate-900 md:text-2xl dark:text-white">
              星際線上搶答對戰艙
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <AudioToggleButtons compact />

          {user && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/70 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
              <span className="truncate max-w-[120px]">{user.displayName || 'Google 選手'}</span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveRoomCode(null);
                  setRoom(null);
                  void signOutUser();
                }}
                title="登出 Google 帳號"
                className="text-emerald-700 hover:text-rose-600 dark:text-emerald-300 dark:hover:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onBackToHome();
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            返回星圖首頁
          </button>
        </div>
      </div>

      {/* Auth Gate */}
      {authLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-10 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-[#0D1424] dark:text-slate-300">
          正在連線至星際對戰伺服器...
        </div>
      ) : !user ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white/95 p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-50 text-sky-600 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-300">
            <Users className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            請先登入 Google 帳號以啟動即時對戰
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            登入後即可建立 6 碼跨裝置對戰房號，邀請同學用另一台平板、手機或電腦同步搶答 PK！獲勝可獲得 +60 分探索積分與解鎖太空成就徽章。
          </p>

          {authError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-left text-xs text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>使用 Google 帳號快速登入</span>
          </button>
        </div>
      ) : !room ? (
        /* Lobby: Create or Join Room */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Create Battle Room */}
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm lg:col-span-7 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Plus className="h-4 w-4 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
              <span>建立對戰房間（當房主）</span>
            </div>

            {actionError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200">
                {actionError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  對戰顯示暱稱
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="輸入你想在對戰榜顯示的名稱"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-[#080D1A] dark:text-white dark:focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  出題星域範圍
                </label>
                <select
                  value={sectorScope}
                  onChange={(e) => setSectorScope(e.target.value as 'all' | SectorId)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-[#080D1A] dark:text-white dark:focus:border-cyan-400"
                >
                  <option value="all">全星系八大主題綜合搶答賽（110 題隨機抽題）</option>
                  {SECTORS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortTitle} · {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    回合題數
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {([5, 8] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setQuestionCount(cnt);
                        }}
                        className={`rounded-xl border py-2 text-xs font-bold transition-colors ${
                          questionCount === cnt
                            ? 'border-sky-500 bg-sky-600 text-white dark:border-cyan-400 dark:bg-cyan-500 dark:text-slate-950'
                            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-[#080D1A] dark:text-slate-300'
                        }`}
                      >
                        {cnt} 題對決
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    每題限時
                  </span>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {([15, 20, 30] as const).map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setQuestionSeconds(sec);
                        }}
                        className={`rounded-xl border py-2 font-mono text-xs font-bold tabular-nums transition-colors ${
                          questionSeconds === sec
                            ? 'border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-slate-950'
                            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-[#080D1A] dark:text-slate-300'
                        }`}
                      >
                        {sec}秒
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={actionBusy}
                onClick={handleCreateRoom}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                <Rocket className="h-4 w-4" aria-hidden="true" />
                <span>建立即時對戰房間</span>
              </button>
            </div>
          </section>

          {/* Right: Join Room & Active Rooms */}
          <div className="space-y-6 lg:col-span-5">
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                輸入 6 碼房號加入對戰
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                請向建立房間的同學詢問 6 碼房號（不可加入自己建立的房間）。
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="例：K9M4X2"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-base font-bold uppercase tracking-widest text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-[#080D1A] dark:text-white dark:focus:border-amber-400"
                />
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleJoinRoom()}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                >
                  加入對戰
                </button>
              </div>
            </section>

            {/* Recent / Active Rooms */}
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  我的近期對戰紀錄
                </h2>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {myRooms.length} 場
                </span>
              </div>

              {myRooms.length === 0 ? (
                <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-400">
                  尚未有對戰房間，快建立一間或輸入同學的房號開戰吧！
                </p>
              ) : (
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {myRooms.slice(0, 6).map((r) => (
                    <div
                      key={r.roomCode}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-[#080D1A]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-700 dark:text-cyan-300">
                            {r.roomCode}
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                            {scopeLabel(r.sectorScope)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {r.status === 'waiting'
                            ? '等待對手加入中...'
                            : r.status === 'playing'
                            ? `對戰進行中（${r.hostScore} : ${r.guestScore}）`
                            : `已結束（${r.hostName} ${r.hostScore} vs ${r.guestScore} ${r.guestName || '對手'}）`}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {r.status === 'waiting' && r.hostUid === user.uid && (
                          <button
                            type="button"
                            onClick={() => handleCancelWaitingRoom(r.roomCode)}
                            title="取消房間"
                            className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setActiveRoomCode(r.roomCode);
                          }}
                          className="rounded-lg bg-sky-600 px-2.5 py-1.5 font-semibold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950"
                        >
                          進入
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : room.status === 'waiting' ? (
        /* Waiting Room */
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white/95 p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
          <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            {scopeLabel(room.sectorScope)} · {room.questionIds.length} 題 · 每題 {room.questionSeconds} 秒
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            等待對手輸入房號加入...
          </h2>

          <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-3 rounded-2xl border border-cyan-500/40 bg-slate-900 px-6 py-4 dark:bg-[#080D1A]">
            <span className="font-mono text-3xl font-extrabold tracking-[0.22em] text-cyan-300">
              {room.roomCode}
            </span>
            <button
              type="button"
              onClick={() => handleCopyCode(room.roomCode)}
              title="複製 6 碼房號"
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-cyan-400"
            >
              {copiedCode ? (
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            請將上方 6 碼房號傳給另一台裝置的同學，一旦對方加入，對戰會立即同步倒數開始！
          </p>

          <div className="mt-6 flex justify-center gap-3">
            {isHost && (
              <button
                type="button"
                onClick={() => handleCancelWaitingRoom(room.roomCode)}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200"
              >
                解散房間並返回
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveRoomCode(null);
                setRoom(null);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              返回大廳
            </button>
          </div>
        </div>
      ) : room.status === 'finished' ? (
        /* Victory / Podium Screen */
        (() => {
          const iWon = room.winnerUid === user.uid;
          const isDraw = room.winnerUid === 'draw';
          const bonusAwarded = iWon ? 60 : isDraw ? 40 : 25;

          return (
            <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white/95 p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/50 bg-amber-50 text-amber-500 dark:bg-amber-400/15 dark:text-amber-300">
                {iWon ? (
                  <Crown className="h-8 w-8" aria-hidden="true" />
                ) : (
                  <Trophy className="h-8 w-8" aria-hidden="true" />
                )}
              </div>

              <h2 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
                {iWon ? '星際搶答勝利！' : isDraw ? '旗鼓相當平手！' : '精彩對決結算！'}
              </h2>
              <p className="mt-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                已結算 +{bonusAwarded} 分探索積分至學生檔案「{profile.name}」
              </p>

              {/* Scoreboard Comparison */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div
                  className={`rounded-2xl border p-4 ${
                    room.winnerUid === room.hostUid
                      ? 'border-amber-400 bg-amber-50/70 dark:border-amber-400/60 dark:bg-amber-400/10'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#080D1A]'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    房主 {isHost ? '（你）' : ''}
                  </div>
                  <div className="mt-1 truncate text-base font-bold text-slate-900 dark:text-white">
                    {room.hostName}
                  </div>
                  <div className="mt-2 font-mono text-3xl font-extrabold text-sky-700 tabular-nums dark:text-cyan-300">
                    {room.hostScore}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                    答對 {room.hostCorrectCount} / {room.questionIds.length} 題
                  </div>
                </div>

                <div
                  className={`rounded-2xl border p-4 ${
                    room.winnerUid === room.guestUid
                      ? 'border-amber-400 bg-amber-50/70 dark:border-amber-400/60 dark:bg-amber-400/10'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#080D1A]'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    挑戰者 {isGuest ? '（你）' : ''}
                  </div>
                  <div className="mt-1 truncate text-base font-bold text-slate-900 dark:text-white">
                    {room.guestName}
                  </div>
                  <div className="mt-2 font-mono text-3xl font-extrabold text-amber-600 tabular-nums dark:text-amber-300">
                    {room.guestScore}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                    答對 {room.guestCorrectCount} / {room.questionIds.length} 題
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveRoomCode(null);
                    setRoom(null);
                  }}
                  className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                >
                  再戰一場（返回大廳）
                </button>
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  回到太陽系首頁
                </button>
              </div>
            </div>
          );
        })()
      ) : (
        /* Live Arena HUD */
        <div className="space-y-5">
          {/* Dual Scoreboard & Countdown Strip */}
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm md:grid-cols-12 md:items-center dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
            {/* Host Card */}
            <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 md:col-span-4 dark:border-cyan-500/35 dark:bg-cyan-500/10">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-sky-700 dark:text-cyan-300">
                  房主 {isHost ? '（你）' : ''}
                </div>
                <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {room.hostName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {room.hostAnsweredCount > room.currentIndex ? '本題已作答 ✓' : '思考作答中...'}
                </div>
              </div>
              <div className="font-mono text-2xl font-extrabold text-sky-700 tabular-nums dark:text-cyan-300">
                {room.hostScore}
              </div>
            </div>

            {/* Center Round & Timer */}
            <div className="flex flex-col items-center justify-center py-1 text-center md:col-span-4">
              <div className="font-mono text-xs font-bold text-slate-500 tabular-nums dark:text-slate-400">
                第 {room.currentIndex + 1} / {room.questionIds.length} 回合 · 房號 {room.roomCode}
              </div>
              <div
                className={`mt-1 inline-flex items-center gap-1.5 rounded-xl border px-4 py-1.5 font-mono text-xl font-extrabold tabular-nums ${
                  roundSecondsLeft <= 5
                    ? 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/20 dark:text-rose-200'
                    : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200'
                }`}
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>{roundSecondsLeft}s</span>
              </div>
            </div>

            {/* Guest Card */}
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 md:col-span-4 dark:border-amber-400/35 dark:bg-amber-400/10">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  挑戰者 {isGuest ? '（你）' : ''}
                </div>
                <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {room.guestName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {room.guestAnsweredCount > room.currentIndex ? '本題已作答 ✓' : '思考作答中...'}
                </div>
              </div>
              <div className="font-mono text-2xl font-extrabold text-amber-600 tabular-nums dark:text-amber-300">
                {room.guestScore}
              </div>
            </div>
          </div>

          {/* Active Question Card */}
          {currentQuestionEntry && (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono font-bold text-sky-700 dark:text-cyan-400">
                  {currentQuestionEntry.sector.code} · {currentQuestionEntry.sector.shortTitle}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>答對基礎 30 分 + 搶答速度加成最高 20 分！</span>
                </span>
              </div>

              <h2 className="text-lg font-bold leading-relaxed text-slate-900 md:text-xl dark:text-white">
                {currentQuestionEntry.quiz.q}
              </h2>

              {currentQuestionEntry.quiz.diagramId && (
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 dark:border-slate-800 dark:bg-[#080D1A]">
                  <MathDiagram id={currentQuestionEntry.quiz.diagramId} />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {currentQuestionEntry.quiz.options.map((opt, idx) => {
                  const isCorrectOpt = idx === currentQuestionEntry.quiz.ans;
                  const isChosen = localPickedOpt === idx;

                  let cls =
                    'border-slate-200 bg-slate-50 text-slate-800 hover:border-sky-400 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-100 dark:hover:border-cyan-400';
                  if (hasAnsweredThisRound) {
                    if (isCorrectOpt) {
                      cls =
                        'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-100';
                    } else if (isChosen) {
                      cls =
                        'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-400 dark:bg-rose-500/20 dark:text-rose-100';
                    } else {
                      cls =
                        'border-slate-200 bg-slate-50/60 text-slate-400 dark:border-slate-800/60 dark:bg-[#080D1A]/60 dark:text-slate-500';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={hasAnsweredThisRound || submittingAnswer}
                      onClick={() => submitAnswer(idx)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-colors ${cls}`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/25 font-mono text-xs font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {hasAnsweredThisRound && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-[#080D1A]">
                  <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                    <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                    <span>
                      {bothAnsweredThisRound
                        ? '雙方皆已作答完成，即將自動進入下一回合...'
                        : oppAnsweredCount > room.currentIndex
                        ? '雙方皆已作答，等待系統切換中...'
                        : '你已送出答案！等待對手作答或倒數結束後自動切換下一題...'}
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    詳解：{currentQuestionEntry.quiz.exp}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
