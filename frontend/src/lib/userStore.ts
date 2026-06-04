// src/lib/userStore.ts
// localStorage-backed persistence for user actions (favorites, ratings,
// comments, submissions). Used by the static demo deployment (GitHub Pages)
// in place of the FastAPI backend. The same code path is also used in
// dev mode for offline testing.
//
// Storage layout (all keys prefixed `mcp-hub:user:<userId>:`):
//   favorites           -> string[]  (server names)
//   ratings             -> Record<serverName, { rating, comment?, createdAt }>
//   comments            -> Array<{ id, serverName, text, createdAt }>
//   submissions         -> Array<{ id, name, source, description, categories,
//                                   npmPackage?, status, createdAt }>
//
// All functions are SSR-safe (no-op when `window` is undefined) and
// tolerant of malformed JSON in localStorage (corrupted entries are
// dropped on read so the app keeps working).

import type { Rating, Comment, Submission } from './api';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const PREFIX = 'mcp-hub:user';

const hasWindow = (): boolean => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

function key(userId: string, slot: 'favorites' | 'ratings' | 'comments' | 'submissions'): string {
  return `${PREFIX}:${userId}:${slot}`;
}

function read<T>(k: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    const raw = localStorage.getItem(k);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt JSON — drop it so subsequent reads are clean.
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore quota / privacy mode errors */
    }
    return fallback;
  }
}

function write<T>(k: string, value: T): void {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(k, JSON.stringify(value));
    // Notify same-tab listeners (the `storage` event only fires for
    // cross-tab updates, not in-tab mutations). Components can subscribe
    // via subscribeUserStore().
    notifyInTab(k);
  } catch {
    // Quota exceeded or private-browsing mode — fail silently. The UI
    // still works for the current session in memory; only persistence
    // is lost.
  }
}

// ---------------------------------------------------------------------------
// Pub/sub for in-tab change notifications (cross-tab uses the native
// `storage` event, which we also fan-out through the same callback list).
// ---------------------------------------------------------------------------

type Listener = (k: string) => void;
const listeners: Set<Listener> = new Set();

function notifyInTab(k: string): void {
  for (const fn of listeners) {
    try {
      fn(k);
    } catch {
      /* listener errors must not break writes */
    }
  }
}

export function subscribeUserStore(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function initUserStoreCrossTabSync(): () => void {
  if (!hasWindow()) return () => undefined;
  const handler = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(PREFIX + ':')) notifyInTab(e.key);
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export function getFavorites(userId: string): string[] {
  const list = read<string[]>(key(userId, 'favorites'), []);
  return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
}

export function isFavorite(userId: string, serverName: string): boolean {
  return getFavorites(userId).includes(serverName);
}

export function addFavorite(userId: string, serverName: string): string[] {
  const current = getFavorites(userId);
  if (current.includes(serverName)) return current;
  const next = [...current, serverName];
  write(key(userId, 'favorites'), next);
  return next;
}

export function removeFavorite(userId: string, serverName: string): string[] {
  const current = getFavorites(userId);
  const next = current.filter((s) => s !== serverName);
  if (next.length === current.length) return current;
  write(key(userId, 'favorites'), next);
  return next;
}

export function toggleFavorite(userId: string, serverName: string): { favorites: string[]; added: boolean } {
  if (isFavorite(userId, serverName)) {
    return { favorites: removeFavorite(userId, serverName), added: false };
  }
  return { favorites: addFavorite(userId, serverName), added: true };
}

export function countFavoritesForServer(serverName: string): number {
  if (!hasWindow()) return 0;
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(`${PREFIX}:`) || !k.endsWith(':favorites')) continue;
    const list = read<string[] | null>(k, null);
    if (Array.isArray(list) && list.includes(serverName)) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

interface StoredRating {
  rating: number;
  comment?: string;
  createdAt: string;
}

function getRatingsMap(userId: string): Record<string, StoredRating> {
  const map = read<Record<string, StoredRating>>(key(userId, 'ratings'), {});
  return map && typeof map === 'object' ? map : {};
}

export function getUserRating(userId: string, serverName: string): Rating | null {
  const map = getRatingsMap(userId);
  const r = map[serverName];
  if (!r) return null;
  return {
    id: `${userId}:${serverName}`,
    user_id: userId,
    server_name: serverName,
    rating: r.rating,
    comment: r.comment,
    created_at: r.createdAt,
  };
}

export function setUserRating(
  userId: string,
  serverName: string,
  rating: number,
  comment?: string
): Rating {
  const map = getRatingsMap(userId);
  const createdAt = new Date().toISOString();
  map[serverName] = {
    rating,
    comment: comment?.trim() || undefined,
    createdAt,
  };
  write(key(userId, 'ratings'), map);
  return {
    id: `${userId}:${serverName}`,
    user_id: userId,
    server_name: serverName,
    rating,
    comment: comment?.trim() || undefined,
    created_at: createdAt,
  };
}

export function getAllRatingsForServer(serverName: string): Rating[] {
  if (!hasWindow()) return [];
  const out: Rating[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(`${PREFIX}:`) || !k.endsWith(':ratings')) continue;
    const userId = k.slice(PREFIX.length + 1, -':ratings'.length);
    const r = getUserRating(userId, serverName);
    if (r) out.push(r);
  }
  return out;
}

