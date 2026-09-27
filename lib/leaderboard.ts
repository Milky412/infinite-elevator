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

export type RankingScope = 'monthly' | 'alltime';

export type RankingEntry = {
  id?: string;
  uid?: string;
  playerId?: string;
  name: string;
  score: number;
  floor: number;
  money: number;
  luck: number;
  createdAt?: unknown;
};

export type RankingSubmitResult = {
  accepted: boolean;
  improved?: boolean;
  reason?: 'below_cutoff' | 'not_improved' | 'save_failed';
  errorMessage?: string;
};

export type RankingSubmitBundle = {
  monthly: RankingSubmitResult;
  alltime: RankingSubmitResult;
  monthKey: string;
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
  monthKey?: string;
  monthLabel?: string;
  cached: boolean;
};

export type ScoreScopePreview = {
  rank: number;
  inTop1000: boolean;
  currentBestScore: number | null;
  wouldImprove: boolean;
  eligible: boolean;
  totalStored: number;
  cutoffScore: number | null;
};

export type ScorePreviewBundle = {
  monthly: ScoreScopePreview;
  alltime: ScoreScopePreview;
  monthKey: string;
  monthLabel: string;
};

type CachedView = Omit<RankingView, 'cached'> & { expiresAt: number };
const viewCache = new Map<string, CachedView>();

export function getCurrentMonthKey(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getCurrentMonthLabel(now = new Date()) {
  const key = getCurrentMonthKey(now);
  const [y, m] = key.split('-').map(Number);
  return `${y}年${m}月`;
}

export async function ensureAnonymousUser() {
  if (!firebaseReady || !auth) return null;
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

function getScopeKey(scope: RankingScope) {
  return scope === 'monthly' ? `monthly:${getCurrentMonthKey()}` : 'alltime';
}

function getRankingCollection(scope: RankingScope): CollectionReference<DocumentData> {
  if (!db) throw new Error('Firestore is not configured');
  if (scope === 'monthly') {
    return collection(db, 'rankingsMonthly', getCurrentMonthKey(), 'entries');
  }
  return collection(db, 'rankings');
}

function invalidateRankingCache() {
  viewCache.clear();
}

async function getBottomTwo(scope: RankingScope) {
  const ref = getRankingCollection(scope);
  return getDocs(query(ref, orderBy('score', 'asc'), limit(2)));
}

async function submitScopeRanking(
  scope: RankingScope,
  entry: Omit<RankingEntry, 'uid' | 'playerId' | 'createdAt'>,
  uid: string,
  playerId: string,
): Promise<RankingSubmitResult> {
  if (!firebaseReady || !auth || !db) throw new Error('Firebase is not configured');
  if (!playerId) throw new Error('playerId is missing');

  const rankingCollection = getRankingCollection(scope);
  const rankingRef = doc(rankingCollection, playerId);
  const existingSnap = await getDoc(rankingRef);
  const existing = existingSnap.exists() ? (existingSnap.data() as RankingEntry) : null;

  if (existing && entry.score <= Number(existing.score || 0)) {
    return {accepted:false, improved:false, reason:'not_improved'};
  }

  const newData = {
    ...entry,
    uid,
    playerId,
    createdAt:serverTimestamp(),
  };

  // 同じ端末プレイヤーの自己ベスト更新は、Top1000件数を再判定せず固定documentを更新する。
  if (existing) {
    await setDoc(rankingRef, newData);
    return {accepted:true, improved:true};
  }

  // 新規プレイヤーだけ現在件数を集計する。rankingMetaには依存しない。
  const countSnapshot = await getCountFromServer(rankingCollection);
  const count = countSnapshot.data().count;
  if (count < RANKING_STORAGE_LIMIT) {
    await setDoc(rankingRef, newData);
    return {accepted:true, improved:true};
  }

  // 1000件以上なら実データの最下位と比較し、上回った時だけ入れ替える。
  const bottom = await getBottomTwo(scope);
  const lowest = bottom.docs[0];
  if (!lowest) {
    await setDoc(rankingRef, newData);
    return {accepted:true, improved:true};
  }
  const lowestScore = Number(lowest.data().score || 0);
  if (entry.score <= lowestScore) {
    return {accepted:false, improved:false, reason:'below_cutoff'};
  }

  const batch = writeBatch(db);
  batch.set(rankingRef, newData);
  batch.delete(lowest.ref);
  await batch.commit();
  return {accepted:true, improved:true};
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || '保存に失敗しました');
}

function isRetryableError(error: unknown) {
  const code = String((error as {code?: unknown})?.code || '');
  return ['aborted','cancelled','deadline-exceeded','internal','network-request-failed','resource-exhausted','unavailable','unknown'].some(x => code.includes(x));
}

async function submitScopeWithRetry(
  scope: RankingScope,
  entry: Omit<RankingEntry, 'uid' | 'playerId' | 'createdAt'>,
  uid: string,
  playerId: string,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await submitScopeRanking(scope, entry, uid, playerId);
    } catch (error) {
      lastError = error;
      if (attempt > 0 || !isRetryableError(error)) break;
      await new Promise(resolve => setTimeout(resolve, 450));
    }
  }
  throw lastError;
}

