import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { IconHeart, IconStar, IconAlertCircle, IconDownload, IconInfoCircle } from '@tabler/icons-react';
import { apiClient } from '../lib/api';
import { useServers } from '../hooks/useServers';
import { useUserStore } from '../store/useUserStore';
import { ServerCard } from '../components/server/ServerCard';
import { BatchExportBar } from '../components/shared/BatchExportBar';
import { Button } from '../components/ui/Button';
import type { Server } from '../types';

const Favorites = React.memo(() => {
  const userId = useUserStore((s) => s.userId);
  const favoriteNames = useUserStore((s) => s.favorites);
  const [favoriteServers, setFavoriteServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set());
  const { data: serverData } = useServers();
  const allServers = useMemo(() => serverData?.servers || [], [serverData?.servers]);

  useEffect(() => {
    if (allServers.length === 0) {
      setLoading(true);
      return;
    }
    const matched = allServers.filter((s: Server) => favoriteNames.includes(s.name));
    setFavoriteServers(matched);
    setLoading(false);
  }, [allServers, favoriteNames]);

  const removeFavorite = async (serverName: string) => {
    try {
      await apiClient.removeFavorite(userId, serverName);
      // useUserStore will refresh automatically via its in-tab listener.
    } catch (e) {
      console.error('Error removing favorite:', e);
      setError('Failed to remove favorite. Please try again.');
    }
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
    setSelectedServers(new Set(favoriteServers.map(s => s.name)));
  }, [favoriteServers]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <Helmet>
          <title>My Favorites | MCP Hub</title>
          <meta name="description" content="Your collection of saved MCP servers for quick access." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <div className="h-8 w-64 bg-muted rounded-lg animate-pulse mb-3" />
            <div className="h-5 w-96 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-5 animate-pulse">
                <div className="flex items-start mb-4">
                  <div className="w-12 h-12 bg-muted rounded-xl" />
                  <div className="ml-3 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-12">
        <Helmet>
          <title>My Favorites | MCP Hub</title>
          <meta name="description" content="Your collection of saved MCP servers for quick access." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">My Favorites</h1>
            <p className="text-muted-foreground">Your collection of saved MCP servers</p>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center space-x-3">
            <IconAlertCircle size={20} className="flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (favoriteServers.length === 0) {
    return (
      <div className="min-h-screen bg-background py-12">
        <Helmet>
          <title>My Favorites | MCP Hub</title>
          <meta name="description" content="Your collection of saved MCP servers for quick access." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
              <IconHeart size={32} className="text-red-500" fill="currentColor" />
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">My Favorites</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <IconInfoCircle size={12} className="mr-1" />
                Saved locally on this device
              </span>
            </div>
            <p className="text-muted-foreground">Your collection of saved MCP servers</p>
          </div>
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <IconHeart size={40} className="text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Favorites Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start exploring servers and tap the heart icon to save them here. Your favorites are stored on this device.
            </p>
            <Link
              to="/servers"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
            >
              <IconStar size={16} />
              <span>Browse Servers</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <Helmet>
        <title>My Favorites | MCP Hub</title>
        <meta name="description" content="Your collection of saved MCP servers for quick access." />
      </Helmet>
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                <IconHeart size={32} className="text-red-500" fill="currentColor" />
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">My Favorites</h1>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  title="Favorites are stored in this browser's local storage and sync across tabs of this device."
                >
                  <IconInfoCircle size={12} className="mr-1" />
                  Saved locally on this device
                </span>
              </div>
              <p className="text-muted-foreground">
                {favoriteServers.length} saved server{favoriteServers.length !== 1 ? 's' : ''}
              </p>
            </div>
            {favoriteServers.length > 0 && (
              <div className="flex-shrink-0">
                <Button
                  variant={selectMode ? 'primary' : 'outline'}
                  size="sm"
                  onClick={toggleSelectMode}
                >
                  <IconDownload size={16} className="mr-1.5" />
                  {selectMode ? 'Cancel Export' : 'Batch Export'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteServers.map((server) => (
            <div key={server.name} className="relative group">
              <ServerCard
                server={server}
                selectable={selectMode}
                selected={selectedServers.has(server.name)}
                onSelect={toggleSelect}
              />
              {!selectMode && (
                <button
                  onClick={() => removeFavorite(server.name)}
                  aria-label={`Remove ${server.name} from favorites`}
                  className="absolute top-3 right-3 p-2 bg-card rounded-xl shadow-md hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  title="Remove from favorites"
                >
                  <IconHeart size={16} fill="currentColor" className="text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>

        {selectMode && (
          <BatchExportBar
            selectedServers={Array.from(selectedServers)}
            totalCount={favoriteServers.length}
            onClearSelection={handleClearSelection}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        )}
      </div>
    </div>
  );
});

export default Favorites;
