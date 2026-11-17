import { useEffect, useMemo, useRef, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Award,
  BarChart3,
  Check,
  Clock,
  Copy,
  Crown,
  Flame,
  LogIn,
  LogOut,
  Palette,
  Play,
  Plus,
  Rocket,
  ShieldAlert,
  SkipForward,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import {
  SectorData,
  getScopeReadableLabel,
  sampleBattleQuestions,
} from '../data/sectors';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  signInWithGoogle,
  signOutUser,
} from '../firebase';
import {
  CustomQuestionRecord,
  ProfileRecord,
  SectorId,
  THEME_META,
  ThemeMode,
} from '../types';
import { soundEngine } from '../utils/soundEngine';
import { AudioToggleButtons } from './AudioToggleButtons';
import { QuestionMedia } from './QuestionMedia';

interface LeaderboardEntry {
  uid: string;
  name: string;
  score: number;
  streak: number;
  correctCount: number;
}

interface BattleRoomDoc {
  roomCode: string;
  hostUid: string;
  hostName: string;
  sectorScope: string;
  scopeLabel: string;
  questionCount: number;
  questionSeconds: number;
  status: 'waiting' | 'question' | 'reveal' | 'finished';
  currentIndex: number;
  answeredTotal: number;
  playerTotal: number;
  optionCounts: [number, number, number, number];
  leaderboard: LeaderboardEntry[];
  winnerUid: string;
  winnerName: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

interface BattlePlayerDoc {
  uid: string;
  roomCode: string;
  hostUid: string;
  name: string;
  score: number;
  streak: number;
  correctCount: number;
  answeredCount: number;
  lastRoundIndex: number;
  lastOption: number;
  lastCorrect: boolean;
  lastPoints: number;
  joinedAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

interface BattleQuestionDoc {
  roomCode: string;
  hostUid: string;
  index: number;
  qId: string;
  sectorId: SectorId;
  subId: string;
  q: string;
  options: string[];
  ans: number;
  exp: string;
  diagramId: string;
  imageUrl: string;
}

interface OnlineBattleViewProps {
  profile: ProfileRecord;
  theme: ThemeMode;
  customQuestions: CustomQuestionRecord[];
  sectorsSource: SectorData[];
  onCycleTheme: () => void;
  onClaimBattleBonus: (roomCode: string, bonusScore: number, isWinner: boolean) => void;
  onBackToHome: () => void;
}

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const KAHOOT_SHAPES = [
  { symbol: '▲', label: 'A', bg: 'bg-rose-600 hover:bg-rose-500 border-rose-400 text-white' },
  { symbol: '◆', label: 'B', bg: 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white' },
  { symbol: '●', label: 'C', bg: 'bg-amber-500 hover:bg-amber-400 border-amber-300 text-slate-950' },
  { symbol: '■', label: 'D', bg: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white' },
] as const;

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
  theme,
  customQuestions,
  sectorsSource,
  onCycleTheme,
  onClaimBattleBonus,
  onBackToHome,
}: OnlineBattleViewProps) {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Lobby config
  const [nickname, setNickname] = useState(() => safeDisplayName(profile.name, '星際戰士'));
  const [selectedSectorScope, setSelectedSectorScope] = useState<'all' | SectorId>('all');
  const [selectedSubScope, setSelectedSubScope] = useState<string>('sector'); // 'sector' or subId
  const [questionCount, setQuestionCount] = useState<5 | 8 | 10>(5);
  const [questionSeconds, setQuestionSeconds] = useState<15 | 20 | 30>(20);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Active room & subcollections
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<BattleRoomDoc | null>(null);
  const [roomQuestions, setRoomQuestions] = useState<BattleQuestionDoc[]>([]);
  const [roomPlayers, setRoomPlayers] = useState<BattlePlayerDoc[]>([]);
  const [myPlayerDoc, setMyPlayerDoc] = useState<BattlePlayerDoc | null>(null);
  const [hostRooms, setHostRooms] = useState<BattleRoomDoc[]>([]);

  // Round local state
  const [roundSecondsLeft, setRoundSecondsLeft] = useState(20);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const lastPhaseKeyRef = useRef<string>('');
  const rewardTriggeredRef = useRef<string | null>(null);

  const effectiveScope = useMemo(() => {
    if (selectedSectorScope === 'all') return 'all';
    if (selectedSubScope !== 'sector' && selectedSubScope.startsWith(`${selectedSectorScope}-`)) {
      return selectedSubScope;
    }
    return selectedSectorScope;
  }, [selectedSectorScope, selectedSubScope]);

  const activeSectorObj = useMemo(
    () =>
      selectedSectorScope === 'all'
        ? null
        : sectorsSource.find((s) => s.id === selectedSectorScope) ?? null,
    [selectedSectorScope, sectorsSource]
  );

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

  // Listen to hosted rooms
  useEffect(() => {
    if (!user) {
      setHostRooms([]);
      return;
    }
    const qHost = query(collection(db, 'battleRooms'), where('hostUid', '==', user.uid));
    const unsub = onSnapshot(
      qHost,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as BattleRoomDoc)
          .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
        setHostRooms(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'battleRooms')
    );
    return () => unsub();
  }, [user]);

