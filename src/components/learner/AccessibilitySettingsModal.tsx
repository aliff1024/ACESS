import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Type, Eye, AlignLeft, Volume2 } from 'lucide-react';

interface AccessibilitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilitySettingsModal({
  isOpen,
  onClose,
}: AccessibilitySettingsModalProps) {
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState('light');
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const handleSave = () => {
    console.log('Saving accessibility settings:', {
      fontSize,
      theme,
      lineSpacing,
      ttsEnabled,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Accessibility Settings</DialogTitle>
          <DialogDescription className="text-gray-600">
            Customize your learning experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Type className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <Label className="text-base font-semibold">Font Size</Label>
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
              <span className="text-sm font-semibold text-gray-900 min-w-12 text-right">
                {fontSize}px
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <Label className="text-base font-semibold">Theme</Label>
                <p className="text-sm text-gray-600">Choose your preferred color scheme</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => setTheme('light')}
                className="h-auto py-3"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-white border-2 border-gray-300 rounded"></div>
                  <span className="text-sm">Light</span>
                </div>
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
                className="h-auto py-3"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-gray-900 border-2 border-gray-700 rounded"></div>
                  <span className="text-sm">Dark</span>
                </div>
              </Button>
              <Button
                variant={theme === 'highContrast' ? 'default' : 'outline'}
                onClick={() => setTheme('highContrast')}
                className="h-auto py-3"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-black border-2 border-yellow-400 rounded"></div>
                  <span className="text-sm">High Contrast</span>
                </div>
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <AlignLeft className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <Label className="text-base font-semibold">Line Spacing</Label>
                <p className="text-sm text-gray-600">Increase spacing between lines</p>
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
              <span className="text-sm font-semibold text-gray-900 min-w-12 text-right">
                {lineSpacing.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <Label className="text-base font-semibold">Text-to-Speech</Label>
                <p className="text-sm text-gray-600">Enable voice narration for content</p>
              </div>
            </div>
            <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
