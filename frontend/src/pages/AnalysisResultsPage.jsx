import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
import { api } from '../services/api';

const toScore = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const getVerdict = (score) => {
  if (score == null) return null;
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'Low';
};

// Maps a saved backend record to the page model. Nothing is invented.
function mapSavedAnalysis(rec) {
  const overallScore = toScore(rec.overallScore);
  const cats = [
    ['Skills Match', toScore(rec.skillsScore)],
    ['Experience Match', toScore(rec.experienceScore)],
    ['Keywords Alignment', toScore(rec.keywordsScore)],
    ['Education', toScore(rec.educationScore)]
  ];
  return {
    id: rec.id,
    status: rec.status,
    jobTitle: rec.jobDescription?.title || 'Untitled role',
    company: rec.jobDescription?.companyName || '',
    fileName: rec.resume?.originalFilename || '',
    scanDate: rec.createdAt || '',
    overallScore,
    verdict: getVerdict(overallScore),
    breakdown: cats.filter(([, v]) => v !== null).map(([category, score]) => ({ category, score }))
  };
}

function describeError(err) {
  if (err?.status === 404) return 'This analysis could not be found. It may have been deleted.';
  if (err?.status === 403) return 'You do not have permission to view this analysis.';
  if (err?.status === 400) {
    const detail = Array.isArray(err.errors) && err.errors.length ? err.errors.map((e) => e.message).filter(Boolean).join(', ') : '';
    return `Invalid analysis link${detail ? `: ${detail}` : '.'}`;
  }
  return err?.message || 'Failed to load the saved analysis.';
}

export default function AnalysisResultsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { analysisResult, setAnalysisResult, resumeFile, userProfile, currentUser } = useApp();
  const userId = currentUser?.id;
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.analyses
      .get(id)
      .then((res) => {
        if (cancelled) return;
        const rec = res?.data ?? res;
        if (!rec || rec.id !== id) throw new Error('Unexpected response while loading the analysis.');
        const model = mapSavedAnalysis(rec);
        setLoaded(model);
        setAnalysisResult(model);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoaded(null);
        setError(describeError(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId, attempt]);

  // Only ever show data that belongs to the requested id.
  const result = id
    ? loaded?.id === id
      ? loaded
      : analysisResult?.id === id
        ? analysisResult
        : null
    : analysisResult;

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

  if (id && !result) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center space-y-3">
          {error ? (
            <>
              <p className="text-sm text-red-600" role="alert">{error}</p>
              <div className="flex items-center justify-center gap-2.5">
                <button
                  onClick={retry}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle transition-colors cursor-pointer"
                >
                  Retry
                </button>
                <Link
                  to="/analysis"
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Back to Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">{loading ? 'Loading saved analysis…' : 'Analysis not available.'}</p>
          )}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center space-y-3">
          <p className="text-sm text-slate-600">
            No analysis yet. Upload a resume and run an analysis.
          </p>
          <Link
            to="/analysis"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Go to Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const candidateName = userProfile?.name;
  const breakdown = result.breakdown || [];
  const hasScore = result.overallScore !== null && result.overallScore !== undefined;
  const isFailed = result.status === 'FAILED';
  const isPending = !hasScore && !isFailed;
  const statusText = isFailed
    ? 'Analysis failed'
    : isPending
      ? 'Pending — not evaluated'
      : null;
  const statusNote = isFailed
    ? 'This analysis failed and no scores are available.'
    : isPending
      ? 'This analysis request has been saved. Scoring is not available yet.'
      : null;
  const formatScore = (score) =>
    score === null || score === undefined ? 'N/A' : `${score}%`;

  return (
    <div className="space-y-6">
      {id && error && (
        <div className="bg-white rounded-xl p-4 border border-red-200 shadow-card flex items-center justify-between gap-3">
          <p className="text-xs text-red-600" role="alert">{error}</p>
          <button
            onClick={retry}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Banner with Role info & CTAs */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
            <span>ATS Match Verification Report</span>
            {candidateName && (
              <>
                <span>•</span>
                <span className="text-slate-500 font-normal">Candidate: {candidateName}</span>
              </>
            )}
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">
            {result.jobTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target Company: <strong className="text-slate-800">{result.company || 'Not specified'}</strong> • File: <strong className="text-slate-800">{(id ? result.fileName : resumeFile?.name || result.fileName) || 'Not specified'}</strong>
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
          <CircularScore score={result.overallScore} size={150} label="Overall Match" emptyLabel="Pending" />
          <div>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold inline-block mb-1.5 border ${
                hasScore && result.verdict
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {result.verdict || statusText || 'Pending'}
            </span>
            {result.status && (
              <div className="mb-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider inline-block border bg-slate-50 text-slate-600 border-slate-200">
                  {result.status}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              {result.explanation || statusNote || 'Scoring is not available for this analysis yet.'}
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
            {breakdown.length === 0 && (
              <p className="text-xs text-slate-500">Not evaluated</p>
            )}
            {breakdown.map((item, idx) => {
              const name = item.category || item.label;
              const Icon = getCategoryIcon(name);
              return (
                <div key={name || idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-white border border-slate-200 text-blue-600 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">{name}</span>
                        {item.weight !== undefined && item.weight !== null && (
                          <span className="ml-2 text-[10px] text-slate-500 font-mono">Weight: {item.weight}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-xs text-slate-900 font-display">{formatScore(item.score)}</span>
                  </div>

                  <ProgressBar value={item.score} showPercentage={false} height="h-1.5" emptyLabel="Pending" />
                  {item.summary && <p className="text-[11px] text-slate-600">{item.summary}</p>}
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
