'use client';

import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PdfViewer({ url, title }: { url: string; title: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-orange-600" />
          <div>
            <p className="font-medium text-gray-900">{title || 'PDF Document'}</p>
            <p className="text-sm text-gray-600">Viewing inline — scroll or download below</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
          <Download className="w-4 h-4 mr-2" /> Download
        </Button>
      </div>
      <div className="w-full h-[80vh] border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-100">
        <iframe
          src={url}
          className="w-full h-full"
          title={title || 'PDF Viewer'}
        />
      </div>
    </div>
  );
}
