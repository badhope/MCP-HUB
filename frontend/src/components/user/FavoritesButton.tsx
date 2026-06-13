import React from 'react';
import { Button } from '../ui/Button';
import { IconHeart } from '@tabler/icons-react';
import { useUserStore } from '../../store/useUserStore';
import * as userStore from '../../lib/userStore';
import type { Server } from '../../types';

interface FavoritesButtonProps {
  server?: Server;
  serverName?: string;
  userId?: string;
}

export const FavoritesButton = React.memo<FavoritesButtonProps>(({ server, serverName, userId: propUserId }) => {
  const favorites = useUserStore((s) => s.favorites);
  const storeUserId = useUserStore((s) => s.userId);
  const refresh = useUserStore((s) => s.refresh);
  
  const name = server?.name || serverName || '';
  const userId = propUserId || storeUserId;
  const isFavorite = favorites.includes(name);

  const handleClick = () => {
    if (isFavorite) {
      userStore.removeFavorite(userId, name);
    } else {
      userStore.addFavorite(userId, name);
    }
    refresh();
  };

  return (
    <Button
      size="sm"
      variant={isFavorite ? 'primary' : 'outline'}
      onClick={handleClick}
    >
      <IconHeart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
      {isFavorite ? 'Favorited' : 'Favorite'}
    </Button>
  );
});
