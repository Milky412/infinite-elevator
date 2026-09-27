import { signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type CollectionReference,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db, firebaseReady } from './firebase';

export const RANKING_DISPLAY_LIMIT = 50;
export const RANKING_STORAGE_LIMIT = 1000;
export const RANKING_CACHE_MS = 5 * 60 * 1000;

export type RankingScope = 'weekly' | 'alltime';

export type RankingEntry = {
  id?: string;
  uid?: string;
  name: string;
  score: number;
  floor: number;
  money: number;
  luck: number;
  createdAt?: unknown;
};

type RankingMeta = {
  count: number;
  lowestScore: number;
  lowestId: string;
  updatedAt?: unknown;
};

export type RankingSubmitResult = {
  accepted: boolean;
  improved?: boolean;
  reason?: 'below_cutoff' | 'not_improved';
};

export type RankingSubmitBundle = {
  weekly: RankingSubmitResult;
  alltime: RankingSubmitResult;
  weekKey: string;
};

export type MyRankingResult = {
  entry: RankingEntry | null;
  rank: number | null;
  inTop1000: boolean;
};

export type RankingView = {
  rows: RankingEntry[];
  mine: MyRankingResult;
  scope: RankingScope;
  weekKey?: string;
  weekLabel?: string;
  cached: boolean;
};

type CachedView = Omit<RankingView, 'cached'> & { expiresAt: number };
const viewCache = new Map<string, CachedView>();

