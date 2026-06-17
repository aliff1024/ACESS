'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function H5PPlayPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadH5PContent() {
      try {
        const { data, error } = await supabase
          .from('h5p_contents')
          .select('folder_path')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Content not found');

        setFolderPath(data.folder_path);
      } catch (err: any) {
        setError(err.message || 'Failed to load H5P content details');
      } finally {
        setLoading(false);
      }
    }

    loadH5PContent();
  }, [id]);

  useEffect(() => {
    if (loading || error || !folderPath) return;

    // Load h5p-standalone scripts and stylesheet
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.jsdelivr.net/npm/h5p-standalone@3.9.0/dist/styles/h5p.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/h5p-standalone@3.9.0/dist/main.bundle.js';
    script.async = true;
    script.onload = () => {
      const container = document.getElementById('h5p-player-container');
      if (!container) return;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdlryupwmydirgvxuixd.supabase.co';
      // Construct public folder URL
      const contentUrl = `${supabaseUrl}/storage/v1/object/public/h5p/${folderPath}`;

      // Initialize H5P Standalone
      const options = {
        h5pJsonPath: contentUrl,
        frameJs: 'https://cdn.jsdelivr.net/npm/h5p-standalone@3.9.0/dist/frame.bundle.js',
        frameCss: 'https://cdn.jsdelivr.net/npm/h5p-standalone@3.9.0/dist/styles/h5p.css',
      };

      // @ts-ignore
      new H5PStandalone.H5P(container, options).then(() => {
        // Setup xAPI tracking on H5P's dispatcher
        // @ts-ignore
        if (window.H5P && window.H5P.externalDispatcher) {
          // @ts-ignore
          window.H5P.externalDispatcher.on('xAPI', (event: any) => {
            window.parent.postMessage({
              type: 'h5p-xapi',
              contentId: id,
              statement: event.data.statement,
            }, '*');
          });
        }
      }).catch((err: any) => {
        console.error('H5P Standalone Init Error:', err);
      });
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(cssLink);
      document.body.removeChild(script);
    };
  }, [loading, error, folderPath, id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-600">
        <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-600" />
        <p className="text-sm font-medium">Loading interactive activity...</p>
      </div>
    );
  }

  if (error || !folderPath) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-red-600 p-4 text-center">
        <p className="font-semibold text-lg">Failed to load H5P Activity</p>
        <p className="text-sm text-gray-500 mt-1">{error || 'Invalid content definition'}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white p-2">
      <div id="h5p-player-container" className="w-full"></div>
    </div>
  );
}
