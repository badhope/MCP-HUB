import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Download } from 'lucide-react';
import { useServerStore } from '../store/useServerStore';
import { useServers } from '../hooks/useServers';
import { SearchBar } from '../components/shared/SearchBar';
import { FilterBar } from '../components/shared/FilterBar';
import { ServerGrid } from '../components/server/ServerGrid';
import { Pagination } from '../components/shared/Pagination';
import { BatchExportBar } from '../components/shared/BatchExportBar';
import { Button } from '../components/ui/Button';
import { Server } from '../types';

const getQualityScore = (server: Server): number => {
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

const ServerList = React.memo(() => {
  const {
    searchQuery,
    selectedCategory,
    selectedLanguage,
    sortBy,
    minStars,
    currentPage,
    pageSize,
    setSearchQuery,
    setSelectedCategory,
    setSelectedLanguage,
    setSortBy,
    setMinStars,
    setMinQuality,
    setCurrentPage,
  } = useServerStore();

  const [searchParams] = useSearchParams();
  const [minQuality, setMinQualityLocal] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set());

  const { data: serverData, isLoading } = useServers();

  useEffect(() => {
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') as 'stars' | 'updated' | null;
    const search = searchParams.get('search');

    if (category) setSelectedCategory(category);
    if (sort) setSortBy(sort);
    if (search) setSearchQuery(search);
  }, [searchParams, setSelectedCategory, setSortBy, setSearchQuery]);

  const allServers: Server[] = useMemo(() => serverData?.servers || [], [serverData?.servers]);

  const categories = useMemo(() => {
    const catSet = new Set<string>();
    allServers.forEach((server) => {
      server.categories.forEach((cat: string) => catSet.add(cat));
    });
    return Array.from(catSet).sort();
  }, [allServers]);

  const languages = useMemo(() => {
    const langSet = new Set<string>();
    allServers.forEach((server) => {
      if (server.language) {
        langSet.add(server.language);
      }
    });
    return Array.from(langSet).sort();
  }, [allServers]);

  const filtered = useMemo(() => {
    let result = [...allServers];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      result = result.filter((s) =>
        s.categories.some((c: string) => c === selectedCategory)
      );
    }

    if (selectedLanguage) {
      result = result.filter((s) => s.language === selectedLanguage);
    }

    if (minStars > 0) {
      result = result.filter((s) => s.stars >= minStars);
    }

    if (minQuality) {
      const thresholds: Record<string, number> = {
        S: 80,
        A: 65,
        B: 50,
        C: 35,
      };
      const threshold = thresholds[minQuality] || 0;
      result = result.filter((s) => getQualityScore(s) >= threshold);
    }

    if (sortBy === 'stars') {
      result.sort((a, b) => b.stars - a.stars);
    } else {
      result.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }

    return result;
  }, [allServers, searchQuery, selectedCategory, selectedLanguage, minStars, minQuality, sortBy]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedServers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleMinQualityChange = (quality: string | null) => {
    setMinQualityLocal(quality);
    setMinQuality(quality);
  };

  const toggleSelect = useCallback((name: string) => {
    setSelectedServers(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedServers(new Set(paginatedServers.map(s => s.name)));
  }, [paginatedServers]);

  const handleDeselectAll = useCallback(() => {
    setSelectedServers(new Set());
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedServers(new Set());
    setSelectMode(false);
  }, []);

  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => !prev);
    setSelectedServers(new Set());
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Helmet>
        <title>All MCP Servers | MCP Hub</title>
        <meta name="description" content="Browse and search our complete collection of MCP servers. Filter by category, language, stars, and quality score." />
      </Helmet>
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">MCP Servers</h1>
              <p className="text-gray-600">Discover and explore {allServers.length.toLocaleString()} MCP servers</p>
            </div>
            <Button
              variant={selectMode ? 'primary' : 'outline'}
              size="sm"
              onClick={toggleSelectMode}
            >
              <Download size={16} className="mr-1.5" />
              {selectMode ? 'Cancel Export' : 'Batch Export'}
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search server name or description..."
          />
        </div>

        <FilterBar
          categories={categories}
          languages={languages}
          selectedCategory={selectedCategory}
          selectedLanguage={selectedLanguage}
          onCategoryChange={setSelectedCategory}
          onLanguageChange={setSelectedLanguage}
          sortBy={sortBy}
          onSortChange={setSortBy}
          minStars={minStars}
          onMinStarsChange={setMinStars}
          minQuality={minQuality || undefined}
          onMinQualityChange={handleMinQualityChange}
          totalResults={filtered.length}
        />

        <ServerGrid
          servers={paginatedServers}
          loading={isLoading}
          emptyMessage="No matching servers found"
          selectable={selectMode}
          selectedServers={selectedServers}
          onSelect={toggleSelect}
        />

        {!isLoading && filtered.length > pageSize && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        {selectMode && (
          <BatchExportBar
            selectedServers={Array.from(selectedServers)}
            totalCount={paginatedServers.length}
            onClearSelection={handleClearSelection}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        )}
      </div>
    </div>
  );
});

export default ServerList;