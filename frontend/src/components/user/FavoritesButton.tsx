import React, { useState, useEffect } from 'react';
import { Heart, Lock } from 'lucide-react';
import { apiClient, isStaticDemo } from '../../lib/api';

interface FavoritesButtonProps {
  serverName: string;
  userId?: string;
}

export const FavoritesButton = React.memo<FavoritesButtonProps>(({
  serverName,
  userId = 'default-user',
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const favResult = await apiClient.checkFavorite(userId, serverName);
        setIsFavorite(favResult.is_favorite);
        const countResult = await apiClient.getFavoriteCount(serverName);
        setFavoriteCount(countResult.favorites_count);
      } catch {
        // API not available, silently fail
      }
    };
    load();
  }, [serverName, userId]);

  const toggleFavorite = async () => {
    if (isStaticDemo) return;
    setLoading(true);
    try {
      if (isFavorite) {
        await apiClient.removeFavorite(userId, serverName);
        setIsFavorite(false);
        setFavoriteCount(Math.max(0, favoriteCount - 1));
      } else {
        await apiClient.addFavorite(userId, serverName);
        setIsFavorite(true);
        setFavoriteCount(favoriteCount + 1);
      }
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
    }
    setLoading(false);
  };

  if (isStaticDemo) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 cursor-not-allowed" title="Favorites are disabled in the static demo. Connect a backend to enable them.">
        <Lock size={18} />
        <span className="font-medium">Favorite (offline)</span>
      </div>
    );
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
        isFavorite
          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-950 hover:text-red-500'
      }`}
    >
      <Heart
        size={18}
        className={`transition-all duration-200 ${isFavorite ? 'fill-current scale-110' : ''}`}
      />
      <span className="font-medium">{isFavorite ? 'Favorited' : 'Favorite'}</span>
      {favoriteCount > 0 && (
        <span className={`text-sm px-1.5 py-0.5 rounded-full ${
          isFavorite ? 'bg-red-100' : 'bg-gray-100 dark:bg-slate-800'
        }`}>
          {favoriteCount}
        </span>
      )}
    </button>
  );
});
