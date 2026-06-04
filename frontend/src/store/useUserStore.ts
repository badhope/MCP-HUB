// src/store/useUserStore.ts
// React-side cache of the current user's local data (favorites, ratings,
// comments, submissions). Mirrors the values in localStorage and
// re-renders subscribed components whenever any of them change — either
// via the in-tab `userStore` listener (same tab mutations) or the
// browser `storage` event (other tabs).
//
// The store is intentionally read-through: components that need a fresh
// value can call the appropriate `userStore.*` function directly and
// then call `useUserStore.getState().refresh()` to trigger a re-read.

import { create } from 'zustand';
import * as userStore from '../lib/userStore';
import type { Rating, Comment, Submission } from '../lib/api';

interface UserStoreState {
  userId: string;
  favorites: string[];
  ratings: Record<string, Rating>;
  comments: Comment[];
  submissions: Submission[];
  /** Bumped whenever any source pushes a fresh value. */
  version: number;

  refresh: () => void;
  setUserId: (userId: string) => void;
  /** Re-read all slots from userStore; called by event listeners. */
  reloadAll: () => void;
}

const PREFIX = 'mcp-hub:user';

function slotKey(k: string): 'favorites' | 'ratings' | 'comments' | 'submissions' | null {
  if (k.endsWith(':favorites')) return 'favorites';
  if (k.endsWith(':ratings')) return 'ratings';
  if (k.endsWith(':comments')) return 'comments';
  if (k.endsWith(':submissions')) return 'submissions';
  return null;
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  userId: 'default-user',
  favorites: [],
  ratings: {},
  comments: [],
  submissions: [],
  version: 0,

  setUserId: (userId) => {
    if (userId === get().userId) return;
    set({ userId });
    get().reloadAll();
  },

  refresh: () => set((s) => ({ version: s.version + 1 })),

  reloadAll: () => {
    const { userId } = get();
    const favorites = userStore.getFavorites(userId);

    // Ratings: rebuild the { serverName: Rating } map by calling the
    // per-user reader; this is a single localStorage read so cheap.
    const ratings: Record<string, Rating> = {};
    for (const serverName of Object.keys(
      (typeof localStorage !== 'undefined'
        ? (() => {
            try {
              const raw = localStorage.getItem(`${PREFIX}:${userId}:ratings`);
              return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
            } catch {
              return {};
            }
          })()
        : {})
    )) {
      const r = userStore.getUserRating(userId, serverName);
      if (r) ratings[serverName] = r;
    }

    const comments: Comment[] = [];
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(`${PREFIX}:`) || !k.endsWith(':comments')) continue;
        const owner = k.slice(PREFIX.length + 1, -':comments'.length);
        if (owner !== userId) continue;
        try {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const list = JSON.parse(raw) as Array<{ id: string; serverName: string; text: string; createdAt: string }>;
          if (!Array.isArray(list)) continue;
          for (const c of list) {
            comments.push({
              id: c.id,
              user_id: owner,
              server_name: c.serverName,
              text: c.text,
              created_at: c.createdAt,
            });
          }
        } catch {
          /* skip */
        }
      }
      comments.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }

    const submissions = userStore.getUserSubmissions(userId);

    set({ favorites, ratings, comments, submissions, version: get().version + 1 });
  },
}));

// ---------------------------------------------------------------------------
// Wire the store up to in-tab and cross-tab change events exactly once
// per page load. Idempotent — safe to call from multiple components.
// ---------------------------------------------------------------------------

let wired = false;

export function initUserStoreSync(userId: string = 'default-user'): void {
  if (typeof window === 'undefined') return;
  if (!wired) {
    userStore.subscribeUserStore((k) => {
      const slot = slotKey(k);
      if (slot) useUserStore.getState().reloadAll();
    });
    userStore.initUserStoreCrossTabSync();
    wired = true;
  }
  const s = useUserStore.getState();
  if (s.userId !== userId) s.setUserId(userId);
  s.reloadAll();
}

// Convenience hooks
export const useFavoriteCount = (): number => {
  // A per-server global count would require aggregating across all
  // users' localStorage entries (cheap, but only accurate on this
  // device). Pages that need a per-server count call
  // `apiClient.getFavoriteCount(name)` directly, which delegates to
  // userStore.countFavoritesForServer.
  return 0;
};
