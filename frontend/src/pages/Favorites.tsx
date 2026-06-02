import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Heart, Star, AlertCircle, Download } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useServers } from '../hooks/useServers';
import { ServerCard } from '../components/server/ServerCard';
import { BatchExportBar } from '../components/shared/BatchExportBar';
import { Button } from '../components/ui/Button';
import { Server } from '../types';

const Favorites = React.memo(() => {
  const userId = 'default-user';
  const [favoriteServers, setFavoriteServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set());
  const { data: serverData } = useServers();
  const allServers = useMemo(() => serverData?.servers || [], [serverData?.servers]);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getFavorites(userId);
      const matchedServers = allServers.filter((s: Server) => result.favorites.includes(s.name));
      setFavoriteServers(matchedServers);
    } catch {
      setError('Failed to load favorites. Please make sure the backend is running.');
    }
    setLoading(false);
  }, [allServers, userId]);

  useEffect(() => {
    if (allServers.length > 0) {
      loadFavorites();
    }
  }, [allServers.length, loadFavorites]);

  const removeFavorite = async (serverName: string) => {
    try {
      await apiClient.removeFavorite(userId, serverName);
      setFavoriteServers((prev) => prev.filter((s) => s.name !== serverName));
    } catch (e) {
      console.error('Error removing favorite:', e);
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
      <div className="min-h-screen bg-gray-50 py-12">
        <Helmet>
          <title>My Favorites | MCP Hub</title>
          <meta name="description" content="Your collection of saved MCP servers for quick access." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse mb-3" />
            <div className="h-5 w-96 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="flex items-start mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                  <div className="ml-3 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Helmet>
          <title>My Favorites | MCP Hub</title>
          <meta name="description" content="Your collection of saved MCP servers for quick access." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">My Favorites</h1>
            <p className="text-gray-600">Your collection of saved MCP servers</p>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center space-x-3">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (favoriteServers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Helmet>
          <title>My Favorites | MCP Hub</title>
          <meta name="description" content="Your collection of saved MCP servers for quick access." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">My Favorites</h1>
            <p className="text-gray-600">Your collection of saved MCP servers</p>
          </div>
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={40} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Favorites Yet</h2>
            <p className="text-gray-500 mb-6">
              Start exploring servers and save your favorites for quick access.
            </p>
            <Link
              to="/servers"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
            >
              <Star size={16} />
              <span>Browse Servers</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Helmet>
        <title>My Favorites | MCP Hub</title>
        <meta name="description" content="Your collection of saved MCP servers for quick access." />
      </Helmet>
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 mb-3">
              <Heart size={32} className="text-red-500" fill="currentColor" />
              <h1 className="text-4xl font-bold text-gray-900">My Favorites</h1>
            </div>
            {favoriteServers.length > 0 && (
              <Button
                variant={selectMode ? 'primary' : 'outline'}
                size="sm"
                onClick={toggleSelectMode}
              >
                <Download size={16} className="mr-1.5" />
                {selectMode ? 'Cancel Export' : 'Batch Export'}
              </Button>
            )}
          </div>
          <p className="text-gray-600">{favoriteServers.length} saved server{favoriteServers.length !== 1 ? 's' : ''}</p>
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
                  className="absolute top-3 right-3 p-2 bg-white rounded-xl shadow-md hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  title="Remove from favorites"
                >
                  <Heart size={16} fill="currentColor" className="text-red-500" />
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