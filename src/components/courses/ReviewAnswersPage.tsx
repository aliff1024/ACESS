'use client';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, BookOpen } from 'lucide-react';

interface ReviewAnswersPageProps {
  answers: { questionId: string; selectedAnswer: string }[];
  onBack: () => void;
  onRetryQuiz: () => void;
}

const quizData = {
  questions: [
    {
      id: 'q1',
      question: 'Which of the following is a free and open-source screen reader for Windows?',
      options: [
        { id: 'a', text: 'JAWS' },
        { id: 'b', text: 'NVDA' },
        { id: 'c', text: 'VoiceOver' },
        { id: 'd', text: 'Narrator' },
      ],
      correctAnswer: 'b',
      explanation: 'NVDA (NonVisual Desktop Access) is a free and open-source screen reader for Windows. While JAWS is powerful, it requires a paid license. VoiceOver is built into Apple devices, and Narrator comes with Windows.',
    },
    {
      id: 'q2',
      question: 'What HTML element should you use for a clickable button?',
      options: [
        { id: 'a', text: '<div> with onclick handler' },
        { id: 'b', text: '<span> with role="button"' },
        { id: 'c', text: '<button>' },
        { id: 'd', text: '<a> with href="#"' },
      ],
      correctAnswer: 'c',
      explanation: 'The <button> element is the semantic HTML element for buttons. It provides built-in keyboard accessibility, focus management, and is properly announced by screen readers. Using divs or spans requires additional ARIA attributes and JavaScript to be accessible.',
    },
    {
      id: 'q3',
      question: 'What should you include for images that are purely decorative?',
      options: [
        { id: 'a', text: 'Detailed alt text describing the decoration' },
        { id: 'b', text: 'Empty alt attribute (alt="")' },
        { id: 'c', text: 'Alt text saying "decorative image"' },
        { id: 'd', text: 'No alt attribute at all' },
      ],
      correctAnswer: 'b',
      explanation: 'Decorative images should have an empty alt attribute (alt=""). This tells screen readers to skip the image entirely, avoiding unnecessary clutter. Omitting the alt attribute completely can cause screen readers to announce the filename.',
    },
    {
      id: 'q4',
      question: 'Which ARIA attribute is used to announce dynamic content changes to screen readers?',
      options: [
        { id: 'a', text: 'aria-label' },
        { id: 'b', text: 'aria-live' },
        { id: 'c', text: 'aria-hidden' },
        { id: 'd', text: 'aria-describedby' },
      ],
      correctAnswer: 'b',
      explanation: 'The aria-live attribute creates a "live region" that announces content changes to screen reader users. aria-label provides accessible names, aria-hidden hides content from assistive technologies, and aria-describedby provides additional descriptions.',
    },
    {
      id: 'q5',
      question: 'What is the primary way screen reader users navigate through headings?',
      options: [
        { id: 'a', text: 'By clicking on each heading with the mouse' },
        { id: 'b', text: 'By using keyboard shortcuts to jump between heading levels' },
        { id: 'c', text: 'By scrolling through the page visually' },
        { id: 'd', text: 'By searching for specific heading text' },
      ],
      correctAnswer: 'b',
      explanation: 'Screen reader users navigate headings using keyboard shortcuts (like H key in most screen readers) to jump between heading levels. This allows them to quickly understand page structure and navigate to relevant sections without reading everything sequentially.',
    },
  ],
};

export function ReviewAnswersPage({ answers, onBack, onRetryQuiz }: ReviewAnswersPageProps) {
  const getOptionById = (question: any, optionId: string) => {
    return question.options.find((opt: any) => opt.id === optionId);
  };

  const correctCount = answers.filter((answer) => {
    const question = quizData.questions.find((q) => q.id === answer.questionId);
    return question && question.correctAnswer === answer.selectedAnswer;
  }).length;

  const score = Math.round((correctCount / quizData.questions.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          ← Back to Results
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Answer Review</h1>
              <p className="text-gray-600">Review your answers and learn from explanations</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Your Score</p>
              <p className={`text-4xl font-bold ${
                score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {score}%
              </p>
              <p className="text-sm text-gray-600">
                {correctCount} of {quizData.questions.length} correct
              </p>
            </div>
          </div>

          <Button onClick={onRetryQuiz} className="bg-blue-600 hover:bg-blue-700 text-white">
            <RotateCcw className="w-5 h-5 mr-2" />
            Retry Quiz
          </Button>
        </div>

        <div className="space-y-6">
          {quizData.questions.map((question, index) => {
            const userAnswer = answers.find((a) => a.questionId === question.id);
            const userOption = userAnswer ? getOptionById(question, userAnswer.selectedAnswer) : null;
            const correctOption = getOptionById(question, question.correctAnswer);
            const isCorrect = userAnswer?.selectedAnswer === question.correctAnswer;

            return (
              <Card key={question.id} className="p-6 rounded-2xl border-2 border-gray-200">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCorrect ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-500">
                        Question {index + 1}
                      </span>
                      <Badge className={isCorrect ? 'bg-green-600' : 'bg-red-600'}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {question.question}
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 mb-4 ml-16">
                  {question.options.map((option) => {
                    const isUserAnswer = userAnswer?.selectedAnswer === option.id;
                    const isCorrectAnswer = question.correctAnswer === option.id;

                    return (
                      <div
                        key={option.id}
                        className={`p-4 rounded-lg border-2 ${
                          isCorrectAnswer
                            ? 'border-green-500 bg-green-50'
                            : isUserAnswer && !isCorrect
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-900">{option.text}</span>
                          {isCorrectAnswer && (
                            <Badge className="bg-green-600 text-white ml-auto">
                              Correct Answer
                            </Badge>
                          )}
                          {isUserAnswer && !isCorrect && (
                            <Badge className="bg-red-600 text-white ml-auto">
                              Your Answer
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="ml-16 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Explanation</h4>
                      <p className="text-gray-700 leading-relaxed">{question.explanation}</p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button onClick={onBack} variant="outline" className="px-8 py-6 text-lg">
            Back to Results
          </Button>
        </div>
      </div>
    </div>
  );
}

function RotateCcw({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
