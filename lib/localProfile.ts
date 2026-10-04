// 端末内のプレイヤーID・プレイ履歴をlocalStorageへ保存/復元する。
export const PLAYER_ID_KEY = 'infinite_elevator_player_id_v1';
export const PLAY_HISTORY_KEY = 'infinite_elevator_play_history_v1';
export const PLAY_HISTORY_LIMIT = 100;

export type LocalPlayRecord = {
  score: number;
  floor: number;
  money: number;
  luck: number;
  endedAt: string;
};

function fallbackId() {
  const random = Math.random().toString(36).slice(2);
  return `p_${Date.now().toString(36)}_${random}`;
}

export function getOrCreatePlayerId() {
  if (typeof window === 'undefined') return '';
  const saved = localStorage.getItem(PLAYER_ID_KEY)?.trim();
  if (saved) return saved;
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : fallbackId();
  const id = `p_${uuid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  localStorage.setItem(PLAYER_ID_KEY, id);
  return id;
}

export function loadPlayHistory(): LocalPlayRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(PLAY_HISTORY_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((v): v is LocalPlayRecord => Boolean(v) && Number.isFinite(Number(v.score)))
      .slice(0, PLAY_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function appendPlayHistory(record: Omit<LocalPlayRecord, 'endedAt'>) {
  if (typeof window === 'undefined') return [] as LocalPlayRecord[];
  const next: LocalPlayRecord[] = [
    {...record, endedAt: new Date().toISOString()},
    ...loadPlayHistory(),
  ].slice(0, PLAY_HISTORY_LIMIT);
  localStorage.setItem(PLAY_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function getLocalHistorySummary(history = loadPlayHistory()) {
  return {
    count: history.length,
    best: history.reduce((best, row) => Math.max(best, Number(row.score || 0)), 0),
  };
}
