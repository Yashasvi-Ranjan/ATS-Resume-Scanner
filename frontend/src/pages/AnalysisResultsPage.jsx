import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  TrendingUp,
  FileText,
  Briefcase,
  Layers,
  GraduationCap,
  FolderGit2,
  GitPullRequest
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import CircularScore from '../components/CircularScore';
import ProgressBar from '../components/ProgressBar';
import ScoreCard from '../components/ScoreCard';

export default function AnalysisResultsPage() {
  const navigate = useNavigate();
  const { analysisResult, resumeFile } = useApp();

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Skills Match':
        return Layers;
      case 'Experience Match':
        return Briefcase;
      case 'Keywords Alignment':
        return FileText;
      case 'Education Relevance':
        return GraduationCap;
      case 'Project Relevance':
        return FolderGit2;
      default:
        return Target;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner with Role info & CTAs */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <span>ATS Match Verification Report</span>
            <span>•</span>
            <span className="text-slate-400 font-normal">Candidate: Sarah Johnson</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-white font-display">
            {analysisResult.jobTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Target Company: <strong className="text-slate-200">{analysisResult.company}</strong> • File: <strong className="text-slate-200">{resumeFile?.name || analysisResult.fileName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/gap-analysis')}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <span>View Gap Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate('/resume-enhancement')}
            className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Enhance Resume</span>
          </button>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Circular Progress & Overall Verdict */}
        <div className="lg:col-span-4 glass-card rounded-2xl p-8 border border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
          <CircularScore score={analysisResult.overallScore} size={170} label="Match Score" />
          <div>
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-block mb-2">
              {analysisResult.verdict}
            </span>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
              {analysisResult.explanation}
            </p>
          </div>
        </div>

        {/* Breakdown bars list */}
        <div className="lg:col-span-8 glass-card rounded-2xl p-6 lg:p-7 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Score Breakdown by Dimension
              </h3>
              <p className="text-xs text-slate-400">
                Weighted evaluation criteria mapped directly to job description requirements
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">100% Total Scale</span>
          </div>

          <div className="space-y-4">
            {analysisResult.breakdown.map((item) => {
              const Icon = getCategoryIcon(item.category);
              return (
                <div key={item.category} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-800 text-brand-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200">{item.category}</span>
                        <span className="ml-2 text-[11px] text-slate-500 font-mono">Weight: {item.weight}</span>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-slate-100 font-display">{item.score}%</span>
                  </div>

                  <ProgressBar value={item.score} showPercentage={false} />
                  <p className="text-[11px] text-slate-400">{item.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3 Core Explainability Sections: Strengths, Improvements, Learn/Add */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strengths */}
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/20 bg-emerald-950/5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Key Strengths
                </h3>
                <p className="text-[11px] text-slate-400">Where candidate strongly qualifies</p>
              </div>
            </div>

            <div className="space-y-3">
              {analysisResult.strengths.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-300">
                      {item.title}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Things to Improve */}
        <div className="glass-card rounded-2xl p-6 border border-amber-500/20 bg-amber-950/5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Things to Improve
                </h3>
                <p className="text-[11px] text-slate-400">Refine present content & metrics</p>
              </div>
            </div>

            <div className="space-y-3">
              {analysisResult.improvements.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-300">
                      {item.title}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                      {item.impact}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/resume-enhancement"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 w-full"
            >
              <span>Auto-Fix with Resume Enhancement</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Things to Learn/Add */}
        <div className="glass-card rounded-2xl p-6 border border-blue-500/20 bg-blue-950/5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Things to Learn / Add
                </h3>
                <p className="text-[11px] text-slate-400">Missing from resume but required in JD</p>
              </div>
            </div>

            <div className="space-y-3">
              {analysisResult.learnAndAdd.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-300">
                      {item.skill}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                      {item.importance}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {item.reason}
                  </p>
                  <p className="text-[11px] text-slate-300 font-medium pt-1 border-t border-slate-800/60 mt-1">
                    💡 Action: {item.action}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/gap-analysis"
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 w-full"
            >
              <span>Explore Detailed Gap Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