  // Subscribe to active room document
  useEffect(() => {
    if (!activeRoomCode || !user) {
      setRoom(null);
      setRoomQuestions([]);
      setRoomPlayers([]);
      setMyPlayerDoc(null);
      soundEngine.setBattleIntensity(false);
      return;
    }

    const roomRef = doc(db, 'battleRooms', activeRoomCode);
    const unsubRoom = onSnapshot(
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

    // Fetch questions subcollection for this room
    const qRef = collection(db, 'battleRooms', activeRoomCode, 'questions');
    const unsubQ = onSnapshot(
      query(qRef, where('roomCode', '==', activeRoomCode)),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as BattleQuestionDoc)
          .sort((a, b) => a.index - b.index);
        setRoomQuestions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `battleRooms/${activeRoomCode}/questions`)
    );

    return () => {
      unsubRoom();
      unsubQ();
    };
  }, [activeRoomCode, user]);

  const isHost = Boolean(user && room && room.hostUid === user.uid);

  // Host listens to all players in the room; Non-host listens to own player doc
  useEffect(() => {
    if (!activeRoomCode || !user || !room) return;

    if (isHost) {
      const playersQ = query(
        collection(db, 'battleRooms', activeRoomCode, 'players'),
        where('hostUid', '==', user.uid)
      );
      const unsub = onSnapshot(
        playersQ,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as BattlePlayerDoc);
          setRoomPlayers(list);
        },
        (err) =>
          handleFirestoreError(err, OperationType.LIST, `battleRooms/${activeRoomCode}/players`)
      );
      return () => unsub();
    } else {
      const myRef = doc(db, 'battleRooms', activeRoomCode, 'players', user.uid);
      const unsub = onSnapshot(
        myRef,
        (snap) => {
          setMyPlayerDoc(snap.exists() ? (snap.data() as BattlePlayerDoc) : null);
        },
        (err) =>
          handleFirestoreError(
            err,
            OperationType.GET,
            `battleRooms/${activeRoomCode}/players/${user.uid}`
          )
      );
      return () => unsub();
    }
  }, [activeRoomCode, user, isHost, room?.hostUid]);

  // Trigger phase transition audio cues
  useEffect(() => {
    if (!room) {
      lastPhaseKeyRef.current = '';
      soundEngine.setBattleIntensity(false);
      return;
    }
    const phaseKey = `${room.roomCode}:${room.status}:${room.currentIndex}`;
    if (lastPhaseKeyRef.current !== phaseKey) {
      lastPhaseKeyRef.current = phaseKey;
      if (room.status === 'question') {
        setRoundSecondsLeft(room.questionSeconds);
        soundEngine.setBattleIntensity(true);
        soundEngine.playQuestionStart();
      } else if (room.status === 'reveal') {
        soundEngine.setBattleIntensity(false);
        soundEngine.playAnswerReveal();
      } else if (room.status === 'finished') {
        soundEngine.setBattleIntensity(false);
      }
    }
  }, [room?.roomCode, room?.status, room?.currentIndex, room?.questionSeconds]);

  // Synchronized countdown timer during 'question' phase
  useEffect(() => {
    if (!room || room.status !== 'question') return;

    const updateTimer = () => {
      const startedMs = room.updatedAt?.toMillis?.() ?? Date.now();
      const elapsedSec = Math.floor((Date.now() - startedMs) / 1000);
      const left = Math.max(0, room.questionSeconds - elapsedSec);
      setRoundSecondsLeft((prev) => {
        if (left !== prev && left > 0 && left <= 5) {
          soundEngine.playBattleTick(left <= 3);
        }
        return left;
      });
    };

    updateTimer();
    const timer = setInterval(updateTimer, 400);
    return () => clearInterval(timer);
  }, [room?.status, room?.currentIndex, room?.questionSeconds, room?.updatedAt]);

  // Host syncs live playerTotal & answeredTotal onto room doc (debounced)
  useEffect(() => {
    if (!room || !isHost || room.status === 'finished') return;
    const totalPlayers = roomPlayers.length;
    const answeredThisRound = roomPlayers.filter(
      (p) => p.lastRoundIndex === room.currentIndex
    ).length;

    if (room.status === 'waiting' && room.playerTotal !== totalPlayers) {
      const t = setTimeout(() => {
        void updateDoc(doc(db, 'battleRooms', room.roomCode), {
          playerTotal: totalPlayers,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }, 450);
      return () => clearTimeout(t);
    }

    if (
      room.status === 'question' &&
      (room.playerTotal !== totalPlayers || room.answeredTotal !== answeredThisRound)
    ) {
      const t = setTimeout(() => {
        void updateDoc(doc(db, 'battleRooms', room.roomCode), {
          playerTotal: totalPlayers,
          answeredTotal: answeredThisRound,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }, 450);
      return () => clearTimeout(t);
    }
  }, [room?.roomCode, room?.status, room?.currentIndex, room?.playerTotal, room?.answeredTotal, isHost, roomPlayers]);

  // Host: auto-reveal when timer reaches 0 or all joined players have answered
  const buildLeaderboardAndOptions = (players: BattlePlayerDoc[], roundIdx: number) => {
    const counts: [number, number, number, number] = [0, 0, 0, 0];
    players.forEach((p) => {
      if (p.lastRoundIndex === roundIdx && p.lastOption >= 0 && p.lastOption <= 3) {
        counts[p.lastOption] += 1;
      }
    });
    const sorted = [...players]
      .sort((a, b) => b.score - a.score || b.correctCount - a.correctCount)
      .slice(0, 30)
      .map((p) => ({
        uid: p.uid,
        name: p.name,
        score: p.score,
        streak: p.streak,
        correctCount: p.correctCount,
      }));
    return { counts, sorted };
  };

  const handleHostRevealAnswer = async () => {
    if (!room || !isHost || room.status !== 'question') return;
    soundEngine.playClick();
    const { counts, sorted } = buildLeaderboardAndOptions(roomPlayers, room.currentIndex);
    const answeredCount = roomPlayers.filter((p) => p.lastRoundIndex === room.currentIndex).length;
    try {
      await updateDoc(doc(db, 'battleRooms', room.roomCode), {
        status: 'reveal',
        answeredTotal: answeredCount,
        playerTotal: roomPlayers.length,
        optionCounts: counts,
        leaderboard: sorted,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `battleRooms/${room.roomCode}`);
    }
  };

  // Auto-reveal if countdown hits 0 or everyone answered
  useEffect(() => {
    if (!room || !isHost || room.status !== 'question') return;
    const totalP = roomPlayers.length;
    const answeredP = roomPlayers.filter((p) => p.lastRoundIndex === room.currentIndex).length;
    const everyoneAnswered = totalP > 0 && answeredP >= totalP;
    if (everyoneAnswered || roundSecondsLeft === 0) {
      const t = setTimeout(() => {
        void handleHostRevealAnswer();
      }, everyoneAnswered ? 900 : 1200);
      return () => clearTimeout(t);
    }
  }, [room?.status, room?.currentIndex, isHost, roundSecondsLeft, roomPlayers]);

  // Claim local bonus & play Hollywood 3-stage podium audio when finished
  useEffect(() => {
    if (!room || !user || room.status !== 'finished') return;
    if (rewardTriggeredRef.current === room.roomCode) return;
    rewardTriggeredRef.current = room.roomCode;

    soundEngine.playBattleVictory();

    if (!isHost) {
      const rankIdx = room.leaderboard.findIndex((entry) => entry.uid === user.uid);
      const isWinner = rankIdx === 0 || room.winnerUid === user.uid;
      const bonus = isWinner ? 60 : rankIdx >= 0 && rankIdx < 3 ? 45 : 25;
      onClaimBattleBonus(room.roomCode, bonus, isWinner);
    } else {
      // Host also earns +30 organizer star bonus on completion
      onClaimBattleBonus(room.roomCode, 30, false);
    }
  }, [room?.status, room?.roomCode, room?.winnerUid, room?.leaderboard, user?.uid, isHost, onClaimBattleBonus]);

  const currentQuestion = room ? roomQuestions[room.currentIndex] ?? null : null;
  const hasAnsweredThisRound = Boolean(
    myPlayerDoc && room && myPlayerDoc.lastRoundIndex >= room.currentIndex
  );

  // Handlers
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
          '此網域尚未加入 Firebase 授權網域！請至 Firebase Console → Authentication → Settings → Authorized domains 新增此網站網域。'
        );
      } else if (msg.includes('popup-closed-by-user')) {
        setAuthError('你已取消 Google 登入視窗，需要登入帳號才能進行多人對戰喔！');
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
      const sampled = sampleBattleQuestions(effectiveScope, questionCount, customQuestions);
      if (sampled.length < 3) {
        setActionError('目前選擇的範圍題庫不足 3 題，請改選整個主題單元或綜合賽！');
        return;
      }

      const code = generateRoomCode();
      const label = getScopeReadableLabel(effectiveScope, sectorsSource).slice(0, 60);
      const batch = writeBatch(db);

      batch.set(doc(db, 'battleRooms', code), {
        roomCode: code,
        hostUid: user.uid,
        hostName: safeDisplayName(nickname, safeDisplayName(user.displayName, '星際房主')),
        sectorScope: effectiveScope,
        scopeLabel: label,
        questionCount: sampled.length,
        questionSeconds,
        status: 'waiting',
        currentIndex: 0,
        answeredTotal: 0,
        playerTotal: 0,
        optionCounts: [0, 0, 0, 0],
        leaderboard: [],
        winnerUid: '',
        winnerName: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      sampled.forEach((qSnap, idx) => {
        batch.set(doc(db, 'battleRooms', code, 'questions', String(idx)), {
          roomCode: code,
          hostUid: user.uid,
          index: idx,
          qId: qSnap.qId.slice(0, 64),
          sectorId: qSnap.sectorId,
          subId: (qSnap.subId || '').slice(0, 16),
          q: qSnap.q.slice(0, 2000),
          options: qSnap.options.slice(0, 4).map((o) => String(o).slice(0, 200)),
          ans: Math.max(0, Math.min(3, qSnap.ans)),
          exp: (qSnap.exp || '').slice(0, 2000),
          diagramId: (qSnap.diagramId || '').slice(0, 64),
          imageUrl: (qSnap.imageUrl || '').slice(0, 300000),
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
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
      const existingRoom = snap.data() as BattleRoomDoc;

      if (existingRoom.hostUid === user.uid) {
        soundEngine.playWarp();
        setActiveRoomCode(cleanCode);
        return;
      }

      if (existingRoom.status === 'finished') {
        soundEngine.playWarp();
        setActiveRoomCode(cleanCode);
        return;
      }

      const playerRef = doc(db, 'battleRooms', cleanCode, 'players', user.uid);
      const pSnap = await getDoc(playerRef);
      if (!pSnap.exists()) {
        await setDoc(playerRef, {
          uid: user.uid,
          roomCode: cleanCode,
          hostUid: existingRoom.hostUid,
          name: safeDisplayName(nickname, safeDisplayName(user.displayName, '星際挑戰者')),
          score: 0,
          streak: 0,
          correctCount: 0,
          answeredCount: 0,
          lastRoundIndex: -1,
          lastOption: -1,
          lastCorrect: false,
          lastPoints: 0,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      soundEngine.playWarp();
      setActiveRoomCode(cleanCode);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `battleRooms/${cleanCode}/players`);
    } finally {
      setActionBusy(false);
    }
  };

  const handleHostStartGame = async () => {
    if (!room || !isHost) return;
    soundEngine.playClick();
    try {
      await updateDoc(doc(db, 'battleRooms', room.roomCode), {
        status: 'question',
        currentIndex: 0,
        answeredTotal: 0,
        playerTotal: roomPlayers.length,
        optionCounts: [0, 0, 0, 0],
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `battleRooms/${room.roomCode}`);
    }
  };

  const handleHostNextOrFinish = async () => {
    if (!room || !isHost) return;
    soundEngine.playClick();
    const { sorted } = buildLeaderboardAndOptions(roomPlayers, room.currentIndex);
    const isLast = room.currentIndex + 1 >= room.questionCount;

    try {
      if (isLast) {
        const top = sorted[0];
        const tie = sorted.length >= 2 && sorted[0].score === sorted[1].score;
        await updateDoc(doc(db, 'battleRooms', room.roomCode), {
          status: 'finished',
          leaderboard: sorted,
          winnerUid: tie ? 'draw' : top?.uid ?? room.hostUid,
          winnerName: tie ? '並列冠軍' : top?.name ?? '冠軍選手',
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'battleRooms', room.roomCode), {
          status: 'question',
          currentIndex: room.currentIndex + 1,
          answeredTotal: 0,
          playerTotal: roomPlayers.length,
          optionCounts: [0, 0, 0, 0],
          leaderboard: sorted,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `battleRooms/${room.roomCode}`);
    }
  };

  const submitPlayerAnswer = async (optIdx: number) => {
    if (!room || !user || !currentQuestion || isHost) return;
    if (room.status !== 'question' || hasAnsweredThisRound || submittingAnswer) return;

    soundEngine.unlockIfNeeded();
    setSubmittingAnswer(true);
    const isCorrect = optIdx === currentQuestion.ans;
    const prevScore = myPlayerDoc?.score ?? 0;
    const prevStreak = myPlayerDoc?.streak ?? 0;
    const prevCorrect = myPlayerDoc?.correctCount ?? 0;
    const prevAnswered = myPlayerDoc?.answeredCount ?? 0;

    const speedRatio = Math.max(0, Math.min(1, roundSecondsLeft / room.questionSeconds));
    const nextStreak = isCorrect ? prevStreak + 1 : 0;
    const streakBonus = isCorrect ? Math.min(200, Math.max(0, (nextStreak - 1) * 50)) : 0;
    const roundPoints = isCorrect ? Math.round(500 + speedRatio * 500 + streakBonus) : 0;

    if (isCorrect) {
      soundEngine.playCorrect(nextStreak);
    } else {
      soundEngine.playWrong();
    }

    try {
      await updateDoc(doc(db, 'battleRooms', room.roomCode, 'players', user.uid), {
        name: safeDisplayName(nickname, safeDisplayName(user.displayName, '星際挑戰者')),
        score: prevScore + roundPoints,
        streak: nextStreak,
        correctCount: prevCorrect + (isCorrect ? 1 : 0),
        answeredCount: prevAnswered + 1,
        lastRoundIndex: room.currentIndex,
        lastOption: optIdx,
        lastCorrect: isCorrect,
        lastPoints: roundPoints,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `battleRooms/${room.roomCode}/players/${user.uid}`);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleCancelWaitingRoom = async (roomCode: string) => {
    soundEngine.playClick();
    try {
      const qSnap = await getDocs(
        query(collection(db, 'battleRooms', roomCode, 'questions'), where('roomCode', '==', roomCode))
      );
      for (const d of qSnap.docs) {
        await deleteDoc(d.ref);
      }
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
      // Ignore clipboard error
    }
  };

  const themeMeta = THEME_META[theme];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 pt-6">
      {/* Header Banner with Click-to-Cycle Audio & Theme Switchers (Zero Dropdowns) */}
      <div className="glass-hud-panel flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <Swords className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-cyan-400">
              <span>Kahoot 式多人同步競技平台</span>
              <span aria-hidden="true">·</span>
              <span>房主控場 × 公布答案分布 × 星際頒獎台</span>
            </div>
            <h1 className="mt-0.5 text-xl font-extrabold text-slate-900 md:text-2xl dark:text-white">
              星際競技搶答大廳
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AudioToggleButtons compact />

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onCycleTheme();
            }}
            title="點按切換「星夜極光」／「星晝晨光」星際日夜光源"
            className="glass-hud-tile inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-sky-400 dark:text-slate-100 dark:hover:border-cyan-400"
          >
            <Palette className="h-3.5 w-3.5 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
            <span>{themeMeta.shortLabel} ↻</span>
          </button>

          {user && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/70 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
              <span className="max-w-[110px] truncate">{user.displayName || 'Google 選手'}</span>
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
            請先登入 Google 帳號以啟動 Kahoot 多人對戰
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            房主可指定任意單元或小節出題（含雲端匯入的 Excel/Word 圖文題目），全班同學輸入 6 碼房號即可跨裝置同步搶答 PK！
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
            <span>使用 Google 帳號登入並開啟同步</span>
          </button>
        </div>
      ) : !room ? (
        /* Lobby: Create Room (Host) OR Join Room (Player) */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Host Creates Multi-Player Room */}
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm lg:col-span-7 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Plus className="h-4 w-4 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
                <span>建立多人控場對戰房（教師／房主開房）</span>
              </div>
              {customQuestions.length > 0 && (
                <span className="rounded-lg border border-emerald-400/50 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  含 {customQuestions.length} 題雲端擴充題
                </span>
              )}
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

              {/* Unit / Sector Button Grid */}
              <div>
                <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  1. 選擇出題單元主題
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedSectorScope('all');
                      setSelectedSubScope('sector');
                    }}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${
                      selectedSectorScope === 'all'
                        ? 'border-sky-500 bg-sky-600 text-white dark:border-cyan-400 dark:bg-cyan-500 dark:text-slate-950'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-[#080D1A] dark:text-slate-300'
                    }`}
                  >
                    全八大主題綜合
                  </button>
                  {sectorsSource.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedSectorScope(sec.id);
                        setSelectedSubScope('sector');
                      }}
                      className={`truncate rounded-xl border px-3 py-2 text-left text-xs font-bold ${
                        selectedSectorScope === sec.id
                          ? 'border-sky-500 bg-sky-600 text-white dark:border-cyan-400 dark:bg-cyan-500 dark:text-slate-950'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-[#080D1A] dark:text-slate-300'
                      }`}
                    >
                      {sec.shortTitle}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Lesson Precision Selector */}
              {activeSectorObj && (
                <div>
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    2. 精準指定「整個單元」或「特定微關卡小節」
                  </span>
                  <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedSubScope('sector');
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${
                        selectedSubScope === 'sector'
                          ? 'border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-slate-950'
                          : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-[#080D1A] dark:text-slate-300'
                      }`}
                    >
                      整個 {activeSectorObj.shortTitle}（{activeSectorObj.quizzes.length} 題庫）
                    </button>
                    {activeSectorObj.subLessons.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedSubScope(sub.id);
                        }}
                        className={`truncate rounded-xl border px-3 py-2 text-left text-xs font-bold ${
                          selectedSubScope === sub.id
                            ? 'border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-slate-950'
                            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-[#080D1A] dark:text-slate-300'
                        }`}
                      >
                        {sub.code} {sub.title}（{sub.questionIds.length} 題）
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    回合題數
                  </span>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {([5, 8, 10] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setQuestionCount(cnt);
                        }}
                        className={`rounded-xl border py-2 text-xs font-bold ${
                          questionCount === cnt
                            ? 'border-sky-500 bg-sky-600 text-white dark:border-cyan-400 dark:bg-cyan-500 dark:text-slate-950'
                            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-[#080D1A] dark:text-slate-300'
                        }`}
                      >
                        {cnt} 題
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
                        className={`rounded-xl border py-2 font-mono text-xs font-bold tabular-nums ${
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
                <span>建立 Kahoot 多人搶答房</span>
              </button>
            </div>
          </section>

          {/* Right: Join Room + Host Recent Rooms */}
          <div className="space-y-6 lg:col-span-5">
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                參賽學生：輸入 6 碼房號加入
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                支援多人同時上線搶答！請先確認上方暱稱後輸入教師／房主的 6 碼房間代碼。
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

            {/* Hosted Rooms */}
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  我建立的對戰房間
                </h2>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {hostRooms.length} 間
                </span>
              </div>

              {hostRooms.length === 0 ? (
                <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#080D1A] dark:text-slate-400">
                  尚未建立房間，在左側選擇主題或小節即可開房當房主！
                </p>
              ) : (
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {hostRooms.slice(0, 6).map((r) => (
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
                            {r.scopeLabel}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {r.status === 'waiting'
                            ? `等待選手加入中（${r.playerTotal} 人）`
                            : r.status === 'finished'
                            ? `已結算 · 冠軍：${r.winnerName || '產生'}`
                            : `對戰進行中 · 第 ${r.currentIndex + 1}/${r.questionCount} 題`}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {r.status === 'waiting' && (
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
        /* Waiting Lobby: Host sees live roster & Start button; Players see Lobby status */
        <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
          <div className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
            {room.scopeLabel} · 共 {room.questionCount} 題 · 每題 {room.questionSeconds} 秒
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {isHost ? '星際對戰等候大廳（房主控場）' : '已進入星際競技大廳，等待房主開戰！'}
          </h2>

          {/* PIN Box */}
          <div className="mx-auto flex max-w-sm items-center justify-center gap-3 rounded-2xl border border-cyan-500/40 bg-slate-900 px-6 py-4 dark:bg-[#080D1A]">
            <span className="font-mono text-4xl font-extrabold tracking-[0.22em] text-cyan-300">
              {room.roomCode}
            </span>
            <button
              type="button"
              onClick={() => handleCopyCode(room.roomCode)}
              title="複製 6 碼房號"
              className="rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-slate-200 hover:border-cyan-400"
            >
              {copiedCode ? (
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Live Roster */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left dark:border-slate-800 dark:bg-[#080D1A]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>房主：{room.hostName}</span>
              <span className="font-mono text-sky-700 dark:text-cyan-300">
                已就緒參賽選手：{isHost ? roomPlayers.length : Math.max(1, room.playerTotal)} 人
              </span>
            </div>

            {isHost ? (
              roomPlayers.length === 0 ? (
                <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  請同學在自己的裝置輸入上方 6 碼房號加入，名單會即時顯示於此！
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {roomPlayers.map((p, idx) => (
                    <span
                      key={p.uid}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs dark:border-cyan-500/40 dark:bg-slate-900 dark:text-cyan-200"
                    >
                      <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                      <span>{p.name}</span>
                    </span>
                  ))}
                </div>
              )
            ) : (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>你的出戰代號：{myPlayerDoc?.name || nickname}（請看大螢幕準備搶答）</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {isHost && (
              <>
                <button
                  type="button"
                  disabled={roomPlayers.length === 0}
                  onClick={handleHostStartGame}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-45 dark:bg-emerald-500 dark:text-slate-950"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {roomPlayers.length === 0
                      ? '至少需 1 位參賽者加入才能開戰'
                      : `開始第 1 題搶答（${roomPlayers.length} 人參戰）`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelWaitingRoom(room.roomCode)}
                  className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200"
                >
                  解散房間
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveRoomCode(null);
                setRoom(null);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              返回大廳
            </button>
          </div>
        </div>
      ) : room.status === 'finished' ? (
        /* Starlight Award Podium Ceremony */
        (() => {
          const top3 = room.leaderboard.slice(0, 3);
          const myRank = room.leaderboard.findIndex((e) => e.uid === user.uid);
          const isWinner = myRank === 0;
          const bonusAwarded = isHost ? 30 : isWinner ? 60 : myRank >= 0 && myRank < 3 ? 45 : 25;

          return (
            <div className="mx-auto max-w-4xl space-y-6 rounded-2xl border border-slate-200 bg-white/95 p-6 text-center shadow-sm md:p-8 dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/60 bg-amber-50 text-amber-500 dark:bg-amber-400/15 dark:text-amber-300">
                <Crown className="h-9 w-9" aria-hidden="true" />
              </div>

              <div>
                <div className="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-300">
                  {room.scopeLabel} · 結算頒獎典禮
                </div>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl dark:text-white">
                  {top3[0] ? `全場總冠軍：${top3[0].name}` : '搶答對戰結算完成！'}
                </h2>
                <p className="mt-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  已入帳 +{bonusAwarded} 分探索積分至學生檔案「{profile.name}」
                </p>
              </div>

              {/* 3-Step Kahoot Podium */}
              {top3.length > 0 && (
                <div className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-3 pt-4">
                  {/* 2nd Place (Left) */}
                  <div className="animate-podium-rise flex flex-col items-center" style={{ animationDelay: '0.18s' }}>
                    {top3[1] ? (
                      <>
                        <div className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                          {top3[1].name}
                        </div>
                        <div className="w-full rounded-t-2xl border border-slate-300 bg-gradient-to-b from-slate-200 to-slate-300 px-3 py-5 text-slate-900 dark:border-slate-600 dark:from-slate-700 dark:to-slate-800 dark:text-white">
                          <div className="font-mono text-2xl font-black">2nd</div>
                          <div className="mt-1 font-mono text-base font-bold tabular-nums">
                            {top3[1].score}
                          </div>
                          <div className="text-[11px] opacity-80">答對 {top3[1].correctCount} 題</div>
                        </div>
                      </>
                    ) : (
                      <div className="h-24 w-full rounded-t-2xl border border-dashed border-slate-300/60 dark:border-slate-800" />
                    )}
                  </div>

                  {/* 1st Place (Center, Tallest) */}
                  <div className="animate-podium-rise flex flex-col items-center" style={{ animationDelay: '0.45s' }}>
                    {top3[0] && (
                      <>
                        <Crown className="mb-1 h-7 w-7 text-amber-500" aria-hidden="true" />
                        <div className="mb-2 text-base font-extrabold text-slate-900 dark:text-amber-300">
                          {top3[0].name}
                        </div>
                        <div className="w-full rounded-t-2xl border border-amber-400 bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-8 text-slate-950 shadow-lg">
                          <div className="font-mono text-3xl font-black">1st</div>
                          <div className="mt-1 font-mono text-xl font-extrabold tabular-nums">
                            {top3[0].score}
                          </div>
                          <div className="text-xs font-semibold">
                            答對 {top3[0].correctCount} / {room.questionCount} 題
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 3rd Place (Right) */}
                  <div className="animate-podium-rise flex flex-col items-center" style={{ animationDelay: '0.05s' }}>
                    {top3[2] ? (
                      <>
                        <div className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                          {top3[2].name}
                        </div>
                        <div className="w-full rounded-t-2xl border border-orange-300 bg-gradient-to-b from-orange-200 to-orange-400 px-3 py-4 text-slate-950 dark:border-orange-500/50 dark:from-orange-700/70 dark:to-orange-900/80 dark:text-orange-100">
                          <div className="font-mono text-xl font-black">3rd</div>
                          <div className="mt-1 font-mono text-sm font-bold tabular-nums">
                            {top3[2].score}
                          </div>
                          <div className="text-[11px] opacity-80">答對 {top3[2].correctCount} 題</div>
                        </div>
                      </>
                    ) : (
                      <div className="h-20 w-full rounded-t-2xl border border-dashed border-slate-300/60 dark:border-slate-800" />
                    )}
                  </div>
                </div>
              )}

              {/* Full Leaderboard */}
              <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-[#080D1A]">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span>全場最終名次排行榜</span>
                </div>
                <div className="space-y-2">
                  {room.leaderboard.map((entry, idx) => (
                    <div
                      key={entry.uid}
                      className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm ${
                        entry.uid === user.uid
                          ? 'border-sky-400 bg-sky-50 font-bold dark:border-cyan-400 dark:bg-cyan-500/15'
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 font-mono text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {idx + 1}
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          {entry.name} {entry.uid === user.uid ? '（你）' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
                        <span className="text-slate-500 dark:text-slate-400">
                          對 {entry.correctCount}/{room.questionCount}
                        </span>
                        <span className="text-base font-extrabold text-amber-600 dark:text-amber-300">
                          {entry.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveRoomCode(null);
                    setRoom(null);
                  }}
                  className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950"
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
        /* Live Arena: 'question' OR 'reveal' phase */
        <div className="space-y-5">
          {/* HUD Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3.5 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-sky-100 px-2.5 py-1 font-mono text-xs font-extrabold text-sky-800 dark:bg-cyan-500/20 dark:text-cyan-300">
                第 {room.currentIndex + 1} / {room.questionCount} 題
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {room.scopeLabel} · 房號 {room.roomCode}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono text-xs font-bold text-slate-600 tabular-nums dark:text-slate-300">
                已作答：{isHost ? roomPlayers.filter((p) => p.lastRoundIndex === room.currentIndex).length : room.answeredTotal} /{' '}
                {isHost ? roomPlayers.length : room.playerTotal} 人
              </span>

              {room.status === 'question' ? (
                <div
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1 font-mono text-lg font-extrabold tabular-nums ${
                    roundSecondsLeft <= 5
                      ? 'animate-pulse border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-500/60 dark:bg-rose-500/20 dark:text-rose-200'
                      : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200'
                  }`}
                >
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span>{roundSecondsLeft}s</span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>本題解答與排行公布</span>
                </span>
              )}
            </div>
          </div>

          {currentQuestion && (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0D1424] dark:shadow-none">
              {/* Question + Diagram/Image */}
              <div className="grid grid-cols-1 items-center gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5 lg:grid-cols-12 dark:border-slate-800 dark:bg-[#080D1A]">
                <div
                  className={`${
                    currentQuestion.diagramId || currentQuestion.imageUrl
                      ? 'lg:col-span-7'
                      : 'lg:col-span-12'
                  } text-lg leading-relaxed font-bold text-slate-900 md:text-xl dark:text-white`}
                >
                  {currentQuestion.q}
                </div>
                {(currentQuestion.diagramId || currentQuestion.imageUrl) && (
                  <div className="lg:col-span-5">
                    <QuestionMedia
                      diagramId={currentQuestion.diagramId || undefined}
                      imageUrl={currentQuestion.imageUrl || undefined}
                    />
                  </div>
                )}
              </div>

              {room.status === 'question' ? (
                isHost ? (
                  /* Host Question Control Screen */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {currentQuestion.options.map((opt, idx) => {
                        const shape = KAHOOT_SHAPES[idx];
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-bold shadow-xs ${shape.bg}`}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/20 text-base">
                              {shape.symbol}
                            </span>
                            <span className="text-base">{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-[#080D1A]">
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        房主控場中：所有學生答完或倒數歸零會自動公布答案，亦可隨時提前揭曉。
                      </span>
                      <button
                        type="button"
                        onClick={handleHostRevealAnswer}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950"
                      >
                        <BarChart3 className="h-4 w-4" aria-hidden="true" />
                        <span>立即公布答案與排行</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Player 4-Color Kahoot Action Tiles */
                  <div className="space-y-4">
                    {myPlayerDoc && (
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span>
                          你的目前積分：
                          <strong className="ml-1 font-mono text-base text-sky-700 dark:text-cyan-300">
                            {myPlayerDoc.score}
                          </strong>
                        </span>
                        {myPlayerDoc.streak >= 2 && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-0.5 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300">
                            <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
                            <span>連擊 x{myPlayerDoc.streak}</span>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {currentQuestion.options.map((opt, idx) => {
                        const shape = KAHOOT_SHAPES[idx];
                        const isPicked =
                          hasAnsweredThisRound && myPlayerDoc?.lastOption === idx;
                        const dimmed = hasAnsweredThisRound && !isPicked;

                        return (
                          <button
                            key={idx}
                            type="button"
                            data-sfx="custom"
                            disabled={hasAnsweredThisRound || submittingAnswer}
                            onClick={() => submitPlayerAnswer(idx)}
                            className={`flex items-center gap-3.5 rounded-2xl border-2 px-5 py-4 text-left text-base font-bold shadow-sm ${
                              shape.bg
                            } ${dimmed ? 'opacity-35 grayscale-[40%]' : ''} ${
                              isPicked ? 'ring-4 ring-white dark:ring-cyan-300' : ''
                            }`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/25 text-lg">
                              {shape.symbol}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isPicked && <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>

                    {hasAnsweredThisRound && (
                      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-xs font-bold text-sky-800 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-200">
                        {myPlayerDoc?.lastCorrect
                          ? `✓ 作答完成！本題獲得 +${myPlayerDoc.lastPoints} 分，等待房主公布全場答案分布...`
                          : '已鎖定作答！等待房主公布正確答案與解析...'}
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* REVEAL PHASE: Correct Answer, Option Histogram, Explanation & Live Top 5 */
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {currentQuestion.options.map((opt, idx) => {
                      const isRight = idx === currentQuestion.ans;
                      const count = room.optionCounts[idx] ?? 0;
                      const totalVotes = Math.max(
                        1,
                        room.optionCounts.reduce((a, b) => a + b, 0)
                      );
                      const pct = Math.round((count / totalVotes) * 100);
                      const shape = KAHOOT_SHAPES[idx];

                      return (
                        <div
                          key={idx}
                          className={`relative overflow-hidden rounded-xl border p-4 ${
                            isRight
                              ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/20'
                              : 'border-slate-200 bg-slate-50 opacity-75 dark:border-slate-800 dark:bg-[#080D1A]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-sm font-bold">
                            <span className="flex items-center gap-2 text-slate-900 dark:text-white">
                              <span className="font-mono">{shape.symbol}</span>
                              <span>{opt}</span>
                              {isRight && (
                                <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                                  正解
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-xs text-slate-700 tabular-nums dark:text-slate-200">
                              {count} 人（{pct}%）
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                isRight ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/75 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100">
                    <span className="font-extrabold">題目詳解：</span>
                    {currentQuestion.exp}
                  </div>

                  {/* Live Top 5 Standings */}
                  {room.leaderboard.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#080D1A]">
                      <div className="mb-2.5 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Award className="h-4 w-4 text-amber-500" aria-hidden="true" />
                        <span>即時前 5 名積分榜</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                        {room.leaderboard.slice(0, 5).map((entry, idx) => (
                          <div
                            key={entry.uid}
                            className={`rounded-xl border px-3 py-2 text-xs ${
                              entry.uid === user.uid
                                ? 'border-sky-400 bg-sky-50 font-bold dark:border-cyan-400 dark:bg-cyan-500/20'
                                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                            }`}
                          >
                            <div className="font-mono text-[10px] text-slate-500">#{idx + 1}</div>
                            <div className="truncate font-bold text-slate-900 dark:text-white">
                              {entry.name}
                            </div>
                            <div className="font-mono text-sm font-extrabold text-amber-600 tabular-nums dark:text-amber-300">
                              {entry.score}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Host Next Question / Finish Control */}
                  <div className="flex justify-end">
                    {isHost ? (
                      <button
                        type="button"
                        onClick={handleHostNextOrFinish}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                      >
                        <span>
                          {room.currentIndex + 1 >= room.questionCount
                            ? '揭曉星際頒獎台 🏆'
                            : `下一題（第 ${room.currentIndex + 2} / ${room.questionCount} 題）`}
                        </span>
                        <SkipForward className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        等待房主切換下一題...
                      </span>
                    )}
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
