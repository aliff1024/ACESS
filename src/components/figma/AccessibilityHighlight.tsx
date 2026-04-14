'use client';

import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Eye, Type, AlignLeft } from 'lucide-react';

export function AccessibilityHighlight() {
  const [fontSize, setFontSize] = useState(16);
  const [contrast, setContrast] = useState('normal');
  const [lineSpacing, setLineSpacing] = useState(1.5);

  const contrastModes = {
    normal: { bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200' },
    high: { bg: 'bg-black', text: 'text-white', border: 'border-white' },
  };

  const currentMode = contrastModes[contrast as keyof typeof contrastModes];

  return (
    <section className="py-20 px-6 bg-white" id="accessibility">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Customize Your Experience
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Adjust settings to match your reading preferences and accessibility needs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Type className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Font Size</h3>
                  <p className="text-sm text-gray-600">Adjust text size for comfortable reading</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 min-w-16">Small</span>
                <Slider
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                  min={12}
                  max={24}
                  step={2}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 min-w-16">Large</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Contrast Mode</h3>
                  <p className="text-sm text-gray-600">Choose between normal and high contrast</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant={contrast === 'normal' ? 'default' : 'outline'}
                  onClick={() => setContrast('normal')}
                  className="flex-1"
                >
                  Normal
                </Button>
                <Button
                  variant={contrast === 'high' ? 'default' : 'outline'}
                  onClick={() => setContrast('high')}
                  className="flex-1"
                >
                  High Contrast
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <AlignLeft className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Line Spacing</h3>
                  <p className="text-sm text-gray-600">Increase spacing for better readability</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 min-w-16">Compact</span>
                <Slider
                  value={[lineSpacing]}
                  onValueChange={(value) => setLineSpacing(value[0])}
                  min={1}
                  max={2.5}
                  step={0.25}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 min-w-16">Spacious</span>
              </div>
            </div>
          </div>

          <Card
            className={`p-8 rounded-2xl border-2 ${currentMode.border} ${currentMode.bg} transition-all duration-300`}
          >
            <h3
              className={`font-semibold mb-4 ${currentMode.text}`}
              style={{ fontSize: `${fontSize}px` }}
            >
              Preview Text
            </h3>
            <p
              className={`${currentMode.text} transition-all duration-300`}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineSpacing,
              }}
            >
              The quick brown fox jumps over the lazy dog. This sample text demonstrates how your accessibility settings affect readability. You can customize font size, contrast, and line spacing to match your preferences.
            </p>
            <p
              className={`${currentMode.text} mt-4`}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineSpacing,
              }}
            >
              Our platform ensures that all learners, including those with dyslexia, ADHD, or visual impairments, can access content comfortably.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
