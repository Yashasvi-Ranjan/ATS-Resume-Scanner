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
  ChevronRight,
  UserCheck,
  FileText,
  Briefcase
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ScoreCard from '../components/ScoreCard';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { userProfile, analysisResult, resumeFile, historyList } = useApp();

  return (
    <div className="space-y-6">
      {/* Welcome & Primary Actions Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Target Role: {userProfile.targetRole}</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 font-display">
              Welcome back, {userProfile.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              Your latest scan for <span className="font-semibold text-slate-800">{analysisResult.company}</span> shows an overall match of <span className="font-semibold text-blue-600">{analysisResult.overallScore}%</span> with targeted enhancement opportunities in TypeScript and testing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/analysis')}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-2 transition-colors"
            >
              <FileSearch className="w-4 h-4" />
              <span>Analyze Target Job</span>
            </button>
            <button
              onClick={() => navigate('/resume-enhancement')}
              className="px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Enhance Resume</span>
            </button>
          </div>
        </div>

        {/* Current Active Workflow Indicators */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current Resume</span>
              <span className="font-medium text-slate-800 truncate block">{resumeFile?.name || 'Sarah_Johnson_Resume.pdf'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Target Company</span>
              <span className="font-medium text-slate-800 truncate block">{analysisResult.company} ({analysisResult.jobTitle})</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <Target className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Latest Match</span>
              <span className="font-bold text-emerald-700 block">{analysisResult.overallScore}% — {analysisResult.verdict}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Scores Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
            <span>Current Benchmark Overview</span>
          </h3>
          <Link
            to="/analysis/results"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5"
          >
            <span>View Full Analysis</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard
            title="Overall Match"
            score={78}
            icon={Target}
            weight="Overall Score"
            summary="Candidate satisfies 80%+ of core frontend responsibilities."
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
            summary="2+ years relevant experience; gap in TypeScript and testing."
            onClick={() => navigate('/gap-analysis')}
          />
          <ScoreCard
            title="Keywords Alignment"
            score={76}
            icon={FileSearch}
            weight="15% Weight"
            summary="19 of 25 priority ATS keywords detected across sections."
            onClick={() => navigate('/resume-enhancement')}
          />
        </div>
      </div>

      {/* Workflow Quick Links & Candidate Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Scans */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Recent Evaluations
                </h3>
                <p className="text-xs text-slate-500">
                  Track match scores and mock interview performance
                </p>
              </div>
              <Link
                to="/history"
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                View History
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="pb-2.5 font-semibold">Job Role</th>
                    <th className="pb-2.5 font-semibold">Company</th>
                    <th className="pb-2.5 font-semibold">Type</th>
                    <th className="pb-2.5 font-semibold">Score</th>
                    <th className="pb-2.5 font-semibold">Date</th>
                    <th className="pb-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.slice(0, 4).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 font-medium text-slate-900">
                        {item.role}
                      </td>
                      <td className="py-2.5 text-slate-600">{item.company}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            item.type === 'Resume Analysis'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-slate-900">
                        {item.score}%
                      </td>
                      <td className="py-2.5 text-slate-500">{item.date}</td>
                      <td className="py-2.5 text-right">
                        <Link
                          to={item.detailsUrl}
                          className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
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

        {/* Right Col: Recommended Next Step */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Next Recommended Step
              </h3>
            </div>

            <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-100 space-y-2.5">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                High-Impact Gap
              </span>
              <h4 className="text-xs font-bold text-slate-900">
                Enhance Experience Bullets
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Review 4 grounded bullet suggestions to quantify achievements and elevate keyword alignment from 76% to 90%+.
              </p>
              <button
                onClick={() => navigate('/resume-enhancement')}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Review Enhancements</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Launch
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/gap-analysis')}
                className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
              >
                <span className="text-xs font-semibold text-slate-800 block">
                  Gap Analysis
                </span>
                <span className="text-[11px] text-slate-500">4 Gaps to address</span>
              </button>
              <button
                onClick={() => navigate('/mock-interview')}
                className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
              >
                <span className="text-xs font-semibold text-slate-800 block">
                  Mock Interview
                </span>
                <span className="text-[11px] text-slate-500">8 Role questions</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
