import React from 'react';
import ProgressBar from './ProgressBar';

export default function ScoreCard({ title, score, icon: Icon, weight, summary, onClick, active = false }) {
  const getScoreColor = (s) => {
    if (s >= 80) return 'text-emerald-600';
    if (s >= 70) return 'text-blue-600';
    if (s >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white p-5 rounded-xl border transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-card-hover' : ''
      } ${active ? 'border-blue-600 ring-1 ring-blue-600 shadow-sm' : 'border-slate-200 shadow-card'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
            {weight && <p className="text-xs text-slate-500 mt-0.5">{weight}</p>}
          </div>
        </div>
        <span className={`text-2xl font-bold font-display ${getScoreColor(score)}`}>
          {score}%
        </span>
      </div>

      <div className="mt-4">
        <ProgressBar value={score} showPercentage={false} height="h-1.5" />
      </div>

      {summary && (
        <p className="mt-3 text-xs text-slate-600 leading-relaxed line-clamp-2">
          {summary}
        </p>
      )}
    </div>
  );
}
