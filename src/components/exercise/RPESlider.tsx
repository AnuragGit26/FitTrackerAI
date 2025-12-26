import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { getRpeColor, getIntensityLabel } from '@/utils/rpeHelpers';
import { prefersReducedMotion } from '@/utils/animations';

interface RPESliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  showLabels?: boolean;
  showValue?: boolean;
}

export function RPESlider({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 0.5,
  disabled = false,
  className,
  showLabels = true,
  showValue = true,
}: RPESliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const shouldReduceMotion = prefersReducedMotion();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const intensityColor = getRpeColor(localValue);
  const intensityLabel = getIntensityLabel(localValue);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-end mb-2">
        <span className="text-slate-500 dark:text-[#90cba8] text-xs font-medium uppercase tracking-wide">
          RPE (Difficulty)
        </span>
        {showValue && (
          <span
            className="font-bold text-lg"
            style={{ color: intensityColor }}
          >
            {localValue.toFixed(1)}
          </span>
        )}
      </div>

      <div className="relative h-6 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          disabled={disabled}
          className="w-full z-10 appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, ${intensityColor} 0%, ${intensityColor} ${((localValue - min) / (max - min)) * 100}%, #316847 ${((localValue - min) / (max - min)) * 100}%, #316847 100%)`,
            height: '4px',
            borderRadius: '2px',
          }}
          aria-label={`RPE slider, current value ${localValue.toFixed(1)}`}
        />

        {/* Tick marks */}
        <div className="absolute w-full flex justify-between px-1 pointer-events-none top-1/2 -translate-y-1/2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-0.5 h-1 bg-white/20 dark:bg-white/10"
            />
          ))}
        </div>

        {/* Custom thumb styling via CSS variables */}
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 24px;
            width: 24px;
            border-radius: 50%;
            background: ${intensityColor};
            cursor: pointer;
            margin-top: -10px;
            box-shadow: 0 0 10px ${intensityColor}80;
            transition: ${shouldReduceMotion ? 'none' : 'all 0.2s ease'};
          }

          input[type="range"]::-webkit-slider-thumb:hover {
            transform: ${shouldReduceMotion ? 'none' : 'scale(1.1)'};
            box-shadow: 0 0 15px ${intensityColor};
          }

          input[type="range"]::-moz-range-thumb {
            height: 24px;
            width: 24px;
            border-radius: 50%;
            background: ${intensityColor};
            cursor: pointer;
            border: none;
            box-shadow: 0 0 10px ${intensityColor}80;
            transition: ${shouldReduceMotion ? 'none' : 'all 0.2s ease'};
          }

          input[type="range"]::-moz-range-thumb:hover {
            transform: ${shouldReduceMotion ? 'none' : 'scale(1.1)'};
            box-shadow: 0 0 15px ${intensityColor};
          }

          input[type="range"]::-ms-thumb {
            height: 24px;
            width: 24px;
            border-radius: 50%;
            background: ${intensityColor};
            cursor: pointer;
            border: none;
            box-shadow: 0 0 10px ${intensityColor}80;
          }
        `}</style>
      </div>

      {showLabels && (
        <div className="flex justify-between mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          <span>Easy</span>
          <span>Fail</span>
        </div>
      )}

      {/* Intensity label tooltip (optional) */}
      {localValue > 0 && (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center">
          <span style={{ color: intensityColor }}>
            {intensityLabel.label}
          </span>
        </div>
      )}
    </div>
  );
}

