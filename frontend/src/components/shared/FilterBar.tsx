import React from 'react';
import { SortAsc, Star, Filter, Globe, Shield } from 'lucide-react';

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
  { value: '', label: 'Any quality', color: 'bg-gray-100 text-gray-600' },
  { value: 'S', label: 'S - Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'A', label: 'A - Good', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'B', label: 'B - Fair', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'C', label: 'C - Basic', color: 'bg-amber-50 text-amber-700 border-amber-200' },
];

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

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Filter size={20} className="text-gray-400" />
          <span className="text-gray-600">
            <span className="font-semibold text-gray-900">{totalResults}</span> results
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {onMinQualityChange && (
            <div className="flex items-center space-x-2">
              <Shield size={18} className="text-gray-400" />
              <select
                value={minQuality || ''}
                onChange={(e) => onMinQualityChange(e.target.value || null)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors"
              >
                {qualityLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <SortAsc size={18} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'stars' | 'updated')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors"
            >
              <option value="stars">Sort by Stars</option>
              <option value="updated">Sort by Updated</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Star size={18} className="text-gray-400" />
            <select
              value={minStars}
              onChange={(e) => onMinStarsChange(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors"
            >
              {starOptions.map((stars) => (
                <option key={stars} value={stars}>
                  {stars === 0 ? 'Any stars' : `\u2265 ${stars} stars`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">Categories</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange(null)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${!selectedCategory
                ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            All
          </button>
          {categories.slice(0, 15).map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${selectedCategory === category
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center">
          <Globe size={14} className="mr-1" />
          Languages
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onLanguageChange(null)}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
              ${!selectedLanguage
                ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            All
          </button>
          {languages.slice(0, 10).map((language) => (
            <button
              key={language}
              onClick={() => onLanguageChange(language)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                ${selectedLanguage === language
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {language}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});