export function getServerRatingSummary(serverName: string): {
  average: number;
  count: number;
} {
  const ratings = getAllRatingsForServer(serverName);
  if (ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return { average: sum / ratings.length, count: ratings.length };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

interface StoredComment {
  id: string;
  text: string;
  createdAt: string;
}

function getCommentsList(userId: string): Array<StoredComment & { serverName: string }> {
  const list = read<Array<StoredComment & { serverName: string }>>(key(userId, 'comments'), []);
  return Array.isArray(list) ? list.filter((c) => c && typeof c.text === 'string') : [];
}

export function getUserComments(userId: string, serverName: string): Comment[] {
  return getCommentsList(userId)
    .filter((c) => c.serverName === serverName)
    .map((c) => ({
      id: c.id,
      user_id: userId,
      server_name: c.serverName,
      text: c.text,
      created_at: c.createdAt,
    }));
}

export function addComment(userId: string, serverName: string, text: string): Comment {
  const list = getCommentsList(userId);
  const createdAt = new Date().toISOString();
  const id = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const stored: StoredComment & { serverName: string } = { id, serverName, text: text.trim(), createdAt };
  write(key(userId, 'comments'), [...list, stored]);
  return {
    id,
    user_id: userId,
    server_name: serverName,
    text: text.trim(),
    created_at: createdAt,
  };
}

export function getAllCommentsForServer(serverName: string): Comment[] {
  if (!hasWindow()) return [];
  const out: Comment[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(`${PREFIX}:`) || !k.endsWith(':comments')) continue;
    const userId = k.slice(PREFIX.length + 1, -':comments'.length);
    out.push(...getUserComments(userId, serverName));
  }
  // Newest first
  out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return out;
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

interface StoredSubmission {
  id: string;
  name: string;
  source: string;
  description: string;
  categories: string[];
  npmPackage?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

function getSubmissionsList(userId: string): StoredSubmission[] {
  const list = read<StoredSubmission[]>(key(userId, 'submissions'), []);
  return Array.isArray(list) ? list.filter((s) => s && typeof s.name === 'string') : [];
}

export function getUserSubmissions(userId: string): Submission[] {
  return getSubmissionsList(userId).map((s) => ({
    id: s.id,
    user_id: userId,
    name: s.name,
    source: s.source,
    description: s.description,
    categories: s.categories || [],
    npm_package: s.npmPackage,
    status: s.status,
    created_at: s.createdAt,
  }));
}

export function addSubmission(
  userId: string,
  params: {
    name: string;
    source: string;
    description: string;
    categories: string[];
    npmPackage?: string;
  }
): Submission {
  const list = getSubmissionsList(userId);
  const createdAt = new Date().toISOString();
  const id = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const stored: StoredSubmission = {
    id,
    name: params.name.trim(),
    source: params.source.trim(),
    description: params.description.trim(),
    categories: params.categories,
    npmPackage: params.npmPackage?.trim() || undefined,
    status: 'pending',
    createdAt,
  };
  write(key(userId, 'submissions'), [...list, stored]);
  return {
    id,
    user_id: userId,
    name: stored.name,
    source: stored.source,
    description: stored.description,
    categories: stored.categories,
    npm_package: stored.npmPackage,
    status: stored.status,
    created_at: createdAt,
  };
}

// ---------------------------------------------------------------------------
// Aggregate stats (for ServerDetail / Favorites page footers)
// ---------------------------------------------------------------------------

export function getLocalUserStats(userId: string): {
  favorites_count: number;
  ratings_count: number;
  comments_count: number;
} {
  return {
    favorites_count: getFavorites(userId).length,
    ratings_count: Object.keys(getRatingsMap(userId)).length,
    comments_count: getCommentsList(userId).length,
  };
}

export function getLocalOverallStats(): {
  total_users: number;
  total_favorites: number;
  total_ratings: number;
  total_comments: number;
  total_submissions: number;
} {
  if (!hasWindow()) {
    return { total_users: 0, total_favorites: 0, total_ratings: 0, total_comments: 0, total_submissions: 0 };
  }
  const users = new Set<string>();
  let totalFavorites = 0;
  let totalRatings = 0;
  let totalComments = 0;
  let totalSubmissions = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(`${PREFIX}:`)) continue;
    const parts = k.split(':');
    if (parts.length < 4) continue;
    const userId = parts[2];
    const slot = parts[3];
    if (userId) users.add(userId);
    if (slot === 'favorites') {
      const list = read<string[] | null>(k, null);
      if (Array.isArray(list)) totalFavorites += list.length;
    } else if (slot === 'ratings') {
      const map = read<Record<string, unknown> | null>(k, null);
      if (map && typeof map === 'object') totalRatings += Object.keys(map).length;
    } else if (slot === 'comments') {
      const list = read<unknown[] | null>(k, null);
      if (Array.isArray(list)) totalComments += list.length;
    } else if (slot === 'submissions') {
      const list = read<unknown[] | null>(k, null);
      if (Array.isArray(list)) totalSubmissions += list.length;
    }
  }
  return {
    total_users: users.size,
    total_favorites: totalFavorites,
    total_ratings: totalRatings,
    total_comments: totalComments,
    total_submissions: totalSubmissions,
  };
}

// ---------------------------------------------------------------------------
// Test / dev utilities
// ---------------------------------------------------------------------------

/** Wipe all MCP Hub user data for the given user (used by tests). */
export function _resetUserStore(userId?: string): void {
  if (!hasWindow()) return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(`${PREFIX}:`)) continue;
    if (userId) {
      if (k === key(userId, 'favorites') || k === key(userId, 'ratings') ||
          k === key(userId, 'comments') || k === key(userId, 'submissions')) {
        toRemove.push(k);
      }
    } else {
      toRemove.push(k);
    }
  }
  for (const k of toRemove) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}