export async function submitRankings(
  entry: Omit<RankingEntry, 'uid' | 'playerId' | 'createdAt'>,
  playerId: string,
): Promise<RankingSubmitBundle> {
  const user = await ensureAnonymousUser();
  if (!user) throw new Error('Anonymous sign-in failed');

  const settled = await Promise.allSettled([
    submitScopeWithRetry('monthly', entry, user.uid, playerId),
    submitScopeWithRetry('alltime', entry, user.uid, playerId),
  ]);
  const toResult = (item: PromiseSettledResult<RankingSubmitResult>): RankingSubmitResult =>
    item.status === 'fulfilled'
      ? item.value
      : {accepted:false, improved:false, reason:'save_failed', errorMessage:errorMessage(item.reason)};
  const monthly = toResult(settled[0]);
  const alltime = toResult(settled[1]);
  invalidateRankingCache();
  return {monthly, alltime, monthKey:getCurrentMonthKey()};
}

export async function loadTopRankings(scope: RankingScope = 'alltime'): Promise<RankingEntry[]> {
  if (!firebaseReady || !db) return [];
  const ref = getRankingCollection(scope);
  const snapshot = await getDocs(query(ref, orderBy('score', 'desc'), limit(RANKING_DISPLAY_LIMIT)));
  return snapshot.docs.map((rankingDoc) => ({id:rankingDoc.id, ...(rankingDoc.data() as RankingEntry)}));
}

export async function loadMyRanking(scope: RankingScope, playerId: string): Promise<MyRankingResult> {
  if (!firebaseReady || !db || !playerId) return {entry:null, rank:null, inTop1000:false};
  const ref = getRankingCollection(scope);
  const mineSnapshot = await getDoc(doc(ref, playerId));
  if (!mineSnapshot.exists()) return {entry:null, rank:null, inTop1000:false};
  const entry = {id:mineSnapshot.id, ...(mineSnapshot.data() as RankingEntry)};
  const higherCount = await getCountFromServer(query(ref, where('score', '>', Number(entry.score || 0))));
  const rank = higherCount.data().count + 1;
  return {entry, rank, inTop1000:rank <= RANKING_STORAGE_LIMIT};
}

async function previewScopeRanking(scope: RankingScope, score: number, playerId: string): Promise<ScoreScopePreview> {
  if (!firebaseReady || !db) throw new Error('Firestore is not configured');
  const ref = getRankingCollection(scope);
  const ownRef = doc(ref, playerId);
  const [ownSnapshot, higherSnapshot, totalSnapshot] = await Promise.all([
    getDoc(ownRef),
    getCountFromServer(query(ref, where('score', '>', score))),
    getCountFromServer(ref),
  ]);
  const currentBestScore = ownSnapshot.exists() ? Number(ownSnapshot.data().score || 0) : null;
  const wouldImprove = currentBestScore === null || score > currentBestScore;
  const totalStored = totalSnapshot.data().count;
  const rank = higherSnapshot.data().count + 1;
  let cutoffScore: number | null = null;
  let eligible = false;

  if (ownSnapshot.exists()) {
    eligible = wouldImprove;
  } else if (totalStored < RANKING_STORAGE_LIMIT) {
    eligible = true;
  } else {
    const lowestSnapshot = await getDocs(query(ref, orderBy('score', 'asc'), limit(1)));
    const lowest = lowestSnapshot.docs[0];
    cutoffScore = lowest ? Number(lowest.data().score || 0) : null;
    eligible = cutoffScore === null || score > cutoffScore;
  }

  return {
    rank,
    inTop1000: rank <= RANKING_STORAGE_LIMIT && (ownSnapshot.exists() || eligible),
    currentBestScore,
    wouldImprove,
    eligible,
    totalStored,
    cutoffScore,
  };
}

export async function previewRankings(score: number, playerId: string): Promise<ScorePreviewBundle> {
  if (!playerId) throw new Error('playerId is missing');
  const [monthly, alltime] = await Promise.all([
    previewScopeRanking('monthly', score, playerId),
    previewScopeRanking('alltime', score, playerId),
  ]);
  return {
    monthly,
    alltime,
    monthKey:getCurrentMonthKey(),
    monthLabel:getCurrentMonthLabel(),
  };
}

export async function loadRankingView(scope: RankingScope, playerId: string, force = false): Promise<RankingView> {
  const key = `${getScopeKey(scope)}:${playerId}`;
  const cached = viewCache.get(key);
  if (!force && cached && cached.expiresAt > Date.now()) {
    return {...cached, cached:true};
  }
  const [rows, mine] = await Promise.all([loadTopRankings(scope), loadMyRanking(scope, playerId)]);
  const base = {
    rows,
    mine,
    scope,
    ...(scope === 'monthly' ? {monthKey:getCurrentMonthKey(), monthLabel:getCurrentMonthLabel()} : {}),
  };
  viewCache.set(key, {...base, expiresAt:Date.now()+RANKING_CACHE_MS});
  return {...base, cached:false};
}
