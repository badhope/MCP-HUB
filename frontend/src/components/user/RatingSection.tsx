import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { apiClient, Rating } from '../../lib/api';

interface RatingSectionProps {
  serverName: string;
  userId?: string;
}

export const RatingSection = React.memo<RatingSectionProps>(({
  serverName,
  userId = 'default-user',
}) => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await apiClient.getRatings(serverName);
        setRatings(result.ratings);
        setAverageRating(result.average_rating);

        const userResult = await apiClient.getUserRating(userId, serverName);
        if (userResult.rating) {
          setUserRating(userResult.rating.rating);
        }
      } catch {
        // API not available
      }
    };
    load();
  }, [serverName, userId]);

  const submitRating = async (rating: number) => {
    setLoading(true);
    try {
      await apiClient.addRating(userId, serverName, rating);
      setUserRating(rating);

      const result = await apiClient.getRatings(serverName);
      setAverageRating(result.average_rating);
      setRatings(result.ratings);
    } catch (e) {
      console.error('Failed to submit rating:', e);
    }
    setLoading(false);
  };

  const getRatingCounts = () => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
    });
    return counts;
  };

  const ratingCounts = getRatingCounts();
  const totalRatings = ratings.length;

  return (
    <div>
      {/* Average Rating Display */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
        <div className="text-center sm:text-left flex-shrink-0">
          <div className="text-4xl font-bold text-gray-900">
            {averageRating > 0 ? averageRating.toFixed(1) : '--'}
          </div>
          <div className="flex items-center justify-center sm:justify-start mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                className={`${
                  star <= Math.round(averageRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">{totalRatings} rating{totalRatings !== 1 ? 's' : ''}</p>
        </div>

        {/* Rating Breakdown */}
        <div className="flex-1 space-y-1 w-full min-w-0">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingCounts[star] || 0;
            const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
            return (
              <div key={star} className="flex items-center space-x-2 text-sm">
                <span className="text-gray-600 w-2">{star}</span>
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-gray-400 w-6 text-xs">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Rating Input */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          {userRating > 0 ? 'Your Rating' : 'Rate this server'}
        </p>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => !loading && submitRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={loading}
              className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
            >
              <Star
                size={24}
                className={`${
                  star <= (hoverRating || userRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300 hover:text-yellow-300'
                } transition-colors`}
              />
            </button>
          ))}
          {userRating > 0 && (
            <span className="text-sm text-gray-500 ml-2">
              {userRating === 5 ? 'Excellent!' : userRating === 4 ? 'Good' : userRating === 3 ? 'Average' : userRating === 2 ? 'Poor' : 'Terrible'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});