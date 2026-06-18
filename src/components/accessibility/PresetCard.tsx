'use client';

import { Check } from 'lucide-react';

interface PresetCardProps {
  id: string;
  label: string;
  goal: string;
  icon: React.ReactNode;
  features: string[];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function PresetCard({
  id,
  label,
  goal,
  icon,
  features,
  isSelected,
  onSelect,
}: PresetCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`
        relative w-full text-left rounded-2xl border-2 p-5 cursor-pointer
        transition-all duration-200 ease-in-out
        ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30 shadow-sm'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md bg-white dark:bg-gray-900'
        }
      `}
      aria-pressed={isSelected}
      aria-label={`${label} preset: ${goal}`}
    >
      {/* Selected checkmark badge */}
      {isSelected && (
        <span className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-400 text-white">
          <Check className="w-4 h-4" aria-hidden />
        </span>
      )}

      {/* Icon */}
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mb-3">
        {icon}
      </div>

      {/* Label */}
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{label}</h3>

      {/* Goal */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{goal}</p>

      {/* Feature badges */}
      {features.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {features.map((feature) => (
            <span
              key={feature}
              className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {feature}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
