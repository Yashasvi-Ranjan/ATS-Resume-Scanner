import React from 'react';

export default function ProgressBar({
  value = 0,
  max = 100,
  label = "",
  showPercentage = true,
  color = "",
  height = "h-2",
  className = ""
}) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const getColorClass = () => {
    if (color) return color;
    if (percentage >= 80) return 'bg-emerald-500';
    if (percentage >= 65) return 'bg-blue-600';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
          {label && <span className="text-slate-700 font-medium">{label}</span>}
          {showPercentage && <span className="text-slate-500 font-semibold">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${height}`}>
        <div
          className={`${height} rounded-full transition-all duration-500 ease-out ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
