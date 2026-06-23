'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  fetchLessonCheckpoints,
  createLessonCheckpoint,
  deleteLessonCheckpoint,
  type LessonCheckpoint,
} from '@/lib/educator-api';
import { toast } from 'sonner';

const CHECKPOINT_TYPES = [
  { value: 'reflection', label: 'Reflection' },
  { value: 'practice', label: 'Practice' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'activity', label: 'Activity' },
  { value: 'milestone', label: 'Milestone' },
] as const;

interface LessonCheckpointBuilderProps {
  lessonId: string | null;
  enabled: boolean;
}

export function LessonCheckpointBuilder({ lessonId, enabled }: LessonCheckpointBuilderProps) {
  const [checkpoints, setCheckpoints] = useState<LessonCheckpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [checkpointType, setCheckpointType] = useState<string>('reflection');
  const [required, setRequired] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId || !enabled) {
      setCheckpoints([]);
      return;
    }
    setLoading(true);
    fetchLessonCheckpoints(lessonId)
      .then(setCheckpoints)
      .catch(() => toast.error('Failed to load checkpoints'))
      .finally(() => setLoading(false));
  }, [lessonId, enabled]);

  const handleAdd = async () => {
    if (!lessonId || !title.trim()) return;
    setSaving(true);
    try {
      const created = await createLessonCheckpoint(lessonId, {
        title: title.trim(),
        description: description.trim() || undefined,
        checkpoint_type: checkpointType,
        required,
      });
      setCheckpoints((prev) => [...prev, created]);
      setTitle('');
      setDescription('');
      setCheckpointType('reflection');
      setRequired(true);
      toast.success('Checkpoint added');
    } catch {
      toast.error('Failed to add checkpoint');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleting) return;
    setDeleting(id);
    try {
      await deleteLessonCheckpoint(id);
      setCheckpoints((prev) => prev.filter((c) => c.id !== id));
      toast.success('Checkpoint removed');
    } catch {
      toast.error('Failed to remove checkpoint');
    } finally {
      setDeleting(null);
    }
  };

  if (!enabled) return null;

  return (
    <div className="pt-2 border-t border-gray-100 space-y-3">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-semibold text-gray-900">Lesson Checkpoints</span>
        <Badge variant="secondary" className="text-[10px]">{checkpoints.length}</Badge>
      </div>
      <p className="text-xs text-gray-500">
        Custom check-in prompts shown between sections. Sequence order maps to section number (1st checkpoint → after section 1).
      </p>

      {!lessonId ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Save the lesson first, then edit it to add checkpoints.
        </p>
      ) : loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {checkpoints.length > 0 && (
            <div className="space-y-2">
              {checkpoints.map((cp, i) => (
                <div key={cp.id} className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-500">After section {i + 1}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{cp.checkpoint_type}</Badge>
                      {cp.required && <Badge className="text-[10px] bg-orange-100 text-orange-800">Required</Badge>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{cp.title}</p>
                    {cp.description && <p className="text-xs text-gray-600 mt-0.5">{cp.description}</p>}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(cp.id)} disabled={deleting === cp.id} className="text-red-500 hover:text-red-700 shrink-0">
                    {deleting === cp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 p-3 border border-dashed border-gray-300 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Did you understand this part?" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={checkpointType} onValueChange={setCheckpointType}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHECKPOINT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description / hint (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional guidance or reflection prompt..." className="text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="cp-required" checked={required} onCheckedChange={setRequired} />
                <Label htmlFor="cp-required" className="text-xs">Required to continue</Label>
              </div>
              <Button type="button" size="sm" onClick={handleAdd} disabled={!title.trim() || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Add
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
