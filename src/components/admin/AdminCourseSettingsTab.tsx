'use client';

import { useState } from 'react';
import { Shield, Settings, TrendingUp, CheckCircle, Archive } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export default function AdminCourseSettingsTab({ courseId, initialCourse, onUpdate }: { courseId: string, initialCourse: any, onUpdate: () => void }) {
  const [course, setCourse] = useState(initialCourse);
  const [updating, setUpdating] = useState(false);

  const handleUpdateField = async (field: string, value: any) => {
    if (updating) return;
    setUpdating(true);
    try {
      await supabase.from('courses').update({ [field]: value }).eq('id', courseId);
      setCourse({ ...course, [field]: value });
      toast.success('Course updated');
      onUpdate();
    } catch {
      toast.error('Failed to update course');
    } finally {
      setUpdating(false);
    }
  };

  const toggleToggle = (field: string) => {
    handleUpdateField(field, !course[field]);
  };

  return (
    <div className="w-[96%] max-w-[1500px] mx-auto bg-white rounded-lg border border-gray-200 p-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <Shield className="w-6 h-6 text-purple-600" />
        System Course Settings
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Layout Type */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Course Layout</h3>
            <select
              value={course.course_layout_type || 'standard'}
              onChange={(e) => handleUpdateField('course_layout_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="standard">Standard</option>
              <option value="guided">Guided</option>
              <option value="simplified">Simplified</option>
              <option value="focused">Focused</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Determines how learners experience this course layout</p>
          </div>

          {/* Chapter Organization */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <h3 className="font-semibold text-gray-900">Chapter Organization</h3>
              <p className="text-sm text-gray-600 mt-1">Group lessons into chapters/modules</p>
            </div>
            <button
              onClick={() => toggleToggle('chapter_organization_enabled')}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${course.chapter_organization_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${course.chapter_organization_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Guided Learning */}
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div>
              <h3 className="font-semibold text-gray-900">Guided Learning Mode</h3>
              <p className="text-sm text-gray-600 mt-1">Enhanced progress tracking, milestones, and beginner-friendly navigation</p>
            </div>
            <button
              onClick={() => toggleToggle('guided_learning_enabled')}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${course.guided_learning_enabled ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${course.guided_learning_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Milestone Tracking */}
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div>
              <h3 className="font-semibold text-gray-900">Milestone Tracking</h3>
              <p className="text-sm text-gray-600 mt-1">Track learner progress with achievement milestones</p>
            </div>
            <button
              onClick={() => toggleToggle('milestone_tracking_enabled')}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${course.milestone_tracking_enabled ? 'bg-amber-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${course.milestone_tracking_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Learning Streaks */}
          <div className="flex items-center justify-between p-4 bg-rose-50 rounded-lg border border-rose-200">
            <div>
              <h3 className="font-semibold text-gray-900">Learning Streaks</h3>
              <p className="text-sm text-gray-600 mt-1">Encourage daily learning with streak tracking</p>
            </div>
            <button
              onClick={() => toggleToggle('learning_streaks_enabled')}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${course.learning_streaks_enabled ? 'bg-rose-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${course.learning_streaks_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Age Group */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Recommended Age Group</h3>
            <input
              type="text"
              value={course.recommended_age_group || ''}
              onChange={(e) => handleUpdateField('recommended_age_group', e.target.value)}
              placeholder="e.g. 8-12, 13-18, Adult"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
