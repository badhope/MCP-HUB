import React, { useState } from 'react';
import { IconSortAscending, IconStar, IconFilter, IconWorld, IconShield, IconChevronDown } from '@tabler/icons-react';

interface FilterBarProps {
  categories: string[];
  languages: string[];
  selectedCategory: string | null;
  selectedLanguage: string | null;
  onCategoryChange: (category: string | null) => void;
  onLanguageChange: (language: string | null) => void;
  sortBy: 'stars' | 'updated';
  onSortChange: (sort: 'stars' | 'updated') => void;
  minStars: number;
  onMinStarsChange: (stars: number) => void;
  minQuality?: string;
  onMinQualityChange?: (quality: string | null) => void;
  totalResults: number;
}

const qualityLevels = [
  { value: '', label: 'Any quality', color: 'bg-muted text-muted-foreground' },
  { value: 'S', label: 'S - Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'A', label: 'A - Good', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'B', label: 'B - Fair', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'C', label: 'C - Basic', color: 'bg-amber-50 text-amber-700 border-amber-200' },
];

// How many category / language chips to show before the "Show more" button.
// Below this, the chips render inline; above it, we collapse to a scroll
// strip capped at this height so long tag lists don't dominate the page.
const INITIAL_CHIP_COUNT = 15;
const COLLAPSE_CHIP_COUNT = 30;

export const FilterBar = React.memo<FilterBarProps>(({
  categories,
  languages,
  selectedCategory,
  selectedLanguage,
  onCategoryChange,
  onLanguageChange,
  sortBy,
  onSortChange,
  minStars,
  onMinStarsChange,
  minQuality,
  onMinQualityChange,
  totalResults,
}) => {
  const starOptions = [0, 10, 100, 1000, 5000];
  // Local "show more" toggles so the page doesn't render 30+ chips on first
  // paint. We always show chips that match the current filter, even if they
  // sit past the initial threshold, so a user never gets stranded.
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  const visibleCategories = (() => {
    if (showAllCategories || categories.length <= INITIAL_CHIP_COUNT) return categories;
    // Make sure the active filter chip is visible even if it falls past the cap.
    const head = categories.slice(0, INITIAL_CHIP_COUNT);
    if (selectedCategory && !head.includes(selectedCategory)) {
      return [...head, selectedCategory];
    }
    return head;
  })();

  const visibleLanguages = (() => {
    if (showAllLanguages || languages.length <= INITIAL_CHIP_COUNT) return languages;
    const head = languages.slice(0, INITIAL_CHIP_COUNT);
    if (selectedLanguage && !head.includes(selectedLanguage)) {
      return [...head, selectedLanguage];
    }
    return head;
  })();

  const renderChip = (
    label: string,
    isActive: boolean,
    onClick: () => void,
    size: 'sm' | 'md' = 'md',
  ) => {
    const padding = size === 'md' ? 'px-4 py-2' : 'px-3 py-1.5';
    const activeCls =
      'bg-primary text-primary-foreground shadow-sm';
    const idleCls = 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground';
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isActive}
        className={`${padding} rounded-full text-sm font-medium transition-all duration-200 ${isActive ? activeCls : idleCls}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="bg-card rounded-xl p-5 sm:p-6 shadow-sm border border-border mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <IconFilter size={20} className="text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{totalResults.toLocaleString()}</span>{' '}
            result{totalResults === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {onMinQualityChange && (
            <label className="flex items-center gap-2">
              <IconShield size={18} className="text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Minimum quality</span>
              <select
                value={minQuality || ''}
                onChange={(e) => onMinQualityChange(e.target.value || null)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors bg-card"
              >
                {qualityLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex items-center gap-2">
            <IconSortAscending size={18} className="text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'stars' | 'updated')}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors bg-card"
            >
              <option value="stars">Most stars</option>
              <option value="updated">Recently updated</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <IconStar size={18} className="text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Minimum stars</span>
            <select
              value={minStars}
              onChange={(e) => onMinStarsChange(Number(e.target.value))}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors bg-card"
            >
              {starOptions.map((stars) => (
                <option key={stars} value={stars}>
                  {stars === 0 ? 'Any stars' : `\u2265 ${stars.toLocaleString()} stars`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Categories
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              {categories.length}
            </span>
          </h3>
          {categories.length > COLLAPSE_CHIP_COUNT && (
            <button
              type="button"
              onClick={() => setShowAllCategories((v) => !v)}
              className="text-xs text-primary hover:text-foreground font-medium inline-flex items-center gap-1"
            >
              {showAllCategories ? 'Show less' : `Show all (${categories.length})`}
              <IconChevronDown
                size={14}
                className={`transition-transform ${showAllCategories ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {renderChip('All', !selectedCategory, () => onCategoryChange(null))}
          {visibleCategories.map((category) =>
            renderChip(category, selectedCategory === category, () => onCategoryChange(category)),
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center">
            <IconWorld size={14} className="mr-1" aria-hidden="true" />
            Languages
            <span className="ml-2 text-xs text-muted-foreground font-normal">{languages.length}</span>
          </h3>
          {languages.length > COLLAPSE_CHIP_COUNT && (
            <button
              type="button"
              onClick={() => setShowAllLanguages((v) => !v)}
              className="text-xs text-primary hover:text-foreground font-medium inline-flex items-center gap-1"
            >
              {showAllLanguages ? 'Show less' : `Show all (${languages.length})`}
              <IconChevronDown
                size={14}
                className={`transition-transform ${showAllLanguages ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {renderChip('All', !selectedLanguage, () => onLanguageChange(null), 'sm')}
          {visibleLanguages.map((language) =>
            renderChip(
              language,
              selectedLanguage === language,
              () => onLanguageChange(language),
              'sm',
            ),
          )}
        </div>
      </div>
    </div>
  );
});
