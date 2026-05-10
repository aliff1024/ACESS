'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, BookOpen, Loader2, ArrowLeft } from 'lucide-react';
import { fetchFavoriteCourses } from '@/lib/learner-api';
import { useTranslation } from '@/lib/useTranslation';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavoriteCourses()
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => router.push('/learner')} className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> {t('course.backToDashboard')}
        </button>
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('favorites.title')}</h1>
            <p className="text-gray-600">{t('favorites.description')}</p>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('favorites.empty')}</h3>
            <p className="text-gray-500 mb-4">{t('favorites.emptyDesc')}</p>
            <Button onClick={() => router.push('/learner/courses')} className="bg-blue-600 hover:bg-blue-700 text-white">
              {t('favorites.browse')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="p-6 rounded-2xl border-2 border-gray-200 hover:border-red-300 hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer"
                onClick={() => router.push(`/learner/courses/${course.id}`)}>
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                ) : (
                  <div className="w-full h-40 bg-red-100 rounded-lg mb-4 flex items-center justify-center">
                    <Heart className="w-12 h-12 text-red-400" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-gray-100 text-gray-700 border">{course.difficulty_level || 'Beginner'}</Badge>
                  {course.category && <Badge variant="outline" className="text-gray-600">{course.category}</Badge>}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{course.description}</p>
                <div className="mt-auto">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">{t('course.viewCourse')}</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
