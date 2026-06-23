'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { fetchLessonComments, postLessonComment, deleteLessonComment, LessonComment } from '@/lib/community-api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LessonDiscussionProps {
  lessonId: string;
}

function CommentItem({ comment, currentUserId, onReply, onDelete }: { 
  comment: LessonComment; 
  currentUserId: string | undefined; 
  onReply: (parentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEducator = comment.user?.role === 'educator';
  const isAuthor = currentUserId === comment.user_id;

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      await onReply(comment.id, replyContent);
      setReplyContent('');
      setIsReplying(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-4">
      <div className={`flex gap-3 p-4 rounded-xl ${isEducator ? 'bg-purple-50 border border-purple-100' : 'bg-white border border-gray-100'}`}>
        <Avatar className="w-10 h-10 border border-gray-200">
          <AvatarImage src={comment.user?.avatar_url || ''} />
          <AvatarFallback className={isEducator ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}>
            {comment.user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900">{comment.user?.display_name || 'Anonymous User'}</span>
              {isEducator && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                  <ShieldCheck className="w-3 h-3" /> Instructor
                </span>
              )}
              <span className="text-xs text-gray-400">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            {isAuthor && (
              <button onClick={() => onDelete(comment.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete comment">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          
          <div className="mt-2">
            <button 
              onClick={() => setIsReplying(!isReplying)}
              className="text-xs font-medium text-gray-500 hover:text-purple-600 transition-colors"
            >
              Reply
            </button>
          </div>

          {isReplying && (
            <div className="mt-3 flex gap-2">
              <Textarea 
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[60px] text-sm resize-none"
              />
              <Button 
                onClick={handleReplySubmit} 
                disabled={isSubmitting || !replyContent.trim()}
                className="self-end bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 mt-3 space-y-3 border-l-2 border-gray-100 pl-4">
          {comment.replies.map(reply => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              currentUserId={currentUserId} 
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LessonDiscussion({ lessonId }: LessonDiscussionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    try {
      const data = await fetchLessonComments(lessonId);
      setComments(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const handlePostComment = async (parentId?: string, content?: string) => {
    const text = content || newComment;
    if (!text.trim()) return;

    if (!parentId) setSubmitting(true);
    
    try {
      await postLessonComment(lessonId, text, parentId);
      if (!parentId) setNewComment('');
      await loadComments(); // Reload to get fresh tree
      toast.success('Message posted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to post message');
    } finally {
      if (!parentId) setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await deleteLessonComment(commentId);
      await loadComments();
      toast.success('Comment deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete comment');
    }
  };

  return (
    <div className="mt-12 border-t border-gray-200 pt-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-gray-500" />
        <h3 className="text-xl font-bold text-gray-900">Class Discussion</h3>
      </div>

      {/* Main Input Area */}
      <div className="flex gap-3 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
        <Avatar className="w-10 h-10 border border-gray-200">
          <AvatarFallback className="bg-purple-100 text-purple-700">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex flex-col gap-2">
          <Textarea 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ask a question or share your thoughts..."
            className="min-h-[80px] text-sm resize-y bg-white"
          />
          <div className="flex justify-end">
            <Button 
              onClick={() => handlePostComment()} 
              disabled={submitting || !newComment.trim()}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Post Message
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No discussions yet.</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to start the conversation!</p>
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              currentUserId={user?.id}
              onReply={(parentId, content) => handlePostComment(parentId, content)}
              onDelete={handleDeleteComment}
            />
          ))
        )}
      </div>
    </div>
  );
}
