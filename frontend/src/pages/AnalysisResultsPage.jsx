import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Target, Sparkles, ArrowRight, FileText, Briefcase, Layers, GraduationCap, FolderGit2,
  GitPullRequest, Loader2, AlertTriangle, Bot
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import CircularScore from '../components/CircularScore';
import ProgressBar from '../components/ProgressBar';
import { api } from '../services/api';
import { describeApiError } from '../utils/errors';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import { buildAnalysisSummary, CATEGORY_LABELS, MATCH_LABEL, MATCH_DISCLAIMER, getVerdict } from '../utils/analysis';

const ICONS = { skills: Layers, experience: Briefcase, keywords: FileText, education: GraduationCap, projects: FolderGit2 };
const CONF_STYLE = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-rose-50 text-rose-700 border-rose-200'
};

function Evidence({ items }) {
  if (!items?.length) return <p className="text-[11px] text-slate-400">No resume evidence found.</p>;
  return (
    <ul className="space-y-1">
      {items.map((e, i) => (
        <li key={i} className="text-[11px] text-slate-600 border-l-2 border-slate-200 pl-2">
          <span className="font-semibold text-slate-500 uppercase">{e.section}</span> — “{e.snippet}”
        </li>
      ))}
    </ul>
  );
}

function RequirementList({ title, tone, items }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card space-y-3">
      <h3 className={`text-sm font-bold font-display ${tone}`}>{title} ({items.length})</h3>
      {items.length === 0 && <p className="text-xs text-slate-500">None.</p>}
      {items.map((r, i) => (
        <details key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
          <summary className="text-xs font-semibold text-slate-900 cursor-pointer">
            {r.requirement}{' '}
            <span className="font-normal text-slate-500">({r.type}, {r.level})</span>
          </summary>
          <p className="text-xs text-slate-600 mt-2">{r.reason}</p>
          <div className="mt-2"><Evidence items={r.resumeEvidence} /></div>
        </details>
      ))}
    </div>
  );
}

