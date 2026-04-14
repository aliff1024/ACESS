import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ArrowLeft, Volume2, ChevronRight, FileText, Play } from 'lucide-react';

interface LessonPageProps {
  lessonTitle: string;
  onBack: () => void;
}

export function LessonPage({ lessonTitle, onBack }: LessonPageProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayTTS = () => {
    setIsPlaying(!isPlaying);
    console.log('Toggle TTS playback');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-3">
            <Button
              onClick={handlePlayTTS}
              variant={isPlaying ? 'default' : 'outline'}
              className={isPlaying ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
            >
              {isPlaying ? <Play className="w-5 h-5 mr-2 fill-current" /> : <Volume2 className="w-5 h-5 mr-2" />}
              {isPlaying ? 'Playing...' : 'Play TTS'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTranscript(!showTranscript)}
            >
              <FileText className="w-5 h-5 mr-2" />
              {showTranscript ? 'Hide' : 'Show'} Transcript
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{lessonTitle}</h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              Lesson 5 of 12
            </span>
            <span>•</span>
            <span>15 minutes</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-8 rounded-2xl border-2 border-gray-200">
              <div className="prose prose-lg max-w-none">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Understanding the Basics
                </h2>

                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  Welcome to this lesson on fundamental concepts. This content is designed
                  to be clear, accessible, and easy to understand. We'll take things step by
                  step, ensuring you grasp each concept before moving forward.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Concepts</h3>

                <ul className="space-y-3 mb-6">
                  <li className="text-lg text-gray-700 leading-relaxed">
                    <strong>Concept 1:</strong> Introduction to the main idea and its practical applications
                    in real-world scenarios.
                  </li>
                  <li className="text-lg text-gray-700 leading-relaxed">
                    <strong>Concept 2:</strong> Building on the foundation with additional details
                    and examples that reinforce understanding.
                  </li>
                  <li className="text-lg text-gray-700 leading-relaxed">
                    <strong>Concept 3:</strong> Advanced applications and how to apply what you've learned
                    in different contexts.
                  </li>
                </ul>

                <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-6">
                  <h4 className="text-lg font-semibold text-blue-900 mb-2">💡 Pro Tip</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Take your time with each section. There's no rush! You can pause, re-read,
                    or use the text-to-speech feature to listen to the content at your own pace.
                  </p>
                </div>

                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  As you progress through this lesson, you'll notice that the content adapts to your
                  learning style. If you need more time on certain topics, that's perfectly fine.
                  Our adaptive system will adjust future recommendations based on your pace.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mb-4">Practice Activity</h3>

                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  Before moving on, try to summarize the key concepts in your own words. This helps
                  reinforce your understanding and prepares you for the quiz at the end of this lesson.
                </p>
              </div>
            </Card>

            <div className="flex justify-between items-center">
              <Button variant="outline" size="lg">
                Previous Lesson
              </Button>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Next Lesson
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <Card className="p-6 rounded-2xl border-2 border-blue-200 bg-blue-50">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Ready to test your knowledge?</h3>
              <p className="text-gray-700 mb-6">
                Take a short quiz to check your understanding of this lesson. You can retake it as many times as needed.
              </p>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto">
                Take Quiz
              </Button>
            </Card>
          </div>

          <div className="lg:col-span-1">
            {showTranscript && (
              <Card className="p-6 rounded-2xl border-2 border-gray-200 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Transcript
                </h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  <div className="text-sm text-gray-700 leading-relaxed">
                    <p className="mb-3">
                      [00:00] Welcome to this lesson on fundamental concepts...
                    </p>
                    <p className="mb-3">
                      [00:15] This content is designed to be clear, accessible, and easy to understand...
                    </p>
                    <p className="mb-3">
                      [00:30] We'll take things step by step, ensuring you grasp each concept...
                    </p>
                    <p className="mb-3">
                      [00:45] The first key concept introduces the main idea and its practical applications...
                    </p>
                    <p className="mb-3">
                      [01:00] Building on the foundation with additional details and examples...
                    </p>
                    <p className="text-gray-500 italic">
                      [Transcript continues...]
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
