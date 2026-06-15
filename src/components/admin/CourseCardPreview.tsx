'use client';

import { Crown, Star, BookOpen } from 'lucide-react';
import { Badge } from '../ui/badge';
import { stripHtml } from '@/lib/course-thumbnails';

interface CourseCardPreviewProps {
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  difficulty: string;
  guidedLearning?: boolean;
}

export function CourseCardPreview({
  title,
  description,
  thumbnail,
  category,
  difficulty,
  guidedLearning = true,
}: CourseCardPreviewProps) {
  const plainDescription = stripHtml(description);

  return (
    <div className="sticky top-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Learner preview</p>
      <div className="p-6 rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-white to-indigo-50/40 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt={title || 'Course preview'} className="w-full h-40 object-cover rounded-lg mb-4" />
        ) : (
          <div className="w-full h-40 rounded-lg mb-4 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
            <Crown className="w-16 h-16 text-indigo-600" />
          </div>
        )}

        <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-snug flex items-center gap-2 flex-wrap">
          {title || 'Course title'}
          <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3" /> Featured
          </Badge>
          {guidedLearning && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Guided</Badge>
          )}
        </h3>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 capitalize text-xs">
            {difficulty || 'beginner'}
          </Badge>
          {category && (
            <Badge variant="outline" className="text-gray-600 text-xs flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> {category}
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-600 line-clamp-3">
          {plainDescription || 'Your course description will appear here.'}
        </p>
      </div>
    </div>
  );
}
