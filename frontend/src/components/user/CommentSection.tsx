import React from 'react';

interface CommentSectionProps {
  serverName: string;
  userId?: string;
}

export const CommentSection = React.memo<CommentSectionProps>(() => {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-2">Comments</h3>
      <p className="text-sm text-muted-foreground">Comments coming soon.</p>
    </div>
  );
});
