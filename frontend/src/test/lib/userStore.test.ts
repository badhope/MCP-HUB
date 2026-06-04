import { describe, it, expect, beforeEach } from 'vitest';
import * as userStore from '../../lib/userStore';
import { initUserStoreSync, useUserStore } from '../../store/useUserStore';

describe('userStore (localStorage)', () => {
  beforeEach(() => {
    userStore._resetUserStore();
    // Reset the Zustand store by re-initialising for the default user.
    initUserStoreSync('default-user');
  });

  describe('favorites', () => {
    it('adds and removes favorites', () => {
      const userId = 'u-fav-1';
      userStore._resetUserStore(userId);

      expect(userStore.getFavorites(userId)).toEqual([]);
      expect(userStore.isFavorite(userId, 'puppeteer')).toBe(false);

      const after = userStore.addFavorite(userId, 'puppeteer');
      expect(after).toEqual(['puppeteer']);
      expect(userStore.isFavorite(userId, 'puppeteer')).toBe(true);

      // Adding the same favorite again is a no-op (no duplicates).
      const dup = userStore.addFavorite(userId, 'puppeteer');
      expect(dup).toEqual(['puppeteer']);

      userStore.addFavorite(userId, 'playwright');
      expect(userStore.getFavorites(userId)).toEqual(['puppeteer', 'playwright']);

      const afterRemove = userStore.removeFavorite(userId, 'puppeteer');
      expect(afterRemove).toEqual(['playwright']);

      // Removing an absent favorite is a no-op.
      const noop = userStore.removeFavorite(userId, 'nope');
      expect(noop).toEqual(['playwright']);
    });

    it('toggleFavorite returns the correct added flag', () => {
      const userId = 'u-fav-2';
      userStore._resetUserStore(userId);

      expect(userStore.toggleFavorite(userId, 'a').added).toBe(true);
      expect(userStore.toggleFavorite(userId, 'a').added).toBe(false);
    });

    it('countFavoritesForServer aggregates across all users', () => {
      userStore._resetUserStore('u-a');
      userStore._resetUserStore('u-b');
      userStore._resetUserStore('u-c');
      userStore.addFavorite('u-a', 'puppeteer');
      userStore.addFavorite('u-b', 'puppeteer');
      userStore.addFavorite('u-c', 'playwright');

      expect(userStore.countFavoritesForServer('puppeteer')).toBe(2);
      expect(userStore.countFavoritesForServer('playwright')).toBe(1);
      expect(userStore.countFavoritesForServer('absent')).toBe(0);
    });
  });

  describe('ratings', () => {
    it('sets, retrieves, and summarises ratings', () => {
      const userId = 'u-rate-1';
      userStore._resetUserStore(userId);

      expect(userStore.getUserRating(userId, 'puppeteer')).toBeNull();

      userStore.setUserRating(userId, 'puppeteer', 5, 'Great server!');
      const r = userStore.getUserRating(userId, 'puppeteer');
      expect(r).not.toBeNull();
      expect(r?.rating).toBe(5);
      expect(r?.comment).toBe('Great server!');
      expect(r?.user_id).toBe(userId);
      expect(r?.server_name).toBe('puppeteer');

      // Trims comments.
      userStore.setUserRating(userId, 'playwright', 4, '   ok   ');
      expect(userStore.getUserRating(userId, 'playwright')?.comment).toBe('ok');

      // Empty comments are stored as undefined.
      userStore.setUserRating(userId, 'chrome-devtools', 3, '   ');
      expect(userStore.getUserRating(userId, 'chrome-devtools')?.comment).toBeUndefined();

      // Per-server summary
      const sum = userStore.getServerRatingSummary('puppeteer');
      expect(sum.count).toBe(1);
      expect(sum.average).toBe(5);
    });

    it('aggregates ratings across users for the same server', () => {
      userStore._resetUserStore('u-a');
      userStore._resetUserStore('u-b');
      userStore.setUserRating('u-a', 'puppeteer', 5);
      userStore.setUserRating('u-b', 'puppeteer', 3);

      const ratings = userStore.getAllRatingsForServer('puppeteer');
      expect(ratings).toHaveLength(2);
      const summary = userStore.getServerRatingSummary('puppeteer');
      expect(summary.count).toBe(2);
      expect(summary.average).toBe(4);
    });
  });

  describe('comments', () => {
    it('adds and lists per-user comments', () => {
      const userId = 'u-com-1';
      userStore._resetUserStore(userId);

      const c1 = userStore.addComment(userId, 'puppeteer', 'first!');
      const c2 = userStore.addComment(userId, 'puppeteer', 'second');
      expect(c1.text).toBe('first!');
      expect(c1.server_name).toBe('puppeteer');
      expect(c1.user_id).toBe(userId);

      const list = userStore.getUserComments(userId, 'puppeteer');
      expect(list).toHaveLength(2);
      expect(list.map((c) => c.text)).toEqual(['first!', 'second']);
      // Insertion order is preserved (newest-first sorting is done by
      // getAllCommentsForServer, which merges multiple users).
      expect(list[0]?.id).toBe(c1.id);
      expect(list[1]?.id).toBe(c2.id);
    });

    it('trims whitespace and skips other servers', () => {
      const userId = 'u-com-2';
      userStore._resetUserStore(userId);
      userStore.addComment(userId, 'a', '  hello  ');
      userStore.addComment(userId, 'b', 'world');

      const aComments = userStore.getUserComments(userId, 'a');
      expect(aComments).toHaveLength(1);
      expect(aComments[0]?.text).toBe('hello');
    });

    it('aggregates comments across users, newest first', () => {
      userStore._resetUserStore('u-a');
      userStore._resetUserStore('u-b');
      const c1 = userStore.addComment('u-a', 'puppeteer', 'A says');
      const c2 = userStore.addComment('u-b', 'puppeteer', 'B says');
      const all = userStore.getAllCommentsForServer('puppeteer');
      expect(all).toHaveLength(2);
      expect(all[0]?.id).toBe(c2.id);
      expect(all[1]?.id).toBe(c1.id);
    });
  });

  describe('submissions', () => {
    it('stores and retrieves submissions for a user', () => {
      const userId = 'u-sub-1';
      userStore._resetUserStore(userId);

      const s = userStore.addSubmission(userId, {
        name: 'my-server',
        source: 'https://github.com/me/my-server',
        description: 'A great new MCP server that does many useful things.',
        categories: ['ai', 'tooling'],
        npmPackage: '@me/my-server',
      });
      expect(s.name).toBe('my-server');
      expect(s.status).toBe('pending');
      expect(s.npm_package).toBe('@me/my-server');

      const list = userStore.getUserSubmissions(userId);
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(s.id);
    });

    it('isolates submissions between users', () => {
      userStore._resetUserStore('u-a');
      userStore._resetUserStore('u-b');
      userStore.addSubmission('u-a', {
        name: 'a-only',
        source: 'https://github.com/a/a',
        description: 'Submission from user a that should not leak across users.',
        categories: [],
      });
      expect(userStore.getUserSubmissions('u-b')).toHaveLength(0);
      expect(userStore.getUserSubmissions('u-a')).toHaveLength(1);
    });
  });

  describe('aggregate stats', () => {
    it('per-user stats', () => {
      const userId = 'u-stat-1';
      userStore._resetUserStore(userId);
      userStore.addFavorite(userId, 'puppeteer');
      userStore.addFavorite(userId, 'playwright');
      userStore.setUserRating(userId, 'puppeteer', 5);
      userStore.addComment(userId, 'puppeteer', 'nice');

      const s = userStore.getLocalUserStats(userId);
      expect(s.favorites_count).toBe(2);
      expect(s.ratings_count).toBe(1);
      expect(s.comments_count).toBe(1);
    });

    it('overall stats aggregate across all users', () => {
      userStore._resetUserStore('u-a');
      userStore._resetUserStore('u-b');
      userStore._resetUserStore('u-c');

      userStore.addFavorite('u-a', 'puppeteer');
      userStore.addFavorite('u-a', 'playwright');
      userStore.addFavorite('u-b', 'puppeteer');
      userStore.setUserRating('u-a', 'puppeteer', 5);
      userStore.addComment('u-b', 'puppeteer', 'x');
      userStore.addComment('u-c', 'playwright', 'y');
      userStore.addSubmission('u-a', {
        name: 'a1',
        source: 'https://github.com/a/a1',
        description: 'A submission that aggregates to the overall stats.',
        categories: [],
      });

      const overall = userStore.getLocalOverallStats();
      expect(overall.total_users).toBe(3);
      expect(overall.total_favorites).toBe(3);
      expect(overall.total_ratings).toBe(1);
      expect(overall.total_comments).toBe(2);
      expect(overall.total_submissions).toBe(1);
    });
  });

  describe('in-tab notifications', () => {
    it('notifies subscribers on writes', () => {
      const userId = 'u-notif-1';
      userStore._resetUserStore(userId);

      const calls: string[] = [];
      const unsub = userStore.subscribeUserStore((k) => {
        calls.push(k);
      });

      userStore.addFavorite(userId, 'puppeteer');
      userStore.removeFavorite(userId, 'puppeteer');
      unsub();

      // After unsubscribe, no more calls.
      const beforeUnsub = calls.length;
      userStore.addFavorite(userId, 'playwright');
      expect(calls.length).toBe(beforeUnsub);
      expect(calls.length).toBeGreaterThanOrEqual(2);
      // The keys should be the per-slot storage keys.
      expect(calls[0]).toContain(':favorites');
    });
  });

  describe('corruption tolerance', () => {
    it('drops corrupt JSON and returns fallback', () => {
      const userId = 'u-corrupt-1';
      userStore._resetUserStore(userId);
      // Write a malformed JSON value into the slot.
      localStorage.setItem(`mcp-hub:user:${userId}:favorites`, 'not-json');
      expect(userStore.getFavorites(userId)).toEqual([]);
      // The corrupt entry should have been wiped.
      expect(localStorage.getItem(`mcp-hub:user:${userId}:favorites`)).toBeNull();
    });

    it('drops non-array favorites and returns empty', () => {
      const userId = 'u-corrupt-2';
      userStore._resetUserStore(userId);
      localStorage.setItem(`mcp-hub:user:${userId}:favorites`, JSON.stringify({ not: 'array' }));
      expect(userStore.getFavorites(userId)).toEqual([]);
    });
  });
});

describe('useUserStore (Zustand)', () => {
  beforeEach(() => {
    userStore._resetUserStore();
    initUserStoreSync('default-user');
  });

  it('reflects writes from userStore in the Zustand cache', () => {
    const userId = 'u-zustand-1';
    userStore._resetUserStore(userId);
    initUserStoreSync(userId);

    expect(useUserStore.getState().favorites).toEqual([]);
    userStore.addFavorite(userId, 'puppeteer');
    expect(useUserStore.getState().favorites).toEqual(['puppeteer']);
  });

  it('change userId refreshes slots', () => {
    const userId = 'u-zustand-2';
    userStore._resetUserStore(userId);
    userStore.addFavorite(userId, 'puppeteer');

    initUserStoreSync('other-user');
    expect(useUserStore.getState().favorites).toEqual([]);

    initUserStoreSync(userId);
    expect(useUserStore.getState().favorites).toEqual(['puppeteer']);
  });
});
