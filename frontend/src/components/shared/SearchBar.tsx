import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /**
   * `page`  (default): light surface, dark text. Used on ServerList, etc.
   * `hero`: translucent dark glass, white text. Used over colored hero gradients.
   */
  variant?: 'page' | 'hero';
}

export const SearchBar = React.memo<SearchBarProps>(({
  value,
  onChange,
  placeholder = 'Search servers...',
  className = '',
  variant = 'page',
}) => {
  const isHero = variant === 'hero';

  return (
    <div className={`relative group ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
        <Search
          size={20}
          aria-hidden="true"
          className={`sm:size-6 transition-colors duration-200 ${
            isHero
              ? 'text-primary-100 group-focus-within:text-white'
              : 'text-slate-400 group-focus-within:text-primary-500'
          }`}
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={
          isHero
            ? // Hero variant: translucent white over a colored background.
              'w-full pl-12 sm:pl-14 pr-4 sm:pr-5 py-3.5 sm:py-4 text-base sm:text-lg ' +
              'border-2 border-white/20 bg-white/10 backdrop-blur-xl rounded-2xl ' +
              'focus:border-white/40 focus:ring-4 focus:ring-white/10 focus:bg-white/15 ' +
              'transition-all duration-300 outline-none ' +
              'placeholder-primary-100 text-white'
            : // Page variant: light surface, dark text. The previous version
              // (white text on glass) was invisible on the gray list page.
              'w-full pl-12 sm:pl-14 pr-4 sm:pr-5 py-3 sm:py-3.5 text-base ' +
              'border border-slate-200 bg-white rounded-2xl shadow-sm ' +
              'focus:border-primary-400 focus:ring-4 focus:ring-primary-100 ' +
              'transition-all duration-200 outline-none ' +
              'placeholder-slate-400 text-slate-900 ' +
              'hover:border-slate-300'
        }
      />
    </div>
  );
});
