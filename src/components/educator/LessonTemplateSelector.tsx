'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, BookOpen, Check } from 'lucide-react';
import { fetchAccessibilityTemplates, type AccessibilityTemplate } from '@/lib/educator-api';

interface LessonTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: AccessibilityTemplate) => void;
  currentTitle?: string;
}

const disabilityLabels: Record<string, string> = {
  cognitive_impairment: 'Cognitive',
  adhd: 'ADHD',
  dyslexia: 'Dyslexia',
  asd: 'ASD',
  visual_impairment: 'Visual',
  hearing_impairment: 'Hearing',
  motor_impairment: 'Motor',
  multiple_disabilities: 'Multiple',
  none: 'General',
  other: 'Other',
};

const disabilityColors: Record<string, string> = {
  cognitive_impairment: 'bg-purple-100 text-purple-700 border-purple-200',
  adhd: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  dyslexia: 'bg-blue-100 text-blue-700 border-blue-200',
  asd: 'bg-teal-100 text-teal-700 border-teal-200',
  visual_impairment: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  hearing_impairment: 'bg-rose-100 text-rose-700 border-rose-200',
  motor_impairment: 'bg-orange-100 text-orange-700 border-orange-200',
};

export function LessonTemplateSelector({ isOpen, onClose, onSelect }: LessonTemplateSelectorProps) {
  const [templates, setTemplates] = useState<AccessibilityTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchAccessibilityTemplates()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Lesson Template</DialogTitle>
          <DialogDescription>
            Templates provide a pre-structured layout optimized for specific accessibility needs. You can edit everything after applying.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No templates available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{tmpl.name}</h3>
                  <Badge className={`shrink-0 text-[10px] px-1.5 py-0.5 border ${disabilityColors[tmpl.target_disability] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {disabilityLabels[tmpl.target_disability] || tmpl.target_disability}
                  </Badge>
                </div>

                {tmpl.description && (
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{tmpl.description}</p>
                )}

                <div className="flex-1">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Sections</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tmpl.content_structure.map((section, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                          section.required
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}
                      >
                        {section.label}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  className="mt-4 w-full gap-1.5"
                  onClick={() => { onSelect(tmpl); onClose(); }}
                >
                  <Check className="w-3.5 h-3.5" /> Apply Template
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
