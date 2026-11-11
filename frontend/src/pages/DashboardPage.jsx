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
  const { userProfile, currentUser, analysisResult, resumeFile, historyList, historyError, gapAnalysis } = useApp();

  const displayName = userProfile?.name || currentUser?.name || '';
  const targetRole = userProfile?.targetRole || '';
  const history = Array.isArray(historyList) ? historyList : [];

  const hasNumber = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const formatScore = (v) => (hasNumber(v) ? `${Math.round(Number(v))}%` : 'N/A');

  const findBreakdown = (name) => {
    const list = Array.isArray(analysisResult?.breakdown) ? analysisResult.breakdown : [];
    return list.find((b) => (b?.category || b?.label || '').toLowerCase() === name.toLowerCase()) || null;
  };
  const skillsEntry = findBreakdown('Skills Match');
  const experienceEntry = findBreakdown('Experience Match');
  const keywordsEntry = findBreakdown('Keywords Alignment');
  const formatWeight = (entry) => (entry?.weight ? `${entry.weight} Weight` : undefined);

  const isAnalysisType = (t) => t === 'analysis' || t === 'Resume Analysis';
  const typeLabel = (t) => (isAnalysisType(t) ? 'Resume Analysis' : t === 'interview' ? 'Mock Interview' : t);

  const gapCount = gapAnalysis
    ? (Array.isArray(gapAnalysis.improve) ? gapAnalysis.improve.length : 0) +
      (Array.isArray(gapAnalysis.learnAndAdd) ? gapAnalysis.learnAndAdd.length : 0)
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome & Primary Actions Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Target Role: {targetRole || 'Not set'}</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 font-display">
              {displayName ? `Welcome back, ${displayName}` : 'Welcome back'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              {analysisResult ? (
                hasNumber(analysisResult.overallScore) ? (
                  <>Your latest scan for <span className="font-semibold text-slate-800">{analysisResult.company || analysisResult.jobTitle || 'your target job'}</span> shows an overall match of <span className="font-semibold text-blue-600">{formatScore(analysisResult.overallScore)}</span>.</>
                ) : (
                  <>Your latest scan for <span className="font-semibold text-slate-800">{analysisResult.company || analysisResult.jobTitle || 'your target job'}</span> has been saved. Scoring is not available yet.</>
                )
              ) : (
                'No analysis yet. Upload a resume and add a job description to get started.'
              )}
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
              <span className="font-medium text-slate-800 truncate block">{resumeFile?.name || 'No resume uploaded'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Target Company</span>
              <span className="font-medium text-slate-800 truncate block">{analysisResult
                  ? [analysisResult.company, analysisResult.jobTitle && `(${analysisResult.jobTitle})`].filter(Boolean).join(' ') || 'N/A'
                  : 'No analysis yet'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <Target className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Latest Match</span>
              <span className="font-bold text-emerald-700 block">{analysisResult
                  ? [formatScore(analysisResult.overallScore), analysisResult.verdict].filter(Boolean).join(' — ')
                  : 'No analysis yet'}</span>
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
            score={analysisResult?.overallScore ?? null}
            emptyLabel="Pending"
            icon={Target}
            weight="Overall Score"
            summary={analysisResult ? analysisResult.explanation || undefined : 'No analysis yet.'}
            onClick={() => navigate('/analysis/results')}
          />
          <ScoreCard
            title="Skills Match"
            score={skillsEntry?.score ?? null}
            emptyLabel="Pending"
            icon={Layers}
            weight={formatWeight(skillsEntry)}
            summary={skillsEntry?.summary}
            onClick={() => navigate('/gap-analysis')}
          />
          <ScoreCard
            title="Experience Match"
            score={experienceEntry?.score ?? null}
            emptyLabel="Pending"
            icon={TrendingUp}
            weight={formatWeight(experienceEntry)}
            summary={experienceEntry?.summary}
            onClick={() => navigate('/gap-analysis')}
          />
          <ScoreCard
            title="Keywords Alignment"
            score={keywordsEntry?.score ?? null}
            emptyLabel="Pending"
            icon={FileSearch}
            weight={formatWeight(keywordsEntry)}
            summary={keywordsEntry?.summary}
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

            {historyError && (
              <p className="text-xs text-rose-600 mb-2">{historyError}</p>
            )}

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
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-2.5 text-slate-500">
                        No history yet
                      </td>
                    </tr>
                  )}
                  {history.slice(0, 4).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 font-medium text-slate-900">
                        {item.role}
                      </td>
                      <td className="py-2.5 text-slate-600">{item.company}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isAnalysisType(item.type)
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {typeLabel(item.type)}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-slate-900">
                        {item.score == null ? 'N/A' : `${Math.round(item.score)}%`}
                      </td>
                      <td className="py-2.5 text-slate-500">{item.date}</td>
                      <td className="py-2.5 text-right">
                        {item.detailsUrl ? (
                          <Link
                            to={item.detailsUrl}
                            className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span
                            aria-disabled="true"
                            className="inline-flex items-center gap-0.5 text-xs text-slate-400 font-semibold cursor-not-allowed"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
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
                Review your experience bullets to quantify achievements and align keywords with the target job description.
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
                <span className="text-[11px] text-slate-500">
                  {gapCount == null ? 'N/A' : `${gapCount} ${gapCount === 1 ? 'Gap' : 'Gaps'} to address`}
                </span>
              </button>
              <button
                onClick={() => navigate('/mock-interview')}
                className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
              >
                <span className="text-xs font-semibold text-slate-800 block">
                  Mock Interview
                </span>
                <span className="text-[11px] text-slate-500">Practice role questions</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
