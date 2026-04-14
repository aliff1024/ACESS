'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { FileText, Video, Upload, X } from 'lucide-react';

interface AddLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AddLessonModal({ isOpen, onClose, onSave }: AddLessonModalProps) {
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [hasVideo, setHasVideo] = useState(false);

  const handleSave = () => {
    onSave();
    setLessonTitle('');
    setLessonContent('');
    setHasVideo(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl mb-2">Add New Lesson</DialogTitle>
          <DialogDescription className="text-gray-600">
            Create educational content for your course
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Lesson Title *</label>
            <Input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="e.g., What is Web Accessibility?"
              className="text-lg py-6"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Lesson Content *</label>
            <Textarea
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
              placeholder="Write the main content for this lesson. This is where you'll explain concepts, provide examples, and guide learners through the material."
              rows={12}
              className="text-base font-mono"
            />
            <p className="text-sm text-gray-500 mt-2">
              Tip: Use clear headings, bullet points, and examples to make content easy to understand
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={hasVideo}
                onChange={(e) => setHasVideo(e.target.checked)}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-semibold text-gray-900">Include video content</span>
            </label>

            {hasVideo && (
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:border-purple-600 hover:bg-purple-50 transition-all cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <Video className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 mb-1">Upload Video</p>
                    <p className="text-sm text-gray-600 mb-3">
                      Click to browse or drag and drop your video file here
                    </p>
                    <p className="text-xs text-gray-500">MP4, MOV, or AVI (max 500MB)</p>
                  </div>
                  <Button variant="outline" className="border-2 border-purple-600 text-purple-600">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Transcript (Optional)</label>
            <Textarea
              placeholder="Provide a text transcript of your video content for accessibility"
              rows={6}
              className="text-base"
            />
            <p className="text-sm text-gray-500 mt-2">
              Transcripts help learners who prefer reading or use screen readers
            </p>
          </div>

          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Accessibility Tip:</span> Keep content clear and structured. Use
              headings, lists, and short paragraphs. Provide alternative formats when possible.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onClose} variant="outline" className="px-8 py-6">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!lessonTitle || !lessonContent}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 ml-auto"
          >
            <FileText className="w-5 h-5 mr-2" />
            Save Lesson
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
