import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileSearch,
  Sparkles,
  Bot,
  ArrowRight,
  TrendingUp,
  Target,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ScoreCard from '../components/ScoreCard';
import CircularScore from '../components/CircularScore';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { userProfile, analysisResult, historyList } = useApp();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="glass-card rounded-2xl p-6 lg:p-8 border border-slate-800 relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Target Role: {userProfile.targetRole}</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white font-display">
              Welcome back, {userProfile.name}! 👋
            </h2>
            <p className="text-sm text-slate-400 max-w-xl">
              Continue improving your readiness for your target roles. Your latest scan for <span className="text-slate-200 font-semibold">{analysisResult.company}</span> shows a strong foundation with targeted opportunities in TypeScript and testing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/analysis')}
              className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all active:scale-95"
            >
              <FileSearch className="w-4 h-4" />
              <span>Analyze New Job</span>
            </button>
            <button
              onClick={() => navigate('/resume-enhancement')}
              className="px-5 py-3 rounded-xl glass-card hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>Enhance Resume</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Scores Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-400" />
            <span>Current Benchmark Overview</span>
          </h3>
          <Link
            to="/analysis/results"
            className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
          >
            View Detailed Match Report <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard
            title="Overall Match"
            score={78}
            icon={Target}
            weight="Overall Score"
            summary="Good match. Candidate satisfies 80%+ of core frontend responsibilities."
            onClick={() => navigate('/analysis/results')}
          />
          <ScoreCard
            title="Skills Match"
            score={82}
            icon={Layers}
            weight="35% Weight"
            summary="Strong proficiency in React, JavaScript, HTML/CSS, and REST APIs."
            onClick={() => navigate('/gap-analysis')}
          />
          <ScoreCard
            title="Experience Match"
            score={74}
            icon={TrendingUp}
            weight="25% Weight"
            summary="2+ years relevant experience; gap in TypeScript and unit testing."
            onClick={() => navigate('/gap-analysis')}
          />
          <ScoreCard
            title="Keyword Alignment"
            score={76}
            icon={FileSearch}
            weight="15% Weight"
            summary="19 of 25 priority ATS keywords detected across resume sections."
            onClick={() => navigate('/resume-enhancement')}
          />
        </div>
      </div>

      {/* Workflow Quick Links & Candidate Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Scans */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Recent Analyses & Evaluations
                </h3>
                <p className="text-xs text-slate-400">
                  Track performance across different target roles and interview sessions
                </p>
              </div>
              <Link
                to="/history"
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
              >
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800/80">
                    <th className="pb-3 font-semibold">Job Role / Assessment</th>
                    <th className="pb-3 font-semibold">Company</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Match Score</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {historyList.slice(0, 4).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-medium text-slate-200">
                        {item.role}
                      </td>
                      <td className="py-3 text-slate-400">{item.company}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            item.type === 'Resume Analysis'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-emerald-400">
                        {item.score}%
                      </td>
                      <td className="py-3 text-slate-400">{item.date}</td>
                      <td className="py-3 text-right">
                        <Link
                          to={item.detailsUrl}
                          className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-semibold"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Quick Actions & Recommended Next Step */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <h3 className="text-base font-bold text-white font-display">
                Next Recommended Step
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-brand-500/30 space-y-3">
              <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wider">
                High-Impact Gap Identified
              </span>
              <h4 className="text-sm font-semibold text-slate-200">
                Enhance Resume for Apex Innovations
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review 4 suggested bullet enhancements to quantify achievements and elevate keyword alignment from 76% to 90%+.
              </p>
              <button
                onClick={() => navigate('/resume-enhancement')}
                className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Review Suggested Enhancements</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Quick Launch
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/gap-analysis')}
                className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <span className="text-xs font-semibold text-slate-200 block group-hover:text-brand-300">
                  Gap Analysis
                </span>
                <span className="text-[10px] text-slate-500">4 Gaps to address</span>
              </button>
              <button
                onClick={() => navigate('/mock-interview')}
                className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <span className="text-xs font-semibold text-slate-200 block group-hover:text-brand-300">
                  Mock Interview
                </span>
                <span className="text-[10px] text-slate-500">8 Role questions</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
