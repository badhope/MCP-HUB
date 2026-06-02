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