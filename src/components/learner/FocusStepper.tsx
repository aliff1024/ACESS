'use client';

import { ChevronLeft, ChevronRight, Minimize2 } from 'lucide-react';

export interface FocusStep {
  id: string;
  label: string;
}

interface FocusStepperProps {
  title: string;
  steps: FocusStep[];
  currentStep: number;
  onStepChange: (index: number) => void;
  onExit: () => void;
  className?: string;
}

export function FocusStepper({ title, steps, currentStep, onStepChange, onExit, className = '' }: FocusStepperProps) {
  return (
    <div className={`sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <h2 className="font-bold text-gray-900 text-sm truncate">{title}</h2>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
            {currentStep + 1} / {steps.length}
          </span>
          <button
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="p-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-100 transition-colors"
            aria-label="Previous section"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep >= steps.length - 1}
            className="p-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-100 transition-colors"
            aria-label="Next section"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" /> Exit
          </button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-1.5">
        <div className="flex gap-1">
          {steps.map((step, i) => (
            <button
              key={step.id}
              onClick={() => onStepChange(i)}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                i === currentStep
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
