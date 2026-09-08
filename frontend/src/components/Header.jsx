import React from 'react';
import { Menu, Sparkles, Plus, Search, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Header({ onMenuToggle }) {
  const { resumeFile } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Candidate Dashboard';
      case '/analysis':
        return 'Resume & Job Analysis';
      case '/analysis/results':
        return 'Match Score & Explainability';
      case '/gap-analysis':
        return 'Skill Gap & Readiness Breakdown';
      case '/resume-enhancement':
        return 'AI Resume Enhancement';
      case '/mock-interview':
        return 'Mock Technical Interview';
      case '/mock-interview/results':
        return 'Interview Performance Evaluation';
      case '/history':
        return 'Analysis & Interview History';
      case '/profile':
        return 'Candidate Profile & Preferences';
      default:
        return 'CVATS Platform';
    }
  };

  return (
    <header className="h-16 bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-white font-display">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Resume indicator */}
        {resumeFile && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <FileText className="w-3.5 h-3.5 text-brand-400" />
            <span className="font-mono text-[11px] truncate max-w-[140px]">
              {resumeFile.name}
            </span>
          </div>
        )}

        {/* Quick CTA */}
        <button
          onClick={() => navigate('/analysis')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Analysis</span>
        </button>
      </div>
    </header>
  );
}
