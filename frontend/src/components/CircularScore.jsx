import React from 'react';

export default function CircularScore({ score = null, size = 150, strokeWidth = 10, label = "Match Score", subtitle = "", emptyLabel = "N/A" }) {
  const numericScore = score === null || score === undefined || score === '' ? NaN : Number(score);
  const hasScore = Number.isFinite(numericScore);
  const displayScore = hasScore ? Math.round(numericScore) : null;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = hasScore
    ? circumference - (Math.min(Math.max(displayScore, 0), 100) / 100) * circumference
    : circumference;

  const getColor = (s) => {
    if (s >= 80) return { stroke: '#10b981', text: 'text-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Strong Match' };
    if (s >= 70) return { stroke: '#2563eb', text: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Good Match' };
    if (s >= 50) return { stroke: '#f59e0b', text: 'text-amber-600', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Moderate Match' };
    return { stroke: '#ef4444', text: 'text-rose-600', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Low Match' };
  };

  const status = hasScore
    ? getColor(displayScore)
    : { stroke: '#f1f5f9', text: 'text-slate-400', badgeBg: 'bg-slate-50 text-slate-500 border-slate-200', label: emptyLabel };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90 transform">
          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active progress stroke */}
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
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-3xl lg:text-4xl font-extrabold tracking-tight ${status.text} font-display`}>
            {hasScore ? `${displayScore}%` : emptyLabel}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
            {label}
          </span>
        </div>
      </div>

      {hasScore && subtitle && (
        <span className={`mt-3 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${status.badgeBg}`}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