export default function AnalysisResultsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { setAnalysisResult, currentUser, userProfile } = useApp();
  const userId = currentUser?.id;

  const [resolving, setResolving] = useState(!id);
  const [noAnalysis, setNoAnalysis] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [record, setRecord] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // /analysis/results without id -> latest persisted analysis
  useEffect(() => {
    if (id) return undefined;
    let cancelled = false;
    setResolving(true);
    api.analyses.list({ limit: 1 }).then((res) => {
      if (cancelled) return;
      const latest = res?.data?.[0]?.id;
      if (latest) navigate(`/analysis/results/${latest}`, { replace: true });
      else { setNoAnalysis(true); setResolving(false); }
    }).catch((err) => {
      if (cancelled) return;
      setLoadError(describeApiError(err));
      setResolving(false);
    });
    return () => { cancelled = true; };
  }, [id, userId, navigate, attempt]);

  // initial fetch for an id
  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setRecord(null);
    setLoadError(null);
    api.analyses.get(id).then((res) => {
      if (cancelled) return;
      setRecord(res?.data);
    }).catch((err) => {
      if (cancelled) return;
      setLoadError(err?.status === 404 ? 'This analysis could not be found. It may have been deleted.' : describeApiError(err, 'Failed to load the analysis.'));
    });
    return () => { cancelled = true; };
  }, [id, userId, attempt]);

  const active = record && (record.status === 'PENDING' || record.status === 'PROCESSING');
  const { analysis: polled, timedOut, error: pollError, restart } = useAnalysisPolling(id, { enabled: !!active });
  const current = polled && polled.id === id ? polled : record;

  useEffect(() => {
    if (current?.status === 'COMPLETED') setAnalysisResult(buildAnalysisSummary(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.status, current?.id]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const res = await api.analyses.retry(id);
      setRecord(res?.data);
      restart();
    } catch (err) {
      setLoadError(describeApiError(err));
    } finally {
      setRetrying(false);
    }
  };

  const box = (children) => (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center space-y-3">{children}</div>
  );

  if (!id) {
    if (resolving) return box(<p className="text-sm text-slate-600">Loading your latest analysis…</p>);
    return box(
      <>
        <p className="text-sm text-slate-600">{loadError || 'No analysis yet. Upload a resume and run an analysis.'}</p>
        {loadError ? (
          <button onClick={() => setAttempt((n) => n + 1)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer">Retry</button>
        ) : (
          <Link to="/analysis" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5">
            <span>Go to Analysis</span><ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </>
    );
  }

  if (loadError && !current) {
    return box(
      <>
        <p className="text-sm text-red-600" role="alert">{loadError}</p>
        <div className="flex justify-center gap-2.5">
          <button onClick={() => setAttempt((n) => n + 1)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer">Retry</button>
          <Link to="/analysis" className="px-4 py-2 rounded-lg bg-white text-slate-700 text-xs font-semibold border border-slate-300">Back to Analysis</Link>
        </div>
      </>
    );
  }
  if (!current) return box(<p className="text-sm text-slate-600" role="status">Loading saved analysis…</p>);

  const summary = buildAnalysisSummary(current);
  const header = (
    <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
          {MATCH_LABEL}{userProfile?.name ? <span className="text-slate-500 font-normal normal-case"> • Candidate: {userProfile.name}</span> : null}
        </div>
        <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">{summary.jobTitle}</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Company: <strong className="text-slate-800">{summary.company || 'Not specified'}</strong> • File: <strong className="text-slate-800">{summary.fileName || 'Not specified'}</strong> • {summary.scanDate}
        </p>
      </div>
      {current.status === 'COMPLETED' && (
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={() => navigate(`/gap-analysis/${id}`)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <span>View Gap Analysis</span><ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => navigate(`/resume-enhancement?analysis=${id}`)} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 cursor-pointer">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /><span>Enhance Resume</span>
          </button>
          <button onClick={() => navigate(`/mock-interview?analysis=${id}`)} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 cursor-pointer">
            <Bot className="w-3.5 h-3.5 text-blue-600" /><span>Practice Interview</span>
          </button>
        </div>
      )}
    </div>
  );

  if (current.status === 'PENDING' || current.status === 'PROCESSING') {
    return (
      <div className="space-y-6">
        {header}
        {box(
          <>
            <p className="text-sm text-slate-700 flex items-center justify-center gap-2" role="status">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              {current.status === 'PENDING' ? 'Analysis queued…' : 'Analysis in progress…'}
            </p>
            {timedOut && <p className="text-xs text-amber-700">Still running after several minutes. Reload this page later to check again.</p>}
            {pollError && <p className="text-xs text-rose-700" role="alert">{describeApiError(pollError)}</p>}
          </>
        )}
      </div>
    );
  }

  if (current.status === 'FAILED') {
    return (
      <div className="space-y-6">
        {header}
        <div className="bg-white rounded-xl p-6 border border-rose-200 shadow-card text-center space-y-3" role="alert">
          <p className="text-sm font-semibold text-rose-700 flex items-center justify-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Analysis failed</p>
          <p className="text-xs text-slate-600">{current.errorMessage || 'The analysis could not be completed. No score is available.'}</p>
          {loadError && <p className="text-xs text-rose-700">{loadError}</p>}
          <button onClick={handleRetry} disabled={retrying} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer">
            {retrying ? 'Retrying…' : 'Retry analysis'}
          </button>
        </div>
      </div>
    );
  }

  const r = current.resultData;
  if (!r || !r.categories) {
    return (
      <div className="space-y-6">
        {header}
        {box(<p className="text-sm text-slate-600">This analysis has no detailed result data.</p>)}
      </div>
    );
  }

  const score = typeof r.overallScore === 'number' ? r.overallScore : null;
  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-4 bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center flex flex-col items-center justify-center space-y-3">
          <CircularScore score={score} size={150} label="Estimated Match" emptyLabel="N/A" />
          <span className="px-2.5 py-0.5 rounded text-xs font-bold border bg-slate-50 text-slate-700 border-slate-200">{getVerdict(score)} match</span>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">{r.disclaimer || MATCH_DISCLAIMER}</p>
        </div>

        <div className="lg:col-span-8 bg-white rounded-xl p-6 border border-slate-200 shadow-card space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 font-display">Score Breakdown by Category</h3>
            <p className="text-xs text-slate-500">Weights are re-normalised when a category cannot be assessed.</p>
          </div>
          <div className="space-y-3">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const c = r.categories[key];
              if (!c) return null;
              const Icon = ICONS[key] || Target;
              const notAssessed = c.notAssessable || c.score == null;
              return (
                <div key={key} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-white border border-slate-200 text-blue-600 flex items-center justify-center"><Icon className="w-3.5 h-3.5" /></div>
                      <span className="font-semibold text-slate-900">{label}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        weight {Math.round((c.weight || 0) * 100)}%{c.effectiveWeight !== c.weight ? ` → ${Math.round((c.effectiveWeight || 0) * 100)}%` : ''}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${CONF_STYLE[c.confidence] || CONF_STYLE.low}`}>{c.confidence} confidence</span>
                    </div>
                    <span className="font-bold text-xs text-slate-900 font-display">{notAssessed ? 'Not assessed' : `${Math.round(c.score)}%`}</span>
                  </div>
                  <ProgressBar value={notAssessed ? null : c.score} showPercentage={false} height="h-1.5" />
                  <p className="text-[11px] text-slate-600">{c.explanation}</p>
                  {(c.deductions?.length > 0 || c.evidence?.length > 0) && (
                    <details className="text-[11px]">
                      <summary className="cursor-pointer text-blue-700 font-medium">Details</summary>
                      {c.deductions?.length > 0 && (
                        <ul className="list-disc pl-4 mt-1 text-slate-600">{c.deductions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                      )}
                      <div className="mt-1.5"><Evidence items={c.evidence} /></div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <RequirementList title="Matched requirements" tone="text-emerald-700" items={r.requirements?.matched || []} />
        <RequirementList title="Partially matched" tone="text-amber-700" items={r.requirements?.partial || []} />
        <RequirementList title="Missing requirements" tone="text-rose-700" items={r.requirements?.missing || []} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card space-y-2">
          <h3 className="text-sm font-bold text-slate-900 font-display">Strengths</h3>
          {(r.strengths || []).length === 0 && <p className="text-xs text-slate-500">None recorded.</p>}
          <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1">{(r.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card space-y-2">
          <h3 className="text-sm font-bold text-slate-900 font-display">Weaknesses</h3>
          {(r.weaknesses || []).length === 0 && <p className="text-xs text-slate-500">None recorded.</p>}
          <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1">{(r.weaknesses || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      </div>

      {(r.uncertainty || []).length > 0 && (
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 space-y-2">
          <h3 className="text-sm font-bold text-amber-900 font-display">Uncertainty notes</h3>
          <ul className="list-disc pl-4 text-xs text-amber-900 space-y-1">{r.uncertainty.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </div>
      )}

      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Want to see specific skill gaps and recommendations?</h4>
          <p className="text-xs text-slate-500 mt-0.5">{r.disclaimer || MATCH_DISCLAIMER}</p>
        </div>
        <button onClick={() => navigate(`/gap-analysis/${id}`)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer">
          <GitPullRequest className="w-3.5 h-3.5" /><span>Open Gap Analysis</span><ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
