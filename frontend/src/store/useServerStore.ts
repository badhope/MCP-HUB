import { create } from 'zustand';

interface ServerStore {
  searchQuery: string;
  selectedCategory: string | null;
  selectedLanguage: string | null;
  sortBy: 'stars' | 'updated';
  minStars: number;
  minQuality: string | null;
  currentPage: number;
  pageSize: number;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedLanguage: (language: string | null) => void;
  setSortBy: (sort: 'stars' | 'updated') => void;
  setMinStars: (stars: number) => void;
  setMinQuality: (quality: string | null) => void;
  setCurrentPage: (page: number) => void;
  resetFilters: () => void;
}

export const useServerStore = create<ServerStore>((set) => ({
  searchQuery: '',
  selectedCategory: null,
  selectedLanguage: null,
  sortBy: 'stars',
  minStars: 0,
  minQuality: null,
  currentPage: 1,
  pageSize: 24,

  setSearchQuery: (searchQuery) =>
    set({ searchQuery, currentPage: 1 }),

  setSelectedCategory: (selectedCategory) =>
    set({ selectedCategory, currentPage: 1 }),

  setSelectedLanguage: (selectedLanguage) =>
    set({ selectedLanguage, currentPage: 1 }),

  setSortBy: (sortBy) =>
    set({ sortBy, currentPage: 1 }),

  setMinStars: (minStars) =>
    set({ minStars, currentPage: 1 }),

  setMinQuality: (minQuality) =>
    set({ minQuality, currentPage: 1 }),

  setCurrentPage: (currentPage) =>
    set({ currentPage }),

  resetFilters: () =>
    set({
      searchQuery: '',
      selectedCategory: null,
      selectedLanguage: null,
      sortBy: 'stars',
      minStars: 0,
      minQuality: null,
      currentPage: 1,
    }),
}));