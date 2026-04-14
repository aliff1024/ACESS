'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Volume2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface LessonViewPageProps {
  lessonId: string;
  onBack: () => void;
  onTakeQuiz: () => void;
  onNextLesson: () => void;
  onPreviousLesson: () => void;
}

const lessonContent = {
  l6: {
    title: 'Screen Reader Compatibility',
    lessonNumber: 6,
    totalLessons: 12,
    content: `Screen readers are assistive technologies that enable users who are blind or have low vision to access digital content through audio output. Understanding how screen readers work is essential for creating truly accessible web experiences.

## What is a Screen Reader?

A screen reader is software that converts text and other visual information on a screen into speech or Braille output. Users navigate through content using keyboard commands, and the screen reader announces the content aloud or displays it on a refreshable Braille display.

## Popular Screen Readers

The most commonly used screen readers include:

• JAWS (Job Access With Speech) - Windows
• NVDA (NonVisual Desktop Access) - Windows, Free and open-source
• VoiceOver - macOS and iOS, Built into Apple devices
• TalkBack - Android, Built into Android devices
• Narrator - Windows, Built into Windows 10+

## How Screen Readers Navigate Content

Screen readers provide multiple ways to navigate web content:

1. **Reading Order**: Content is read from top to bottom following the DOM structure
2. **Headings Navigation**: Users can jump between headings (H1, H2, H3, etc.)
3. **Landmarks**: Main, navigation, footer, and other ARIA landmarks help users orient themselves
4. **Links and Buttons**: Users can tab through or get a list of all interactive elements
5. **Forms**: Special commands help users navigate form fields efficiently

## Best Practices for Screen Reader Compatibility

### Use Semantic HTML

Always use proper HTML elements that convey meaning:
- Use <button> for buttons, not <div> with click handlers
- Use <nav> for navigation menus
- Use <main> for primary content
- Use heading tags (h1-h6) to create a logical document structure

### Provide Alternative Text

All images should have descriptive alt text that conveys the image's purpose and content. If an image is purely decorative, use an empty alt attribute (alt="").

### Label Form Elements

Every form input should have a clear, associated label element. Use the for attribute to explicitly connect labels with inputs.

### Announce Dynamic Content

When content changes dynamically (like loading data or showing errors), use ARIA live regions to announce these changes to screen reader users.

## Testing with Screen Readers

The best way to ensure your content works with screen readers is to test it yourself. Here's how to get started:

1. **Windows**: Download NVDA (free) from nvaccess.org
2. **macOS**: Enable VoiceOver in System Preferences
3. **Mobile**: Enable TalkBack (Android) or VoiceOver (iOS) in accessibility settings

Practice basic navigation commands and try to complete common tasks using only the screen reader without looking at the screen.

## Key Takeaways

• Screen readers are the primary way many users with visual disabilities access web content
• Semantic HTML and proper ARIA attributes are essential for screen reader accessibility
• Testing with actual screen readers is the best way to identify and fix accessibility issues
• Small changes in code can make huge differences in the user experience for screen reader users

Understanding screen readers isn't just about compliance—it's about ensuring that everyone can access and use your digital content effectively.`,
    transcript: `Welcome to Lesson 6: Screen Reader Compatibility.

In this lesson, we'll explore how screen readers work and why they're so important for web accessibility.

Screen readers are assistive technologies that convert text and visual information into audio output or Braille. They're essential tools for users who are blind or have low vision.

The most popular screen readers include JAWS for Windows, NVDA which is free and open source, VoiceOver built into Apple devices, TalkBack for Android, and Windows Narrator.

Screen readers provide multiple ways to navigate content. Users can read from top to bottom, jump between headings, use landmarks like navigation and main content areas, tab through links and buttons, and efficiently navigate forms.

To make your content screen reader friendly, always use semantic HTML. This means using proper elements like button for buttons, nav for navigation, and heading tags to create logical structure.

Provide descriptive alternative text for all images. Label all form elements clearly. And use ARIA live regions to announce dynamic content changes.

The best way to ensure compatibility is to test with actual screen readers. Download NVDA for free on Windows, or use VoiceOver on Mac and iOS devices.

Remember, screen reader accessibility isn't just about compliance. It's about making your content truly accessible to everyone.

This concludes our lesson on screen reader compatibility.`,
  },
};

export function LessonViewPage({
  lessonId,
  onBack,
  onTakeQuiz,
  onNextLesson,
  onPreviousLesson,
}: LessonViewPageProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  const lesson = lessonContent[lessonId as keyof typeof lessonContent] || lessonContent.l6;

  const handlePlayTTS = () => {
    setIsPlayingTTS(!isPlayingTTS);
    // In a real app, this would trigger text-to-speech
    console.log('TTS toggled:', !isPlayingTTS);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              ← Back to Course
            </button>
            <div className="text-sm text-gray-600">
              Lesson {lesson.lessonNumber} of {lesson.totalLessons}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Accessibility Tools</h2>
          <div className="flex gap-4">
            <Button
              onClick={handlePlayTTS}
              className={`${
                isPlayingTTS ? 'bg-blue-700' : 'bg-blue-600'
              } hover:bg-blue-700 text-white`}
            >
              <Volume2 className="w-5 h-5 mr-2" />
              {isPlayingTTS ? 'Stop TTS' : 'Play TTS'}
            </Button>
            <Button
              onClick={() => setShowTranscript(!showTranscript)}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <FileText className="w-5 h-5 mr-2" />
              {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={showTranscript ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <Card className="p-8 rounded-2xl border-2 border-gray-200">
              <div
                className="prose prose-lg max-w-none text-gray-900 leading-relaxed"
                style={{ fontSize: '18px', lineHeight: '1.8' }}
              >
                {lesson.content.split('\n\n').map((paragraph, index) => {
                  if (paragraph.startsWith('## ')) {
                    return (
                      <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                        {paragraph.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (paragraph.startsWith('### ')) {
                    return (
                      <h3 key={index} className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                        {paragraph.replace('### ', '')}
                      </h3>
                    );
                  }
                  if (paragraph.startsWith('• ')) {
                    const items = paragraph.split('\n');
                    return (
                      <ul key={index} className="list-disc list-inside space-y-2 mb-6">
                        {items.map((item, i) => (
                          <li key={i} className="text-gray-700">
                            {item.replace('• ', '')}
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  if (/^\d+\./.test(paragraph)) {
                    const items = paragraph.split('\n');
                    return (
                      <ol key={index} className="list-decimal list-inside space-y-2 mb-6">
                        {items.map((item, i) => (
                          <li key={i} className="text-gray-700">
                            {item.replace(/^\d+\.\s\*\*/, '').replace(/\*\*/, ': ')}
                          </li>
                        ))}
                      </ol>
                    );
                  }
                  return (
                    <p key={index} className="mb-6 text-gray-700">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </Card>
          </div>

          {showTranscript && (
            <div className="lg:col-span-1">
              <Card className="p-6 rounded-2xl border-2 border-gray-200 sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Transcript
                </h3>
                <div className="text-gray-700 leading-relaxed space-y-4 text-sm max-h-[600px] overflow-y-auto">
                  {lesson.transcript.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <Button
            onClick={onPreviousLesson}
            variant="outline"
            className="px-8 py-6 text-lg"
            disabled={lesson.lessonNumber === 1}
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous Lesson
          </Button>

          <Button onClick={onTakeQuiz} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg">
            Take Quiz
          </Button>

          <Button
            onClick={onNextLesson}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            disabled={lesson.lessonNumber === lesson.totalLessons}
          >
            Next Lesson
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
