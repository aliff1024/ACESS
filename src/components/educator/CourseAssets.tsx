'use client';

import { useState, useEffect } from 'react';
import { Search, FileText, FileType, Trash2, Download, Eye, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { fetchLessonAssets, deleteLessonAsset, fetchLessonsWithQuizzes } from '@/lib/educator-api';
import type { LessonAsset, LessonWithQuiz } from '@/lib/educator-api';

interface CourseAssetsProps {
  courseId: string;
}

export default function CourseAssets({ courseId }: CourseAssetsProps) {
  const [lessons, setLessons] = useState<LessonWithQuiz[]>([]);
  const [allAssets, setAllAssets] = useState<(LessonAsset & { lessonTitle: string; lessonOrder: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    try {
      const l = await fetchLessonsWithQuizzes(courseId);
      setLessons(l);
      const assetPromises = l.map(async (lesson) => {
        const assets = await fetchLessonAssets(lesson.id);
        return assets.map((a) => ({ ...a, lessonTitle: lesson.title, lessonOrder: lesson.sequence_order }));
      });
      const results = await Promise.all(assetPromises);
      setAllAssets(results.flat());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load() }, [courseId]);

  const handleDelete = async (assetId: string, lessonId: string) => {
    try {
      await deleteLessonAsset(assetId);
      toast.success('Asset removed');
      load();
    } catch { toast.error('Failed to delete asset') }
  };

  const filtered = allAssets.filter((a) =>
    a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Assets</h2>
        <p className="text-gray-600">All downloadable resources across your lessons</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card className="p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center"><FileType className="w-5 h-5" /></div>
            <span className="text-sm text-gray-600">Total Assets</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{allAssets.length}</p>
        </Card>
        <Card className="p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5" /></div>
            <span className="text-sm text-gray-600">Lessons with Assets</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{new Set(allAssets.map((a) => a.lesson_id)).size}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search assets by name or lesson..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Assets List */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((asset) => (
            <div key={asset.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{asset.title || 'Untitled PDF'}</h3>
                  <p className="text-sm text-gray-600 mb-2">Lesson {asset.lessonOrder}: {asset.lessonTitle}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(asset.url, '_blank')}>
                      <Download className="w-3 h-3 mr-1" /> Download
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(asset.id, asset.lesson_id)} className="text-red-600">
                      <Trash2 className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 border-2 border-dashed border-gray-300 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {searchQuery ? 'No assets found' : 'No assets yet'}
          </h3>
          <p className="text-gray-500">
            {searchQuery ? 'Try adjusting your search' : 'Upload PDF files to your lessons to see them here.'}
          </p>
        </Card>
      )}
    </div>
  );
}
