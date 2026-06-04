import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { apiClient } from '../../lib/api';

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
  const [justChanged, setJustChanged] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const favResult = await apiClient.checkFavorite(userId, serverName);
        setIsFavorite(favResult.is_favorite);
        const countResult = await apiClient.getFavoriteCount(serverName);
        setFavoriteCount(countResult.favorites_count);
      } catch {
        // Silently default to "not favorited" — the user can still click.
        setIsFavorite(false);
        setFavoriteCount(0);
      }
    };
    load();
  }, [serverName, userId]);

  const toggleFavorite = async () => {
    setLoading(true);
    try {
      if (isFavorite) {
        await apiClient.removeFavorite(userId, serverName);
        setIsFavorite(false);
        setFavoriteCount((c) => Math.max(0, c - 1));
      } else {
        await apiClient.addFavorite(userId, serverName);
        setIsFavorite(true);
        setFavoriteCount((c) => c + 1);
      }
      // Brief pulse animation so the user sees the click was registered,
      // even if the count is still 0 (e.g. first favorite ever).
      setJustChanged(true);
      window.setTimeout(() => setJustChanged(false), 600);
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remove ${serverName} from favorites` : `Add ${serverName} to favorites`}
      title={isFavorite ? 'Saved on this device' : 'Click to save on this device'}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
        isFavorite
          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50'
          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-950 hover:text-red-500'
      } ${justChanged ? 'scale-105' : 'scale-100'}`}
    >
      <Heart
        size={18}
        className={`transition-all duration-200 ${isFavorite ? 'fill-current scale-110' : ''}`}
      />
      <span className="font-medium">{isFavorite ? 'Favorited' : 'Favorite'}</span>
      {favoriteCount > 0 && (
        <span
          className={`text-sm px-1.5 py-0.5 rounded-full ${
            isFavorite ? 'bg-red-100 dark:bg-red-900/40' : 'bg-gray-100 dark:bg-slate-800'
          }`}
        >
          {favoriteCount}
        </span>
      )}
    </button>
  );
});
