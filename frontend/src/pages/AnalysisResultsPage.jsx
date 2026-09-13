import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Target,
  Sparkles,
  ArrowRight,
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
    <div className="space-y-6">
      {/* Top Banner with Role info & CTAs */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
            <span>ATS Match Verification Report</span>
            <span>•</span>
            <span className="text-slate-500 font-normal">Candidate: Sarah Johnson</span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">
            {analysisResult.jobTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target Company: <strong className="text-slate-800">{analysisResult.company}</strong> • File: <strong className="text-slate-800">{resumeFile?.name || analysisResult.fileName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/gap-analysis')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>View Gap Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate('/resume-enhancement')}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Enhance Resume</span>
          </button>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Circular Progress & Overall Verdict */}
        <div className="lg:col-span-4 bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center flex flex-col items-center justify-center space-y-3">
          <CircularScore score={analysisResult.overallScore} size={150} label="Overall Match" />
          <div>
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mb-1.5">
              {analysisResult.verdict}
            </span>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              {analysisResult.explanation}
            </p>
          </div>
        </div>

        {/* Breakdown bars list */}
        <div className="lg:col-span-8 bg-white rounded-xl p-6 border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Score Breakdown by Dimension
              </h3>
              <p className="text-xs text-slate-500">
                Evaluation criteria mapped directly to job description requirements
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">100% Scale</span>
          </div>

          <div className="space-y-3">
            {analysisResult.breakdown.map((item) => {
              const Icon = getCategoryIcon(item.category);
              return (
                <div key={item.category} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-white border border-slate-200 text-blue-600 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">{item.category}</span>
                        <span className="ml-2 text-[10px] text-slate-500 font-mono">Weight: {item.weight}</span>
                      </div>
                    </div>
                    <span className="font-bold text-xs text-slate-900 font-display">{item.score}%</span>
                  </div>

                  <ProgressBar value={item.score} showPercentage={false} height="h-1.5" />
                  <p className="text-[11px] text-slate-600">{item.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Next Step Action Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Want to see specific skill gaps and recommendations?
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore the detailed Gap Analysis page to review strong matches, weakly represented skills, and missing requirements.
          </p>
        </div>
        <button
          onClick={() => navigate('/gap-analysis')}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span>Open Gap Analysis</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
