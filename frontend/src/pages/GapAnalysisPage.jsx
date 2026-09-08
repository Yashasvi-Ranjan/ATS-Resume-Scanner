import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Sparkles,
  Bot,
  Filter,
  Lightbulb,
  Check,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import SkillBadge from '../components/SkillBadge';

export default function GapAnalysisPage() {
  const navigate = useNavigate();
  const { gapAnalysis } = useApp();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'strong', 'improve', 'learn'

  const getImportanceBadge = (importance) => {
    switch (importance?.toLowerCase()) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">Medium Priority</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">Low / Preferred</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <GitPullRequest className="w-4 h-4" />
            <span>Job-Specific Competency Mapping</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-white font-display">
            Skill & Experience Gap Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Target: <strong className="text-slate-200">{gapAnalysis.jobTitle}</strong> at <strong className="text-slate-200">{gapAnalysis.company}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/resume-enhancement')}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enhance Resume Gaps</span>
          </button>
          <button
            onClick={() => navigate('/mock-interview')}
            className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>Practice Interview</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          All Items ({gapAnalysis.strongMatches.length + gapAnalysis.improve.length + gapAnalysis.learnAndAdd.length})
        </button>
        <button
          onClick={() => setActiveTab('strong')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'strong'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Strong Matches ({gapAnalysis.strongMatches.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('improve')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'improve'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-amber-400 hover:bg-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Needs Improvement ({gapAnalysis.improve.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('learn')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'learn'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-blue-400 hover:bg-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Missing / Learn & Add ({gapAnalysis.learnAndAdd.length})</span>
        </button>
      </div>

      {/* Sections Grid */}
      <div className="space-y-8">
        {/* Section 1: Strong Matches */}
        {(activeTab === 'all' || activeTab === 'strong') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  1. Strong Matches & Proven Competencies
                </h3>
                <p className="text-xs text-slate-400">
                  Skills already present in your resume that strongly satisfy the Job Description
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gapAnalysis.strongMatches.map((item) => (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl p-5 border border-emerald-500/20 bg-emerald-950/5 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-white font-display">
                        {item.skill}
                      </h4>
                      {getImportanceBadge(item.importance)}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mb-2">
                      <Check className="w-3 h-3" /> {item.status}
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80">
                    <p className="text-xs text-slate-300 font-medium">
                      💡 <strong className="text-emerald-300">Action:</strong> {item.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Needs Improvement */}
        {(activeTab === 'all' || activeTab === 'improve') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  2. Existing Skills That Need Stronger Representation
                </h3>
                <p className="text-xs text-slate-400">
                  Relevant capabilities present in your background but described with low impact or missing metrics
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gapAnalysis.improve.map((item) => (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-amber-950/5 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-white font-display">
                        {item.skill}
                      </h4>
                      {getImportanceBadge(item.importance)}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 mb-2">
                      <AlertTriangle className="w-3 h-3" /> {item.status}
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80">
                    <p className="text-xs text-slate-300 font-medium">
                      💡 <strong className="text-amber-300">Recommendation:</strong> {item.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Learn / Add */}
        {(activeTab === 'all' || activeTab === 'learn') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  3. Skills to Learn / Add (Missing from Resume)
                </h3>
                <p className="text-xs text-slate-400">
                  Core technologies required or preferred in the Job Description but absent from your resume
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gapAnalysis.learnAndAdd.map((item) => (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl p-5 border border-blue-500/20 bg-blue-950/5 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-white font-display">
                        {item.skill}
                      </h4>
                      {getImportanceBadge(item.importance)}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 mb-2">
                      • {item.status}
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80">
                    <p className="text-xs text-slate-300 font-medium">
                      💡 <strong className="text-blue-300">Learning Plan:</strong> {item.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Next Step Callout */}
      <div className="glass-card rounded-2xl p-6 border border-brand-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-brand-950/30 to-slate-900">
        <div>
          <h4 className="text-sm font-bold text-white">
            Ready to apply these fixes to your resume?
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            The Resume Enhancement module will rewrite your experience bullets to address these exact gaps.
          </p>
        </div>
        <button
          onClick={() => navigate('/resume-enhancement')}
          className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/20 flex items-center gap-2 shrink-0"
        >
          <span>Open Resume Enhancement</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
