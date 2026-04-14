'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Plus, X, CheckCircle, HelpCircle } from 'lucide-react';

interface AddQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export function QuizBuilderModal({ isOpen, onClose, onSave }: AddQuizModalProps) {
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
    },
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now().toString(),
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
      },
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: string, value: any) => {
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

  const handleSave = () => {
    onSave();
    setQuizTitle('');
    setQuestions([
      {
        id: '1',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
      },
    ]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl mb-2">Create Quiz</DialogTitle>
          <DialogDescription className="text-gray-600">
            Add questions to test learner understanding
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((question, qIndex) => (
              <div key={question.id} className="p-6 bg-gray-50 border-2 border-gray-200 rounded-2xl">
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
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Answer Options *</label>
                    <div className="space-y-3">
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={question.correctAnswer === oIndex}
                            onChange={() => updateQuestion(question.id, 'correctAnswer', oIndex)}
                            className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500"
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

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onClose} variant="outline" className="px-8 py-6">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!quizTitle || questions.some((q) => !q.question || q.options.some((o) => !o))}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 ml-auto"
          >
            <HelpCircle className="w-5 h-5 mr-2" />
            Save Quiz
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
