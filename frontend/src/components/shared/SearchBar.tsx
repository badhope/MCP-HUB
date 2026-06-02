import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar = React.memo<SearchBarProps>(({
  value,
  onChange,
  placeholder = 'Search servers...',
  className = '',
}) => {
  return (
    <div className={`relative group ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
        <Search size={20} className="sm:size-6 text-slate-400 group-focus-within:text-primary-500 transition-colors duration-200" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-12 sm:pl-14 pr-4 sm:pr-5 py-3.5 sm:py-4 text-base sm:text-lg
          border-2 border-white/20 glass-hero rounded-2xl
          focus:border-white/40 focus:ring-4 focus:ring-white/10 focus:bg-white/15
          transition-all duration-300
          bg-white/10 backdrop-blur-xl
          placeholder-primary-100 text-white
          outline-none
        "
      />
      {/* Search glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-accent-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </div>
  );
});
