import React from 'react';
import ProgressBar from './ProgressBar';

export default function ScoreCard({ title, score, icon: Icon, weight, summary, onClick, active = false }) {
  const getScoreColor = (s) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 70) return 'text-brand-400';
    if (s >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div
      onClick={onClick}
      className={`glass-card p-5 rounded-xl border transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-brand-500/50 hover:bg-slate-800/80' : ''
      } ${active ? 'border-brand-500 shadow-glow' : 'border-slate-800'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2.5 rounded-lg bg-slate-800/80 text-brand-400 border border-slate-700/60">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
            {weight && <p className="text-xs text-slate-400">Weight: {weight}</p>}
          </div>
        </div>
        <span className={`text-2xl font-bold font-display ${getScoreColor(score)}`}>
          {score}%
        </span>
      </div>

      <div className="mt-4">
        <ProgressBar value={score} showPercentage={false} />
      </div>

      {summary && (
        <p className="mt-3 text-xs text-slate-400 leading-relaxed line-clamp-2">
          {summary}
        </p>
      )}
    </div>
  );
}