function nicknameKey(name: string) {
  // 同一端末でもニックネームが違えば別プレイヤーとして扱う。
  // 同じニックネームは同じdocument IDになるため自己ベスト更新になる。
  let h = 2166136261;
  const normalized = name.trim().normalize('NFKC').toLowerCase();
  for (let i = 0; i < normalized.length; i += 1) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function getPlayerRankingId(uid: string, name: string) {
  return `${uid}__${nicknameKey(name)}`;
}

export function getCurrentWeekKey(now = new Date()) {
  // 週間ランキングは日本時間の月曜00:00で切り替える。
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - daysSinceMonday));
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const d = String(monday.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentWeekLabel(now = new Date()) {
  const key = getCurrentWeekKey(now);
  const [y,m,d] = key.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return `${start.getUTCMonth()+1}/${start.getUTCDate()}〜${end.getUTCMonth()+1}/${end.getUTCDate()}`;
}

export async function ensureAnonymousUser() {
  if (!firebaseReady || !auth) return null;
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

function getScopeKey(scope: RankingScope) {
  return scope === 'weekly' ? `weekly:${getCurrentWeekKey()}` : 'alltime';
}

function getMetaId(scope: RankingScope) {
  return scope === 'weekly' ? `weekly_${getCurrentWeekKey()}` : 'top1000';
}

function getRankingCollection(scope: RankingScope): CollectionReference<DocumentData> {
  if (!db) throw new Error('Firestore is not configured');
  if (scope === 'weekly') {
    return collection(db, 'rankingsWeekly', getCurrentWeekKey(), 'entries');
  }
  return collection(db, 'rankings');
}

function invalidateRankingCache() {
  viewCache.clear();
}

async function initializeRankingMeta(scope: RankingScope): Promise<RankingMeta> {
  if (!db) throw new Error('Firestore is not configured');
  const ref = getRankingCollection(scope);
  const top1000Query = query(ref, orderBy('score', 'desc'), limit(RANKING_STORAGE_LIMIT));
  const snapshot = await getDocs(top1000Query);
  const count = snapshot.size;
  const lowest = snapshot.docs[count - 1];
  const meta: RankingMeta = {
    count,
    lowestScore: lowest ? Number(lowest.data().score || 0) : 0,
    lowestId: lowest?.id || '',
  };
  await setDoc(doc(db, 'rankingMeta', getMetaId(scope)), {...meta, updatedAt: serverTimestamp()});
  return meta;
}

async function getBottomTwo(scope: RankingScope) {
  const ref = getRankingCollection(scope);
  return getDocs(query(ref, orderBy('score', 'asc'), limit(2)));
}

async function submitScopeRanking(scope: RankingScope, entry: Omit<RankingEntry, 'uid' | 'createdAt'>): Promise<RankingSubmitResult> {
  if (!firebaseReady || !auth || !db) throw new Error('Firebase is not configured');
  const user = await ensureAnonymousUser();
  if (!user) throw new Error('Anonymous sign-in failed');

  const rankingCollection = getRankingCollection(scope);
  const nicknameRef = doc(rankingCollection, getPlayerRankingId(user.uid, entry.name));
  // v71以前の「UIDそのものをdocument IDにする」記録も同名ならそのまま更新する。
  const legacyRef = doc(rankingCollection, user.uid);
  const [nicknameSnap, legacySnap] = await Promise.all([getDoc(nicknameRef), getDoc(legacyRef)]);
  const useLegacy = !nicknameSnap.exists() && legacySnap.exists() && String(legacySnap.data().name || '').trim() === entry.name.trim();
  const rankingRef = useLegacy ? legacyRef : nicknameRef;
  const existingSnap = useLegacy ? legacySnap : nicknameSnap;
  const existing = existingSnap.exists() ? (existingSnap.data() as RankingEntry) : null;

  if (existing && entry.score <= Number(existing.score || 0)) {
    return {accepted:false, improved:false, reason:'not_improved'};
  }

  const metaRef = doc(db, 'rankingMeta', getMetaId(scope));
  const metaSnap = await getDoc(metaRef);
  let meta = metaSnap.exists() ? (metaSnap.data() as RankingMeta) : await initializeRankingMeta(scope);
  const isNewUser = !existing;

  if (isNewUser && meta.count >= RANKING_STORAGE_LIMIT && entry.score <= meta.lowestScore) {
    return {accepted:false, improved:false, reason:'below_cutoff'};
  }

  const newData = {...entry, uid:user.uid, createdAt:serverTimestamp()};

  if (meta.count < RANKING_STORAGE_LIMIT) {
    if (!isNewUser && meta.lowestId === rankingRef.id && meta.count > 1) {
      const bottom = await getBottomTwo(scope);
      const secondLowest = bottom.docs.find(d => d.id !== rankingRef.id);
      const secondScore = secondLowest ? Number(secondLowest.data().score || 0) : entry.score;
      const userStaysLowest = entry.score <= secondScore;
      const batch = writeBatch(db);
      batch.set(rankingRef, newData);
      batch.set(metaRef, {
        count:meta.count,
        lowestScore:userStaysLowest ? entry.score : secondScore,
        lowestId:userStaysLowest ? rankingRef.id : (secondLowest?.id || rankingRef.id),
        updatedAt:serverTimestamp(),
      });
      await batch.commit();
      return {accepted:true, improved:true};
    }

    const newCount = meta.count + (isNewUser ? 1 : 0);
    const becomesLowest = isNewUser && (meta.count === 0 || entry.score < meta.lowestScore);
    const onlyExistingEntry = !isNewUser && meta.count === 1 && meta.lowestId === rankingRef.id;
    const batch = writeBatch(db);
    batch.set(rankingRef, newData);
    batch.set(metaRef, {
      count:newCount,
      lowestScore:(becomesLowest || onlyExistingEntry) ? entry.score : meta.lowestScore,
      lowestId:(becomesLowest || onlyExistingEntry) ? rankingRef.id : meta.lowestId,
      updatedAt:serverTimestamp(),
    });
    await batch.commit();
    return {accepted:true, improved:true};
  }

  if (!isNewUser) {
    if (meta.lowestId !== rankingRef.id) {
      await setDoc(rankingRef, newData);
      return {accepted:true, improved:true};
    }
    const bottom = await getBottomTwo(scope);
    const secondLowest = bottom.docs.find(d => d.id !== rankingRef.id);
    const secondScore = secondLowest ? Number(secondLowest.data().score || 0) : entry.score;
    const userStaysLowest = entry.score <= secondScore;
    const batch = writeBatch(db);
    batch.set(rankingRef, newData);
    batch.set(metaRef, {
      count:RANKING_STORAGE_LIMIT,
      lowestScore:userStaysLowest ? entry.score : secondScore,
      lowestId:userStaysLowest ? rankingRef.id : (secondLowest?.id || rankingRef.id),
      updatedAt:serverTimestamp(),
    });
    await batch.commit();
    return {accepted:true, improved:true};
  }

  const bottom = await getBottomTwo(scope);
  const lowest = bottom.docs[0];
  const secondLowest = bottom.docs[1];
  if (!lowest) {
    meta = await initializeRankingMeta(scope);
    return submitScopeRanking(scope, entry);
  }
  const lowestScore = Number(lowest.data().score || 0);
  if (entry.score <= lowestScore) {
    await setDoc(metaRef, {count:RANKING_STORAGE_LIMIT, lowestScore, lowestId:lowest.id, updatedAt:serverTimestamp()}, {merge:true});
    return {accepted:false, improved:false, reason:'below_cutoff'};
  }

  const secondScore = secondLowest ? Number(secondLowest.data().score || 0) : entry.score;
  const insertedBecomesLowest = !secondLowest || entry.score < secondScore;
  const batch = writeBatch(db);
  batch.set(rankingRef, newData);
  batch.delete(lowest.ref);
  batch.set(metaRef, {
    count:RANKING_STORAGE_LIMIT,
    lowestScore:insertedBecomesLowest ? entry.score : secondScore,
    lowestId:insertedBecomesLowest ? rankingRef.id : (secondLowest?.id || rankingRef.id),
    updatedAt:serverTimestamp(),
  });
  await batch.commit();
  return {accepted:true, improved:true};
}

export async function submitRankings(entry: Omit<RankingEntry, 'uid' | 'createdAt'>): Promise<RankingSubmitBundle> {
  const [weekly, alltime] = await Promise.all([
    submitScopeRanking('weekly', entry),
    submitScopeRanking('alltime', entry),
  ]);
  invalidateRankingCache();
  return {weekly, alltime, weekKey:getCurrentWeekKey()};
}

export async function loadTopRankings(scope: RankingScope = 'alltime'): Promise<RankingEntry[]> {
  if (!firebaseReady || !db) return [];
  const ref = getRankingCollection(scope);
  const snapshot = await getDocs(query(ref, orderBy('score', 'desc'), limit(RANKING_DISPLAY_LIMIT)));
  return snapshot.docs.map((rankingDoc) => ({id:rankingDoc.id, ...(rankingDoc.data() as RankingEntry)}));
}

export async function loadMyRanking(scope: RankingScope = 'alltime'): Promise<MyRankingResult> {
  if (!firebaseReady || !auth || !db) return {entry:null, rank:null, inTop1000:false};
  const user = await ensureAnonymousUser();
  if (!user) return {entry:null, rank:null, inTop1000:false};
  const ref = getRankingCollection(scope);
  // 同じ端末から複数ニックネームを登録できるため、UIDに紐づく記録の中から最高記録を自分の順位として扱う。
  const mineSnapshot = await getDocs(query(ref, where('uid', '==', user.uid), limit(100)));
  if (mineSnapshot.empty) return {entry:null, rank:null, inTop1000:false};
  const mineEntries = mineSnapshot.docs.map(d => ({id:d.id, ...(d.data() as RankingEntry)}));
  const entry = mineEntries.reduce((best, cur) => Number(cur.score || 0) > Number(best.score || 0) ? cur : best);
  const higherCount = await getCountFromServer(query(ref, where('score', '>', entry.score)));
  const rank = higherCount.data().count + 1;
  return {entry, rank, inTop1000:rank <= RANKING_STORAGE_LIMIT};
}

export async function loadRankingView(scope: RankingScope, force = false): Promise<RankingView> {
  const key = getScopeKey(scope);
  const cached = viewCache.get(key);
  if (!force && cached && cached.expiresAt > Date.now()) {
    return {...cached, cached:true};
  }
  const [rows, mine] = await Promise.all([loadTopRankings(scope), loadMyRanking(scope)]);
  const base = {
    rows,
    mine,
    scope,
    ...(scope === 'weekly' ? {weekKey:getCurrentWeekKey(), weekLabel:getCurrentWeekLabel()} : {}),
  };
  viewCache.set(key, {...base, expiresAt:Date.now()+RANKING_CACHE_MS});
  return {...base, cached:false};
}
