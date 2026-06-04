import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient, isStaticDemo } from '../../lib/api';
import * as userStore from '../../lib/userStore';

// These tests exercise the static-mode code paths of apiClient (the
// default in the jsdom test environment). The live-API paths require
// MSW handlers and are tested elsewhere if at all.
describe('apiClient (static mode)', () => {
  beforeEach(() => {
    userStore._resetUserStore();
  });

  it('exposes isStaticDemo=true in jsdom', () => {
    expect(isStaticDemo).toBe(true);
  });

  describe('favorites', () => {
    it('addFavorite persists to localStorage and returns success', async () => {
      const userId = 'u-api-1';
      const res = await apiClient.addFavorite(userId, 'puppeteer');
      expect(res.success).toBe(true);
      expect(res.server_name).toBe('puppeteer');
      expect(userStore.isFavorite(userId, 'puppeteer')).toBe(true);
    });

    it('removeFavorite clears the local entry', async () => {
      const userId = 'u-api-2';
      await apiClient.addFavorite(userId, 'puppeteer');
      await apiClient.removeFavorite(userId, 'puppeteer');
      expect(userStore.isFavorite(userId, 'puppeteer')).toBe(false);
    });

    it('getFavorites returns the user list', async () => {
      const userId = 'u-api-3';
      await apiClient.addFavorite(userId, 'a');
      await apiClient.addFavorite(userId, 'b');
      const f = await apiClient.getFavorites(userId);
      expect(f.favorites).toEqual(['a', 'b']);
      expect(f.count).toBe(2);
    });

    it('checkFavorite reflects current state', async () => {
      const userId = 'u-api-4';
      const before = await apiClient.checkFavorite(userId, 'puppeteer');
      expect(before.is_favorite).toBe(false);
      await apiClient.addFavorite(userId, 'puppeteer');
      const after = await apiClient.checkFavorite(userId, 'puppeteer');
      expect(after.is_favorite).toBe(true);
    });

    it('getFavoriteCount aggregates across users', async () => {
      await apiClient.addFavorite('u-x', 'puppeteer');
      await apiClient.addFavorite('u-y', 'puppeteer');
      const c = await apiClient.getFavoriteCount('puppeteer');
      expect(c.favorites_count).toBe(2);
    });
  });

  describe('ratings', () => {
    it('addRating and getUserRating round-trip', async () => {
      const userId = 'u-api-r1';
      const res = await apiClient.addRating(userId, 'puppeteer', 4, 'nice');
      expect(res.success).toBe(true);
      expect(res.rating.rating).toBe(4);
      expect(res.rating.comment).toBe('nice');

      const got = await apiClient.getUserRating(userId, 'puppeteer');
      expect(got.rating).not.toBeNull();
      expect(got.rating?.rating).toBe(4);
    });

    it('getRatings returns per-server summary', async () => {
      const userId = 'u-api-r2';
      await apiClient.addRating(userId, 'puppeteer', 5);
      const sum = await apiClient.getRatings('puppeteer');
      expect(sum.count).toBe(1);
      expect(sum.average_rating).toBe(5);
      expect(sum.ratings).toHaveLength(1);
    });
  });

  describe('comments', () => {
    it('addComment and getComments round-trip', async () => {
      const userId = 'u-api-c1';
      const res = await apiClient.addComment(userId, 'puppeteer', 'hello');
      expect(res.success).toBe(true);
      expect(res.comment.text).toBe('hello');

      const list = await apiClient.getComments('puppeteer');
      expect(list.count).toBe(1);
      expect(list.comments[0]?.text).toBe('hello');
    });
  });

  describe('submissions', () => {
    it('submitServer persists a submission and getUserSubmissions returns it', async () => {
      const userId = 'u-api-s1';
      const res = await apiClient.submitServer({
        userId,
        name: 'test-server',
        source: 'https://github.com/me/test-server',
        description: 'A test submission that round-trips through the api.',
        categories: ['testing'],
        npmPackage: '@me/test',
      });
      expect(res.success).toBe(true);
      expect(res.submission.status).toBe('pending');

      const list = await apiClient.getUserSubmissions(userId);
      expect(list.count).toBe(1);
      expect(list.submissions[0]?.name).toBe('test-server');
    });

    it('reviewSubmission throws in static mode (no moderator workflow)', async () => {
      await expect(
        apiClient.reviewSubmission('sub-1', 'approved', 'mod-1', 'looks good')
      ).rejects.toThrow(/live backend/);
    });
  });

  describe('stats', () => {
    it('getUserStats reflects current user data', async () => {
      const userId = 'u-api-stat-1';
      await apiClient.addFavorite(userId, 'puppeteer');
      await apiClient.addFavorite(userId, 'playwright');
      await apiClient.addRating(userId, 'puppeteer', 5);
      const s = await apiClient.getUserStats(userId);
      expect(s.stats.favorites_count).toBe(2);
      expect(s.stats.ratings_count).toBe(1);
    });

    it('getServerStats reflects aggregated server data', async () => {
      await apiClient.addFavorite('u-1', 'puppeteer');
      await apiClient.addFavorite('u-2', 'puppeteer');
      await apiClient.addRating('u-1', 'puppeteer', 4);
      await apiClient.addComment('u-1', 'puppeteer', 'x');
      const s = await apiClient.getServerStats('puppeteer');
      expect(s.stats.favorites_count).toBe(2);
      expect(s.stats.ratings_count).toBe(1);
      expect(s.stats.comments_count).toBe(1);
      expect(s.stats.average_rating).toBe(4);
    });

    it('getOverallStats aggregates across all users', async () => {
      await apiClient.addFavorite('u-a', 'puppeteer');
      await apiClient.addRating('u-a', 'puppeteer', 5);
      await apiClient.addComment('u-b', 'playwright', 'y');
      const o = await apiClient.getOverallStats();
      expect(o.total_users).toBe(2);
      expect(o.total_favorites).toBe(1);
      expect(o.total_ratings).toBe(1);
      expect(o.total_comments).toBe(1);
    });
  });
});
