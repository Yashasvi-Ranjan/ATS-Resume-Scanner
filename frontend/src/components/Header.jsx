import React from 'react';
import { Menu, Plus, FileText } from 'lucide-react';
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
        return 'Skill & Competency Gaps';
      case '/resume-enhancement':
        return 'Resume Enhancement';
      case '/mock-interview':
        return 'Mock Technical Interview';
      case '/mock-interview/results':
        return 'Interview Performance Evaluation';
      case '/history':
        return 'Audit & Assessment History';
      case '/profile':
        return 'Candidate Profile & Preferences';
      default:
        return 'CVATS Platform';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-900 font-display">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Resume indicator */}
        {resumeFile && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono text-[11px] truncate max-w-[140px]">
              {resumeFile.name}
            </span>
          </div>
        )}

        {/* Quick CTA */}
        <button
          onClick={() => navigate('/analysis')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Analysis</span>
        </button>
      </div>
    </header>
  );
}
