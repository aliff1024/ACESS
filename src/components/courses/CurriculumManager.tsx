import React from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { 
  GripVertical, Edit, Copy, Trash2, Eye, EyeOff, 
  Video, FileText, CheckCircle, FileQuestion, BookMarked, BrainCircuit,
  Clock, Plus, Layers, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/ConfirmAction';

export interface CurriculumLesson {
  id: string;
  title: string;
  sequence_order: number;
  status: string;
  lesson_type?: string;
  estimated_duration?: number | null;
  visibility_status?: string;
  chapter_id?: string | null;
  has_quiz?: boolean;
  video_url?: string;
}

export interface CurriculumChapter {
  id: string;
  title: string;
  description?: string | null;
  lesson_count?: number;
}

interface CurriculumManagerProps {
  lessons: CurriculumLesson[];
  chapters?: CurriculumChapter[];
  useChapters?: boolean;
  onReorderLessons: (newOrder: string[]) => void;
  onSelectLesson?: (id: string) => void;
  selectedLessonId?: string | null;
  
  // Actions
  onAddLesson?: (chapterId?: string) => void;
  onEditLesson: (id: string) => void;
  onDuplicateLesson?: (id: string) => void;
  onDeleteLesson: (id: string) => void;
  onToggleVisibility?: (id: string, currentVisibility: string) => void;
  
  // Chapter Actions
  onAddChapter?: () => void;
  onEditChapter?: (id: string) => void;
  onDeleteChapter?: (id: string) => void;
  onMoveChapter?: (id: string, direction: 'up' | 'down') => void;
  
  // Extra Actions
  onSaveTemplate?: (id: string, title: string) => void;
  onEditQuiz?: (id: string, hasQuiz: boolean) => void;
}

export function CurriculumManager({
  lessons,
  chapters = [],
  useChapters = false,
  onReorderLessons,
  onSelectLesson,
  selectedLessonId,
  onAddLesson,
  onEditLesson,
  onDuplicateLesson,
  onDeleteLesson,
  onToggleVisibility,
  onAddChapter,
  onEditChapter,
  onDeleteChapter,
  onMoveChapter,
  onSaveTemplate,
  onEditQuiz,
}: CurriculumManagerProps) {

  const getLessonIcon = (type?: string, hasQuiz?: boolean, videoUrl?: string) => {
    if (type === 'video' || videoUrl) return <Video className="w-4 h-4 text-rose-500" />;
    if (type === 'quiz' || hasQuiz) return <FileQuestion className="w-4 h-4 text-amber-500" />;
    if (type === 'practice') return <BrainCircuit className="w-4 h-4 text-green-500" />;
    if (type === 'reading') return <BookMarked className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const LessonRow = ({ lesson }: { lesson: CurriculumLesson }) => {
    const isSelected = selectedLessonId === lesson.id;
    return (
      <Reorder.Item
        value={lesson}
        id={lesson.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileDrag={{ scale: 1.02, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 50 }}
        className={`bg-white rounded-xl border transition-all flex items-center p-3 gap-4 mb-3 ${
          isSelected 
            ? 'border-blue-500 shadow-md ring-1 ring-blue-500' 
            : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
        }`}
      >
        <div className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <GripVertical className="w-5 h-5" />
        </div>
        
        <div 
          className="flex-1 flex items-center gap-4 cursor-pointer" 
          onClick={() => onSelectLesson?.(lesson.id)}
        >
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
            {getLessonIcon(lesson.lesson_type, lesson.has_quiz, lesson.video_url)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-400 tracking-wider">
                STEP {lesson.sequence_order}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                lesson.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {lesson.status}
              </span>
              {lesson.visibility_status === 'hidden' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-gray-100 text-gray-500 flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> Hidden
                </span>
              )}
            </div>
            <h4 className="font-semibold text-gray-900 truncate pr-4">{lesson.title}</h4>
          </div>

          {lesson.estimated_duration && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-lg shrink-0">
              <Clock className="w-3.5 h-3.5" />
              {lesson.estimated_duration} min
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 border-l border-gray-100 pl-4 ml-2">
          {onToggleVisibility && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900"
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(lesson.id, lesson.visibility_status || 'visible'); }}
            >
              {lesson.visibility_status === 'hidden' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          )}
          {onEditQuiz && (
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 w-8 p-0 ${lesson.has_quiz || lesson.lesson_type === 'quiz' ? 'text-amber-500 hover:text-amber-600' : 'text-gray-400 hover:text-amber-500'}`}
              onClick={(e) => { e.stopPropagation(); onEditQuiz(lesson.id, !!lesson.has_quiz || lesson.lesson_type === 'quiz'); }}
              title={lesson.has_quiz || lesson.lesson_type === 'quiz' ? 'Edit Quiz' : 'Add Quiz'}
            >
              <FileQuestion className="w-4 h-4" />
            </Button>
          )}
          {onDuplicateLesson && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
              onClick={(e) => { e.stopPropagation(); onDuplicateLesson(lesson.id); }}
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}
          {onSaveTemplate && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-gray-500 hover:text-green-600"
              onClick={(e) => { e.stopPropagation(); onSaveTemplate(lesson.id, lesson.title); }}
              title="Save as Template"
            >
              <BookMarked className="w-4 h-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
            onClick={(e) => { e.stopPropagation(); onEditLesson(lesson.id); }}
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <ConfirmAction
            title="Delete Lesson"
            description="Are you sure you want to delete this lesson? This action cannot be undone."
            confirmText="Delete"
            confirmClassName="bg-red-600 hover:bg-red-700 text-white"
            onConfirm={() => onDeleteLesson(lesson.id)}
          >
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </ConfirmAction>
        </div>
      </Reorder.Item>
    );
  };

  const handleReorder = (newLessons: CurriculumLesson[], chapterId?: string | null) => {
    // If not using chapters, just pass all IDs
    if (!useChapters) {
      onReorderLessons(newLessons.map(l => l.id));
      return;
    }

    // If using chapters, we are only reordering within a specific subset.
    // We need to merge this new order into the full list.
    const subsetIds = new Set(newLessons.map(l => l.id));
    const fullOrder = [...lessons];
    
    // Replace the items that match the subset with the newly ordered items
    let replacementIndex = 0;
    for (let i = 0; i < fullOrder.length; i++) {
      if (subsetIds.has(fullOrder[i].id)) {
        fullOrder[i] = newLessons[replacementIndex];
        replacementIndex++;
      }
    }
    
    onReorderLessons(fullOrder.map(l => l.id));
  };

  if (!useChapters) {
    return (
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Curriculum</h2>
          {onAddLesson && (
            <Button onClick={() => onAddLesson()} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Lesson
            </Button>
          )}
        </div>
        
        {lessons.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-700 mb-1">No lessons yet</p>
            <p className="text-gray-500 mb-4">Start building your course curriculum by adding lessons.</p>
            {onAddLesson && (
              <Button onClick={() => onAddLesson()} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add First Lesson
              </Button>
            )}
          </div>
        ) : (
          <Reorder.Group axis="y" values={lessons} onReorder={(l) => handleReorder(l)} className="space-y-0">
            <AnimatePresence>
              {lessons.map(lesson => <LessonRow key={lesson.id} lesson={lesson} />)}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>
    );
  }

  // Chapter-based Layout
  const getChapterLessons = (chapterId: string | null) => 
    lessons.filter(l => (l.chapter_id || null) === chapterId).sort((a, b) => a.sequence_order - b.sequence_order);

  const ungroupedLessons = getChapterLessons(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Course Curriculum</h2>
        <div className="flex gap-2">
          {onAddChapter && (
            <Button onClick={onAddChapter} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
              <Layers className="w-4 h-4 mr-2" /> Add Chapter
            </Button>
          )}
          {onAddLesson && (
            <Button onClick={() => onAddLesson()} className="bg-purple-700 hover:bg-purple-800 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Lesson
            </Button>
          )}
        </div>
      </div>

      {chapters.length === 0 && ungroupedLessons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Build Your Curriculum</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">Organize your course by adding chapters and populating them with lessons.</p>
          <div className="flex items-center justify-center gap-4">
            {onAddChapter && (
              <Button onClick={onAddChapter} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                <Plus className="w-4 h-4 mr-2" /> Add Chapter
              </Button>
            )}
            {onAddLesson && (
              <Button onClick={() => onAddLesson()} className="bg-purple-700 hover:bg-purple-800 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Lesson
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {chapters.map((ch, idx) => {
            const chLessons = getChapterLessons(ch.id);
            return (
              <div key={ch.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5 mr-2">
                      <button onClick={() => onMoveChapter?.(ch.id, 'up')} disabled={idx === 0} className="p-0.5 text-gray-400 hover:bg-gray-200 rounded hover:text-gray-700 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                      <button onClick={() => onMoveChapter?.(ch.id, 'down')} disabled={idx === chapters.length - 1} className="p-0.5 text-gray-400 hover:bg-gray-200 rounded hover:text-gray-700 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{ch.title}</h3>
                      {ch.description && <p className="text-sm text-gray-500">{ch.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg mr-2">
                      {chLessons.length} lessons
                    </span>
                    {onAddLesson && (
                      <Button onClick={() => onAddLesson(ch.id)} variant="ghost" size="sm" className="text-purple-600 hover:bg-purple-100">
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    )}
                    {onEditChapter && (
                      <Button onClick={() => onEditChapter(ch.id)} variant="ghost" size="sm" className="text-gray-500 hover:text-purple-600 hover:bg-purple-50 w-8 h-8 p-0">
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {onDeleteChapter && (
                      <ConfirmAction
                        title="Delete Chapter"
                        description="Are you sure you want to delete this chapter? Its lessons will become ungrouped."
                        confirmText="Delete"
                        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
                        onConfirm={() => onDeleteChapter(ch.id)}
                      >
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 hover:bg-red-50 w-8 h-8 p-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </ConfirmAction>
                    )}
                  </div>
                </div>

                {chLessons.length > 0 ? (
                  <Reorder.Group axis="y" values={chLessons} onReorder={(l) => handleReorder(l, ch.id)} className="space-y-0 min-h-[50px]">
                    <AnimatePresence>
                      {chLessons.map(lesson => <LessonRow key={lesson.id} lesson={lesson} />)}
                    </AnimatePresence>
                  </Reorder.Group>
                ) : (
                  <div className="bg-white/50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
                    <p className="text-sm text-gray-500">This chapter is empty.</p>
                  </div>
                )}
              </div>
            );
          })}

          {ungroupedLessons.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mt-8">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-bold text-gray-900">Ungrouped Lessons</h3>
              </div>
              <Reorder.Group axis="y" values={ungroupedLessons} onReorder={(l) => handleReorder(l, null)} className="space-y-0">
                <AnimatePresence>
                  {ungroupedLessons.map(lesson => <LessonRow key={lesson.id} lesson={lesson} />)}
                </AnimatePresence>
              </Reorder.Group>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
