'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Edit, Trash2, Award, Trophy, Save, X, Star, Medal, Target, Shield, Zap, Footprints, BookOpen, GraduationCap, Flame, Heart } from 'lucide-react';

const BADGE_ICONS = [
  { id: 'Trophy', icon: Trophy },
  { id: 'Award', icon: Award },
  { id: 'Star', icon: Star },
  { id: 'Medal', icon: Medal },
  { id: 'Target', icon: Target },
  { id: 'Shield', icon: Shield },
  { id: 'Zap', icon: Zap },
  { id: 'Footprints', icon: Footprints },
  { id: 'BookOpen', icon: BookOpen },
  { id: 'GraduationCap', icon: GraduationCap },
  { id: 'Flame', icon: Flame },
  { id: 'Heart', icon: Heart }
];

interface AchievementBuilderProps {
  courseId: string;
}

export interface CourseAchievement {
  id: string;
  course_id: string;
  name: string;
  description: string;
  icon_url: string | null;
  requirement_type: string;
  requirement_threshold: number;
}

export default function AchievementBuilder({ courseId }: AchievementBuilderProps) {
  const [achievements, setAchievements] = useState<CourseAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CourseAchievement>>({
    name: '',
    description: '',
    icon_url: '',
    requirement_type: 'progress',
    requirement_threshold: 100
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, [courseId]);

  const loadAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('course_achievements')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true });
        
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('The course_achievements table does not exist yet. Please run the SQL migration to create it.');
          return;
        }
        throw error;
      }
      setAchievements(data || []);
    } catch (err) {
      console.error('Achievement loading error:', err);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ach: CourseAchievement) => {
    setEditingId(ach.id);
    setFormData({
      name: ach.name,
      description: ach.description,
      icon_url: ach.icon_url,
      requirement_type: ach.requirement_type,
      requirement_threshold: ach.requirement_threshold
    });
  };

  const handleAddNew = () => {
    setEditingId('new');
    setFormData({
      name: '',
      description: '',
      icon_url: '',
      requirement_type: 'progress',
      requirement_threshold: 100
    });
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return;
    try {
      const { error } = await supabase.from('course_achievements').delete().eq('id', id);
      if (error) throw error;
      toast.success('Achievement deleted');
      loadAchievements();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete achievement');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description) {
      toast.error('Name and description are required');
      return;
    }
    
    setSaving(true);
    try {
      if (editingId === 'new') {
        const { error } = await supabase.from('course_achievements').insert({
          course_id: courseId,
          name: formData.name,
          description: formData.description,
          icon_url: formData.icon_url,
          requirement_type: formData.requirement_type,
          requirement_threshold: formData.requirement_threshold
        });
        if (error) throw error;
        toast.success('Achievement created!');
      } else {
        const { error } = await supabase.from('course_achievements').update({
          name: formData.name,
          description: formData.description,
          icon_url: formData.icon_url,
          requirement_type: formData.requirement_type,
          requirement_threshold: formData.requirement_threshold
        }).eq('id', editingId);
        if (error) throw error;
        toast.success('Achievement updated!');
      }
      setEditingId(null);
      loadAchievements();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save achievement');
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="w-[96%] max-w-[1500px] mx-auto bg-white rounded-lg border border-gray-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Course Achievements</h2>
          <p className="text-sm text-gray-500 mt-1">Create badges that learners can earn by completing specific milestones.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={editingId !== null}>
          <Plus className="w-4 h-4 mr-2" /> New Achievement
        </Button>
      </div>

      <div className="space-y-6">
        {editingId && (
          <Card className="p-6 border-blue-200 bg-blue-50/30">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingId === 'new' ? 'Create Achievement' : 'Edit Achievement'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Badge Name</label>
                  <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Fast Learner" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                  <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="What did they do to earn this?" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Badge Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {BADGE_ICONS.map(({ id, icon: IconComponent }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon_url: id })}
                        className={`aspect-square rounded-md flex items-center justify-center transition-all ${
                          formData.icon_url === id 
                            ? 'bg-blue-100 text-blue-600 border-2 border-blue-500' 
                            : 'bg-white text-gray-400 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Requirement Type</label>
                  <select 
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    value={formData.requirement_type}
                    onChange={e => setFormData({ ...formData, requirement_type: e.target.value })}
                  >
                    <option value="progress">Course Progress (%)</option>
                    <option value="lesson">Lessons Completed (Count)</option>
                    <option value="quiz">Average Quiz Score (%)</option>
                    <option value="streak">Learning Streak (Days)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Requirement Threshold</label>
                  <Input 
                    type="number" 
                    value={formData.requirement_threshold} 
                    onChange={e => setFormData({ ...formData, requirement_threshold: parseInt(e.target.value) || 0 })} 
                    placeholder="e.g. 100" 
                  />
                  <p className="text-xs text-gray-500 mt-1">The number required to unlock this badge (e.g. 100 for 100% progress).</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-blue-100">
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save Achievement
              </Button>
              <Button onClick={handleCancel} variant="ghost" disabled={saving}>Cancel</Button>
            </div>
          </Card>
        )}

        {achievements.length === 0 && !editingId ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No achievements created yet</p>
            <p className="text-sm text-gray-400 mt-1">Create badges to gamify the learning experience</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map(ach => (
              <Card key={ach.id} className="p-5 flex flex-col hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      {ach.icon_url ? (() => {
                        // Check if icon_url matches a predefined badge ID, otherwise use a fallback
                        const badge = BADGE_ICONS.find(b => b.id === ach.icon_url) || { icon: Award };
                        const Icon = badge.icon;
                        return <Icon className="w-6 h-6" />;
                      })() : <Award className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{ach.name}</h4>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit mt-1">
                        {ach.requirement_type} {ach.requirement_threshold}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 flex-1">{ach.description}</p>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(ach)} className="flex-1 h-8 text-xs">
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(ach.id)} className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
