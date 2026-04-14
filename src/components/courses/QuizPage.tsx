'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Clock, CheckCircle } from 'lucide-react';

interface QuizPageProps {
  onBack: () => void;
  onSubmit: (score: number, answers: { questionId: string; selectedAnswer: string }[]) => void;
}

const quizData = {
  title: 'Screen Reader Compatibility Quiz',
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
    },
  ],
};

export function QuizPage({ onBack, onSubmit }: QuizPageProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedAnswer: string }[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleNext = () => {
    if (selectedOption) {
      const updatedAnswers = [
        ...answers.filter((a) => a.questionId !== currentQuestion.id),
        { questionId: currentQuestion.id, selectedAnswer: selectedOption },
      ];
      setAnswers(updatedAnswers);

      if (isLastQuestion) {
        // Calculate score
        let correctCount = 0;
        updatedAnswers.forEach((answer) => {
          const question = quizData.questions.find((q) => q.id === answer.questionId);
          if (question && question.correctAnswer === answer.selectedAnswer) {
            correctCount++;
          }
        });
        const score = (correctCount / quizData.questions.length) * 100;
        onSubmit(score, updatedAnswers);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedOption(null);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const previousAnswer = answers.find((a) => a.questionId === quizData.questions[currentQuestionIndex - 1].id);
      setSelectedOption(previousAnswer?.selectedAnswer || null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          ← Back to Lesson
        </button>

        <Card className="p-8 rounded-2xl border-2 border-gray-200 mb-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{quizData.title}</h1>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-5 h-5" />
                <span className="text-lg">No time limit</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-2">
              <span className="text-lg font-semibold text-gray-900">
                Question {currentQuestionIndex + 1} of {quizData.questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8 leading-relaxed">
              {currentQuestion.question}
            </h2>

            <div className="space-y-4">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full p-6 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedOption === option.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedOption === option.id
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedOption === option.id && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="text-lg text-gray-900">{option.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              onClick={handlePrevious}
              variant="outline"
              disabled={currentQuestionIndex === 0}
              className="px-8 py-6 text-lg"
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {quizData.questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index < currentQuestionIndex
                      ? 'bg-green-500'
                      : index === currentQuestionIndex
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={!selectedOption}
              className={`px-8 py-6 text-lg ${
                selectedOption
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLastQuestion ? 'Submit Quiz' : 'Next Question'}
            </Button>
          </div>
        </Card>

        <div className="text-center text-sm text-gray-600">
          <p>Take your time and read each question carefully</p>
        </div>
      </div>
    </div>
  );
}
