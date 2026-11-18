import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  CustomQuestionRecord,
  MultiProfileStore,
  THEME_META,
  normalizeThemeMode,
} from '../types';
import { AudioPreferences } from './soundEngine';

export interface CloudUserSnapshot {
  store: Partial<MultiProfileStore>;
  audioPrefs?: Partial<AudioPreferences>;
  updatedAtMs: number;
}

export async function fetchUserCloudData(uid: string): Promise<CloudUserSnapshot | null> {
  const path = `userData/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'userData', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    const updatedAtMs =
      typeof data.updatedAt?.toMillis === 'function' ? data.updatedAt.toMillis() : Date.now();
    return {
      store: {
        activeName: typeof data.activeName === 'string' ? data.activeName : undefined,
        mode: data.mode === 'projector' ? 'projector' : 'student',
        theme: normalizeThemeMode(data.theme),
        profiles: (data.profiles as MultiProfileStore['profiles']) ?? undefined,
      },
      audioPrefs: (data.audioPrefs as Partial<AudioPreferences>) ?? undefined,
      updatedAtMs,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveUserCloudData(
  uid: string,
  store: MultiProfileStore,
  audioPrefs: AudioPreferences
): Promise<void> {
  const path = `userData/${uid}`;
  const docRef = doc(db, 'userData', uid);

  // Limit profiles map to max 20 entries and sanitize activeName length to match rules
  const trimmedProfiles: MultiProfileStore['profiles'] = {};
  Object.entries(store.profiles)
    .slice(0, 20)
    .forEach(([k, v]) => {
      trimmedProfiles[k.slice(0, 40)] = v;
    });

  const safeActive = (store.activeName || '探索者').slice(0, 40);
  const safeTheme = THEME_META[store.theme] ? store.theme : 'space';

  try {
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      await setDoc(docRef, {
        uid,
        activeName: safeActive,
        mode: store.mode === 'projector' ? 'projector' : 'student',
        theme: safeTheme,
        audioPrefs: {
          sfxEnabled: Boolean(audioPrefs.sfxEnabled),
          bgmEnabled: Boolean(audioPrefs.bgmEnabled),
          bgmTrack: audioPrefs.bgmTrack,
        },
        profiles: trimmedProfiles,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        activeName: safeActive,
        mode: store.mode === 'projector' ? 'projector' : 'student',
        theme: safeTheme,
        audioPrefs: {
          sfxEnabled: Boolean(audioPrefs.sfxEnabled),
          bgmEnabled: Boolean(audioPrefs.bgmEnabled),
          bgmTrack: audioPrefs.bgmTrack,
        },
        profiles: trimmedProfiles,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchCloudCustomQuestions(uid: string): Promise<CustomQuestionRecord[]> {
  const path = `userData/${uid}/customQuestions`;
  try {
    const snap = await getDocs(
      query(collection(db, 'userData', uid, 'customQuestions'), where('uid', '==', uid))
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id ?? d.id),
        sectorId: data.sectorId,
        subId: String(data.subId),
        q: String(data.q),
        options: Array.isArray(data.options) ? data.options.map(String) : ['A', 'B', 'C', 'D'],
        ans: typeof data.ans === 'number' ? data.ans : 0,
        exp: String(data.exp ?? ''),
        diagramId: data.diagramId ? String(data.diagramId) : undefined,
        imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
        source: data.source === 'word' || data.source === 'excel' ? data.source : 'manual',
        updatedAt:
          typeof data.updatedAt?.toMillis === 'function' ? data.updatedAt.toMillis() : Date.now(),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function upsertCloudCustomQuestions(
  uid: string,
  items: CustomQuestionRecord[]
): Promise<void> {
  if (items.length === 0) return;
  const path = `userData/${uid}/customQuestions`;
  try {
    // Batch up to 400 per commit
    for (let i = 0; i < items.length; i += 400) {
      const chunk = items.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const cleanId = item.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
        if (!cleanId) continue;
        const ref = doc(db, 'userData', uid, 'customQuestions', cleanId);
        const existing = await getDoc(ref);
        const baseFields = {
          sectorId: item.sectorId,
          subId: item.subId,
          q: item.q.slice(0, 2000),
          options: item.options.slice(0, 4).map((o) => String(o).slice(0, 200)),
          ans: Math.max(0, Math.min(3, item.ans)),
          exp: (item.exp || '').slice(0, 2000),
          diagramId: (item.diagramId || '').slice(0, 64),
          imageUrl: (item.imageUrl || '').slice(0, 300000),
          source: item.source ?? 'manual',
          updatedAt: serverTimestamp(),
        };
        if (!existing.exists()) {
          batch.set(ref, {
            uid,
            id: cleanId,
            ...baseFields,
            createdAt: serverTimestamp(),
          });
        } else {
          batch.update(ref, baseFields);
        }
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCloudCustomQuestion(uid: string, questionId: string): Promise<void> {
  const path = `userData/${uid}/customQuestions/${questionId}`;
  try {
    await deleteDoc(doc(db, 'userData', uid, 'customQuestions', questionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
