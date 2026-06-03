import { Server } from '../types';

export interface QualityLevel {
  label: string;
  color: string;
  bg: string;
}

export const getQualityLevel = (score: number): QualityLevel => {
  if (score >= 80) return { label: 'S', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
  if (score >= 65) return { label: 'A', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
  if (score >= 50) return { label: 'B', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' };
  if (score >= 35) return { label: 'C', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  return { label: 'D', color: 'text-gray-600', bg: 'bg-gray-100 border-gray-200' };
};

export const getQualityDisplay = (score: number): QualityLevel => getQualityLevel(score);

/**
 * Single source of truth for the quality score used by cards, the list filter,
 * and the detail page. The threshold table mirrors the brief on the About page:
 *   4,403+ servers graded S/A/B/C/D across stars, source, maintenance, docs,
 *   category breadth, topic breadth, and license.
 */
export const getQualityScore = (server: Server): number => {
  let score = 35;
  if (server.stars > 5000) score += 30;
  else if (server.stars > 1000) score += 25;
  else if (server.stars > 100) score += 15;
  else if (server.stars > 10) score += 8;
  if (server.source_type === 'official') score += 15;
  if (!server.archived) score += 10;
  if (server.description && server.description.length > 80) score += 5;
  if (server.categories && server.categories.length > 1) score += 5;
  if (server.topics && server.topics.length > 2) score += 5;
  if (server.license) score += 5;
  return Math.min(score, 100);
};

/** Letter grade → minimum score threshold, used by the ServerList filter. */
export const QUALITY_THRESHOLDS: Record<string, number> = {
  S: 80,
  A: 65,
  B: 50,
  C: 35,
};
