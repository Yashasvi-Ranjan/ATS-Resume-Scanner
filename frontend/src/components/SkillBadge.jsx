import React from 'react';

export default function SkillBadge({ label, level, status, variant = "default" }) {
  const getBadgeStyle = () => {
    if (variant === 'high' || level === 'High') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (variant === 'medium' || level === 'Medium') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (variant === 'low' || level === 'Low') {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    if (variant === 'success' || status === 'Present & Strong') {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (variant === 'warning' || status === 'Weakly Represented') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (variant === 'danger' || status === 'Missing from Resume') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getBadgeStyle()} transition-colors`}
    >
      {label}
      {level && <span className="opacity-80 font-normal">({level})</span>}
    </span>
  );
}
