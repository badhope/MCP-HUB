import { describe, it, expect, beforeEach } from 'vitest';
import { useServerStore } from '../../store/useServerStore';

describe('useServerStore', () => {
  beforeEach(() => {
    useServerStore.getState().resetFilters();
  });

  it('initializes with default values', () => {
    const state = useServerStore.getState();
    expect(state.searchQuery).toBe('');
    expect(state.selectedCategory).toBeNull();
    expect(state.selectedLanguage).toBeNull();
    expect(state.sortBy).toBe('stars');
    expect(state.minStars).toBe(0);
    expect(state.minQuality).toBeNull();
    expect(state.currentPage).toBe(1);
    expect(state.pageSize).toBe(24);
  });

  it('sets search query and resets page', () => {
    useServerStore.getState().setCurrentPage(5);
    useServerStore.getState().setSearchQuery('test');
    const state = useServerStore.getState();
    expect(state.searchQuery).toBe('test');
    expect(state.currentPage).toBe(1);
  });

  it('sets selected category and resets page', () => {
    useServerStore.getState().setCurrentPage(3);
    useServerStore.getState().setSelectedCategory('ai');
    const state = useServerStore.getState();
    expect(state.selectedCategory).toBe('ai');
    expect(state.currentPage).toBe(1);
  });

  it('sets selected language', () => {
    useServerStore.getState().setSelectedLanguage('TypeScript');
    expect(useServerStore.getState().selectedLanguage).toBe('TypeScript');
  });

  it('sets sort order', () => {
    useServerStore.getState().setSortBy('updated');
    expect(useServerStore.getState().sortBy).toBe('updated');
  });

  it('sets min stars', () => {
    useServerStore.getState().setMinStars(100);
    expect(useServerStore.getState().minStars).toBe(100);
  });

  it('sets min quality', () => {
    useServerStore.getState().setMinQuality('S');
    expect(useServerStore.getState().minQuality).toBe('S');
  });

  it('sets current page', () => {
    useServerStore.getState().setCurrentPage(5);
    expect(useServerStore.getState().currentPage).toBe(5);
  });

  it('resets all filters', () => {
    useServerStore.getState().setSearchQuery('test');
    useServerStore.getState().setSelectedCategory('ai');
    useServerStore.getState().setMinStars(100);
    useServerStore.getState().setCurrentPage(5);

    useServerStore.getState().resetFilters();

    const state = useServerStore.getState();
    expect(state.searchQuery).toBe('');
    expect(state.selectedCategory).toBeNull();
    expect(state.minStars).toBe(0);
    expect(state.currentPage).toBe(1);
  });

  it('unsets category when null is passed', () => {
    useServerStore.getState().setSelectedCategory('ai');
    useServerStore.getState().setSelectedCategory(null);
    expect(useServerStore.getState().selectedCategory).toBeNull();
  });

  it('unsets language when null is passed', () => {
    useServerStore.getState().setSelectedLanguage('TypeScript');
    useServerStore.getState().setSelectedLanguage(null);
    expect(useServerStore.getState().selectedLanguage).toBeNull();
  });
});