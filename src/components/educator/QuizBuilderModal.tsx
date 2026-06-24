'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Plus, X, CheckCircle, HelpCircle, Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createFullQuiz, fetchQuizWithQuestions } from '@/lib/educator-api';
import { MediaPickerModal } from '@/components/educator/MediaPickerModal';

interface AddQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  lessonId?: string;
  courseId?: string;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  imageUrl?: string;
  optionImages: string[];
}

const emptyQuestion = (): Question => ({
  id: Date.now().toString(),
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  explanation: '',
  imageUrl: '',
  optionImages: ['', '', '', ''],
});

export function QuizBuilderModal({ isOpen, onClose, onSave, lessonId, courseId }: AddQuizModalProps) {
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<{ questionId: string; optionIndex?: number } | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [hasExistingQuiz, setHasExistingQuiz] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    questionRefs.current = questionRefs.current.slice(0, questions.length);
  }, [questions.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = questionRefs.current.findIndex((ref) => ref === entry.target);
            if (idx >= 0) setActiveQuestionIndex(idx);
          }
        }
      },
      { root: container, rootMargin: '-100px 0px -100px 0px' }
    );
    questionRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [questions.length]);

  const scrollToQuestion = useCallback((idx: number) => {
    const el = questionRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (!isOpen || !lessonId) return;
    const load = async () => {
      setLoadingExisting(true);
      try {
        const quiz = await fetchQuizWithQuestions(lessonId);
        if (quiz) {
          setHasExistingQuiz(true);
          setQuizTitle(quiz.title || '');
          setQuestions(
            (quiz.quiz_questions || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => a.sequence_order - b.sequence_order).map((q: Record<string, unknown>) => ({
              id: q.id,
              question: q.question_text,
              options: (q.quiz_options || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => a.sequence_order - b.sequence_order).map((o: Record<string, unknown>) => o.option_text),
              correctAnswer: (q.quiz_options || []).findIndex((o: Record<string, unknown>) => o.is_correct),
              explanation: '',
              imageUrl: q.image_url || '',
              optionImages: (q.quiz_options || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => a.sequence_order - b.sequence_order).map((o: Record<string, unknown>) => o.image_url || ''),
            }))
          );
        } else {
          setHasExistingQuiz(false);
          setQuizTitle('');
          setQuestions([emptyQuestion()]);
        }
      } catch {
        setHasExistingQuiz(false);
      } finally {
        setLoadingExisting(false);
      }
    };
    load();
  }, [isOpen, lessonId]);

  const addQuestion = () => {
    setQuestions([...questions, emptyQuestion()]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: string | number) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((opt, i) => (i === optionIndex ? value : opt)) }
          : q
      )
    );
  };

  const handleImageUpload = async (questionId: string, optionIndex?: number) => {
    setUploadingFor({ questionId, optionIndex });
    setMediaPickerOpen(true);
  };

  const onMediaSelected = (url: string) => {
    if (!uploadingFor) return;
    const { questionId, optionIndex } = uploadingFor;
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        if (optionIndex === undefined) return { ...q, imageUrl: url };
        const imgs = [...(q.optionImages || ['', '', '', ''])];
        imgs[optionIndex] = url;
        return { ...q, optionImages: imgs };
      })
    );
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!lessonId) {
      toast.error('No lesson selected. Create a lesson first.');
      return;
    }
    setIsSaving(true);
    try {
      const { data: existing } = await supabase.from('quizzes').select('id').eq('lesson_id', lessonId).maybeSingle();
      if (existing) {
        await supabase.from('quizzes').delete().eq('id', existing.id);
      }
      await createFullQuiz(
        { lesson_id: lessonId, title: quizTitle || 'Untitled Quiz' },
        questions.map((q, i) => ({
          question_text: q.question,
          question_type: 'multiple_choice',
          sequence_order: i + 1,
          image_url: q.imageUrl || null,
          options: q.options.filter((o) => o.trim()).map((opt, oi) => ({
            option_text: opt,
            is_correct: oi === q.correctAnswer,
            sequence_order: oi + 1,
            image_url: q.optionImages?.[oi] || null,
          })),
        }))
      );

      toast.success('Quiz saved!');
      onSave();
      setQuizTitle('');
      setQuestions([emptyQuestion()]);
      setHasExistingQuiz(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save quiz';
      toast.error(msg);
      console.error('Quiz save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl mb-2">{hasExistingQuiz ? 'Edit Quiz' : 'Create Quiz'}</DialogTitle>
          <DialogDescription className="text-gray-600">
            {hasExistingQuiz ? 'Modify quiz questions and options' : 'Add questions to test learner understanding'}
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="flex gap-6">
            {/* ── Sidebar Question Navigator ── */}
            {questions.length > 0 && (
              <div className="flex flex-col gap-1.5 w-16 shrink-0 pt-2 sticky top-0 max-h-[75vh] overflow-y-auto px-1 pb-4">
                {questions.map((q, i) => {
                  const hasText = q.question.trim().length > 0;
                  const hasAllOptions = q.options.every((o) => o.trim().length > 0);
                  const hasCorrect = q.correctAnswer >= 0;
                  const isComplete = hasText && hasAllOptions && hasCorrect;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => scrollToQuestion(i)}
                      className={`relative flex items-center justify-center w-12 h-12 rounded-xl text-sm font-bold transition-all ${
                        i === activeQuestionIndex
                          ? 'bg-purple-600 text-white shadow-md scale-110'
                          : isComplete
                          ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                      }`}
                      title={`Question ${i + 1}${isComplete ? ' (complete)' : ''}`}
                    >
                      {i + 1}
                      {isComplete && i !== activeQuestionIndex && (
                        <CheckCircle className="absolute -top-1 -right-1 w-3.5 h-3.5 text-green-600" />
                      )}
                    </button>
                  );
                })}
                <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                  <span className="text-xs font-semibold text-gray-500">{questions.length}</span>
                  <span className="text-xs text-gray-400 block">total</span>
                </div>
              </div>
            )}

            <div ref={scrollContainerRef} className="flex-1 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Quiz Title *</label>
              <Input
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g., Lesson 1 Quiz: Web Accessibility Basics"
                className="text-lg py-6"
              />
            </div>

            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Quiz Best Practices</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Keep questions clear and focused on one concept</li>
                  <li>Provide helpful explanations for correct answers</li>
                  <li>Use 4 answer options when possible</li>
                  <li>Add images to questions and options to support visual learning</li>
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div
                  key={question.id}
                  ref={(el) => { questionRefs.current[qIndex] = el; }}
                  className="p-6 bg-gray-50 border-2 border-gray-200 rounded-2xl scroll-mt-4"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-bold text-gray-900">Question {qIndex + 1}</h4>
                    {questions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(question.id)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Question Text *</label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                        placeholder="Enter your question here"
                        rows={3}
                        className="text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Question Image (optional)</label>
                      {question.imageUrl ? (
                        <div className="relative mt-3 shrink-0 self-start">
                        <img src={question.imageUrl} alt="" className="w-64 h-64 object-contain rounded-lg border border-gray-300 shadow-sm bg-gray-50" />
                        <button type="button" onClick={() => updateQuestion(question.id, 'imageUrl', null)}
                          className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100">
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      ) : (
                        <button type="button"
                          disabled={uploadingFor?.questionId === question.id && uploadingFor?.optionIndex === undefined}
                          onClick={() => handleImageUpload(question.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          {uploadingFor?.questionId === question.id && uploadingFor?.optionIndex === undefined
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Image className="w-3.5 h-3.5" />}
                          Add Image
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Answer Options *</label>
                      <div className="space-y-3">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`correct-${question.id}`}
                              checked={question.correctAnswer === oIndex}
                              onChange={() => updateQuestion(question.id, 'correctAnswer', oIndex)}
                              className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 shrink-0"
                            />
                            <Input
                              value={option}
                              onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                              className="flex-1"
                            />
                            {question.correctAnswer === oIndex && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}

                            {question.optionImages?.[oIndex] ? (
                              <div className="relative shrink-0 mt-2 w-full max-w-[250px]">
                                <img src={question.optionImages[oIndex]} alt="" className="w-full h-48 rounded object-contain border border-gray-300 bg-gray-50" />
                                <button type="button" onClick={() => {
                                  const imgs = [...(question.optionImages || ['', '', '', ''])];
                                  imgs[oIndex] = '';
                                  setQuestions(prev => prev.map(q => q.id === question.id ? { ...q, optionImages: imgs } : q));
                                }}
                                  className="absolute -top-1 -right-1 p-0.5 bg-white/90 rounded-full shadow-sm">
                                  <X className="w-3 h-3 text-red-600" />
                                </button>
                              </div>
                            ) : (
                              <button type="button"
                                disabled={uploadingFor?.questionId === question.id && uploadingFor?.optionIndex === oIndex}
                                onClick={() => handleImageUpload(question.id, oIndex)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                                title="Add option image"
                              >
                                {uploadingFor?.questionId === question.id && uploadingFor?.optionIndex === oIndex
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Image className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Select the radio button to mark the correct answer
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Explanation (Optional but Recommended)
                      </label>
                      <Textarea
                        value={question.explanation}
                        onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                        placeholder="Explain why this is the correct answer and provide additional context"
                        rows={3}
                        className="text-base"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={addQuestion}
              variant="outline"
              className="w-full border-2 border-dashed border-purple-600 text-purple-600 hover:bg-purple-50 py-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Another Question
            </Button>

            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Total Questions:</span> {questions.length}
              </p>
            </div>
            </div>
          </div>
        )}

        {!loadingExisting && (
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={onClose} variant="outline" className="px-8 py-6">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !lessonId || !quizTitle || questions.some((q) => !q.question || q.options.some((o) => !o))}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 ml-auto"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              {isSaving ? 'Saving...' : 'Save Quiz'}
            </Button>
          </div>
        )}
      </DialogContent>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        courseId={courseId || ''}
        lessonId={lessonId || null}
        accept="image/*"
        onSelect={(url) => {
          onMediaSelected(url);
          setMediaPickerOpen(false);
          setUploadingFor(null);
        }}
      />
    </Dialog>
  );
}
