'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { submitH5PResponse } from '@/lib/learner-api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface H5PViewerProps {
  content: {
    id: string;
    title: string;
    embed_url: string;
    width?: string;
    height?: string;
    h5p_mode: 'external' | 'self_hosted';
    library_name?: string | null;
  };
}

export function H5PViewer({ content }: H5PViewerProps) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Get current user ID for recording xAPI responses
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (content.h5p_mode !== 'self_hosted' || !userId) return;

    const handleMessage = async (event: MessageEvent) => {
      // Validate that the message is from our player
      if (event.data?.type === 'h5p-xapi' && event.data?.contentId === content.id) {
        const statement = event.data.statement;
        console.log('H5P xAPI Event Received:', statement);

        // Extract score/completion details if they exist
        const result = statement.result;
        const score = result?.score?.raw ?? null;
        const maxScore = result?.score?.max ?? null;
        const completed = result?.completion ?? false;

        try {
          await submitH5PResponse(
            userId,
            content.id,
            score,
            maxScore,
            completed,
            statement
          );

          if (score !== null && maxScore !== null) {
            toast.success(`Progress recorded! Score: ${score}/${maxScore}`, {
              description: `Activity: ${content.title}`,
            });
          } else if (completed) {
            toast.success(`Activity completed!`, {
              description: `Activity: ${content.title}`,
            });
          }
        } catch (err) {
          console.error('Failed to submit xAPI statement to Supabase:', err);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [content.id, content.title, content.h5p_mode, userId]);

  const targetSrc = content.h5p_mode === 'self_hosted'
    ? `/h5p/play/${content.id}`
    : content.embed_url;

  return (
    <Card className="p-3 border-slate-200 bg-white relative overflow-hidden group">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-sm font-semibold text-slate-800">{content.title}</span>
        </div>
        <Badge variant={content.h5p_mode === 'self_hosted' ? 'default' : 'secondary'} className="text-[10px] uppercase font-bold">
          {content.h5p_mode === 'self_hosted' ? 'Self-Hosted' : 'External Embed'}
        </Badge>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-100" style={{ height: content.height || '500px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={targetSrc}
          title={content.title}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </Card>
  );
}
