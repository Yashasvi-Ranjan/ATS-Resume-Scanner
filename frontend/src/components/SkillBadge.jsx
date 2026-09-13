import React from 'react';

export default function SkillBadge({ label, level, status, variant = "default" }) {
  const getBadgeStyle = () => {
    if (variant === 'high' || level === 'High') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (variant === 'medium' || level === 'Medium') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (variant === 'low' || level === 'Low') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (variant === 'success' || status === 'Present & Strong') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (variant === 'warning' || status === 'Weakly Represented') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (variant === 'danger' || status === 'Missing from Resume') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getBadgeStyle()} transition-colors`}
    >
      {label}
      {level && <span className="opacity-75 font-normal">({level})</span>}
    </span>
  );
}
