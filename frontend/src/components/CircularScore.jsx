import React from 'react';

export default function CircularScore({ score = 78, size = 160, strokeWidth = 12, label = "Match Score", subtitle = "" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return { stroke: '#10b981', text: 'text-emerald-400', glow: 'shadow-glow-emerald', label: 'Excellent Match' };
    if (s >= 70) return { stroke: '#3b82f6', text: 'text-blue-400', glow: 'shadow-glow', label: 'Good Match' };
    if (s >= 50) return { stroke: '#f59e0b', text: 'text-amber-400', glow: 'shadow-amber-500/20', label: 'Moderate Match' };
    return { stroke: '#ef4444', text: 'text-rose-400', glow: 'shadow-rose-500/20', label: 'Low Match' };
  };

  const status = getColor(score);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative flex items-center justify-center rounded-full p-2 ${status.glow}`}>
        <svg width={size} height={size} className="rotate-[-90deg] transform transition-all duration-1000 ease-out">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={status.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-4xl font-extrabold tracking-tight ${status.text} font-display`}>
            {score}%
          </span>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
            {label}
          </span>
        </div>
      </div>

      {subtitle && (
        <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          {subtitle}
        </span>
      )}
    </div>
  );
}
