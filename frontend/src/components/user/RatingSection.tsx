import React from 'react';
import { IconStar } from '@tabler/icons-react';

interface RatingSectionProps {
  serverName: string;
  userId?: string;
}

export const RatingSection = React.memo<RatingSectionProps>(() => {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-2">Rate this server</h3>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className="p-1 hover:bg-accent rounded transition-colors"
            aria-label={`Rate ${star} stars`}
          >
            <IconStar size={20} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
});
