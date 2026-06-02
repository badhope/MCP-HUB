import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { apiClient, Comment } from '../../lib/api';

interface CommentSectionProps {
  serverName: string;
  userId?: string;
}

export const CommentSection = React.memo<CommentSectionProps>(({
  serverName,
  userId = 'default-user',
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const result = await apiClient.getComments(serverName);
      setComments(result.comments);
    } catch {
      setComments([]);
    }
  }, [serverName]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.addComment(userId, serverName, newComment.trim());
      setNewComment('');
      await loadComments();
    } catch (e) {
      console.error('Failed to submit comment:', e);
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      {/* Comment Input */}
      <div className="mb-6">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {userId.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your experience or ask a question..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-400">Press Enter to send, Shift+Enter for new line</p>
              <button
                onClick={submitComment}
                disabled={!newComment.trim() || submitting}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Send size={14} />
                <span>{submitting ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No comments yet. Be the first to share!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3 animate-fadeIn">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {comment.user_id.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{comment.user_id}</span>
                  <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});