/**
 * scoring.ts — 前端实时算分模块
 *
 * 与 tools/completeness_scoring.py 的 5 因子打分算法保持一致。
 * 用于前端实时计算和展示服务器评分。
 */

import type { Server, ScoreBreakdown } from '../types';

/**
 * 计算归一化的 log(stars)
 */
function normLogStars(stars: number, base: number = 10000): number {
  if (stars <= 0) return 0;
  return Math.min(1, Math.log(1 + stars) / Math.log(1 + base));
}

/**
 * 计算新鲜度衰减分数
 */
function recencyDecay(updatedAt: string, halfLifeDays: number = 30): number {
  const now = new Date();
  const updated = new Date(updatedAt);
  const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, daysSinceUpdate / halfLifeDays);
}

/**
 * 计算语言覆盖分数
 */
function langCoverage(language: string): number {
  // 有语言字段就得满分
  return language ? 1.0 : 0.0;
}

/**
 * 计算描述质量分数
 */
function descQuality(description: string, minChars: number = 200): number {
  if (!description) return 0;
  const len = description.length;
  if (len >= minChars) return 1.0;
  return len / minChars;
}

/**
 * 计算 our_signal 分数（直接从服务器对象读取）
 */
function ourSignal(server: Server): number {
  return server.our_signal ?? 0;
}

/**
 * 计算 5 因子加权总分（0-100）
 */
export function calculateScore(server: Server): number {
  const stars = normLogStars(server.stars);
  const recency = recencyDecay(server.updated_at);
  const lang = langCoverage(server.language);
  const desc = descQuality(server.description);
  const signal = ourSignal(server);

  const score =
    100 *
    (0.3 * stars + 0.15 * recency + 0.15 * lang + 0.2 * desc + 0.2 * signal);

  return Math.round(score);
}

/**
 * 计算 5 因子详细分解
 */
export function calculateScoreBreakdown(server: Server): ScoreBreakdown {
  return {
    stars: normLogStars(server.stars),
    recency: recencyDecay(server.updated_at),
    lang_coverage: langCoverage(server.language),
    desc_quality: descQuality(server.description),
    our_signal: ourSignal(server),
  };
}

/**
 * 获取评分等级
 */
export function getScoreLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'S', color: 'text-emerald-600' };
  if (score >= 65) return { label: 'A', color: 'text-blue-600' };
  if (score >= 50) return { label: 'B', color: 'text-violet-600' };
  if (score >= 35) return { label: 'C', color: 'text-amber-600' };
  return { label: 'D', color: 'text-gray-600' };
}
