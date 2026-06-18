'use client';

interface SliderSettingProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon?: React.ReactNode;
  onChange: (value: number) => void;
}

function formatValue(value: number, unit: string): string {
  switch (unit) {
    case 'x':
      return `${value}x`;
    case '%':
      return `${value}%`;
    case 'px':
      return `${value}px`;
    default:
      return `${value}${unit}`;
  }
}

export function SliderSetting({
  label,
  description,
  value,
  min,
  max,
  step,
  unit,
  icon,
  onChange,
}: SliderSettingProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span className="shrink-0 text-gray-500 dark:text-gray-400" aria-hidden>
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
              {label}
            </span>
            {description && (
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {description}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 ml-3 inline-flex items-center text-xs font-semibold px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
          {formatValue(value, unit)}
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="accent-blue-600 w-full h-2 rounded-lg cursor-pointer bg-gray-200 dark:bg-gray-700 appearance-none"
        aria-label={`${label}: ${formatValue(value, unit)}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value, unit)}
      />

      {/* Min/Max labels */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatValue(min, unit)}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatValue(max, unit)}
        </span>
      </div>
    </div>
  );
}
