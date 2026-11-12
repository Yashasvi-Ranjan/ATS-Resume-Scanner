import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GitPullRequest, AlertTriangle, BookOpen, ArrowRight, Sparkles, Bot, Loader2, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { describeApiError } from '../utils/errors';

const STATUS_LABELS = { NOT_STARTED: 'Not started', IN_PROGRESS: 'In progress', COMPLETED: 'Completed' };
const PRIORITY_STYLE = {
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-blue-50 text-blue-700 border-blue-200'
};

export default function GapAnalysisPage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { analysisResult, setGapAnalysis, showToast, currentUser } = useApp();
  const userId = currentUser?.id;
  const ctxId = analysisResult && analysisResult.status === 'COMPLETED' ? analysisResult.id : null;
  const requestedId = routeId || ctxId || null;

  const [activeTab, setActiveTab] = useState('all');
  const [analysis, setAnalysis] = useState(null);
  const [gap, setGap] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | none | error | notReady
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [savingIds, setSavingIds] = useState({});
  const savingRef = useRef(new Set());
  const genRef = useRef(false);
  const keyRef = useRef(0);

  useEffect(() => {
    const key = ++keyRef.current;
    let cancelled = false;
    setState('loading');
    setError(null);
    setGap(null);
    setAnalysis(null);
    (async () => {
      try {
        let id = requestedId;
        if (!id) {
          const list = await api.analyses.list({ limit: 1, status: 'COMPLETED' });
          id = list?.data?.[0]?.id || null;
          if (!id) { if (!cancelled) setState('none'); return; }
        }
        const aRes = await api.analyses.get(id);
        if (cancelled) return;
        const a = aRes?.data;
        setAnalysis(a);
        if (a?.status !== 'COMPLETED') { setState('notReady'); return; }
        const gRes = await api.analyses.getGapAnalysis(id);
        if (cancelled || key !== keyRef.current) return;
        setGap(gRes?.data);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(describeApiError(err, 'Failed to load gap analysis.'));
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [requestedId, userId, attempt]);

  useEffect(() => {
    if (!gap) return;
    setGapAnalysis({ analysisId: analysis?.id, improve: gap.improve, learnAndAdd: gap.learnAdd });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gap]);

  const generate = async (force) => {
    if (genRef.current || !analysis?.id) return;
    if (force && !window.confirm('Regenerate recommendations? Items you have progressed are preserved.')) return;
    genRef.current = true;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await api.analyses.generateRecommendations(analysis.id, force);
      const { improve, learnAdd, summary } = res?.data || {};
      setGap({ improve: improve || [], learnAdd: learnAdd || [], summary });
      showToast('Recommendations updated.', 'success');
    } catch (err) {
      setGenError(describeApiError(err, 'Could not generate recommendations.'));
    } finally {
      genRef.current = false;
      setGenerating(false);
    }
  };

  const handleStatus = useCallback(async (item, newStatus) => {
    if (newStatus === item.status || savingRef.current.has(item.id)) return;
    savingRef.current.add(item.id);
    setSavingIds((p) => ({ ...p, [item.id]: true }));
    try {
      const res = await api.recommendations.updateStatus(item.id, newStatus);
      const updated = res?.data?.status || newStatus;
      const patch = (list) => list.map((it) => (it.id === item.id ? { ...it, status: updated } : it));
      setGap((g) => (g ? { ...g, improve: patch(g.improve), learnAdd: patch(g.learnAdd) } : g));
    } catch (err) {
      showToast(`Failed to update status: ${describeApiError(err)}`, 'error');
    } finally {
      savingRef.current.delete(item.id);
      setSavingIds((p) => { const n = { ...p }; delete n[item.id]; return n; });
    }
  }, [showToast]);

  const box = (children) => (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center space-y-3">{children}</div>
  );

  if (state === 'loading') return box(<p className="text-sm text-slate-600" role="status">Loading gap analysis…</p>);
  if (state === 'error') return box(<><p className="text-sm text-rose-700" role="alert">{error}</p><button onClick={() => setAttempt((n) => n + 1)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer">Retry</button></>);
  if (state === 'none') return box(<><p className="text-sm text-slate-600">No completed analysis yet. Run an analysis to see your gap analysis.</p><button onClick={() => navigate('/analysis')} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><span>Go to Analysis</span><ArrowRight className="w-3.5 h-3.5" /></button></>);
  if (state === 'notReady') return box(<><p className="text-sm text-slate-600">This analysis is {analysis?.status?.toLowerCase()}; gap analysis is available once it completes.</p><button onClick={() => navigate(`/analysis/results/${analysis.id}`)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer">Open analysis</button></>);

  const improve = gap?.improve || [];
  const learn = gap?.learnAdd || [];
  const total = improve.length + learn.length;

  const renderItem = (item) => {
    const d = item.details || {};
    const topics = d.suggestedLearningTopics || [];
    const evidence = d.evidence || [];
    return (
      <div key={item.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-card space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-900 font-display">{item.title}</h4>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.LOW}`}>{item.priority} priority</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <select
            value={item.status}
            disabled={!!savingIds[item.id]}
            onChange={(e) => handleStatus(item, e.target.value)}
            aria-label={`Status for ${item.title}`}
            className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-60 cursor-pointer"
          >
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {item.source && <span className="text-slate-400">{item.source === 'AI' ? 'Generated' : item.source}</span>}
        </div>
        <div className="text-[11px] text-slate-600">
          <strong className="text-slate-700">Evidence: </strong>
          {evidence.length > 0 ? (
            <ul className="mt-1 space-y-1">{evidence.map((e, i) => <li key={i} className="border-l-2 border-slate-200 pl-2">{e.section}: “{e.snippet}”</li>)}</ul>
          ) : (
            <span>{d.evidenceNote || 'No evidence found in your resume.'}</span>
          )}
        </div>
        <p className="text-xs text-slate-600"><strong className="text-slate-700">Why it matters: </strong>{d.whyItMatters || item.reason || '—'}</p>
        <p className="text-xs text-slate-600"><strong className="text-slate-700">Suggested action: </strong>{d.suggestedAction || item.description}</p>
        {topics.length > 0 && (
          <div className="text-xs text-slate-600">
            <strong className="text-slate-700">Topics to study: </strong>
            <span className="inline-flex flex-wrap gap-1 align-middle">
              {topics.map((t, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">{t}</span>)}
            </span>
          </div>
        )}
        {d.practicalExercise && <p className="text-xs text-slate-600"><strong className="text-slate-700">Practice exercise: </strong>{d.practicalExercise}</p>}
      </div>
    );
  };

  const tabBtn = (key, label, cls) => (
    <button onClick={() => setActiveTab(key)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${activeTab === key ? `${cls} text-white shadow-subtle` : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
            <GitPullRequest className="w-3.5 h-3.5" /><span>Job-Specific Competency Mapping</span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">Skill & Experience Gap Analysis</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target: <strong className="text-slate-800">{analysis?.jobDescription?.title || 'N/A'}</strong>
            {analysis?.jobDescription?.companyName && <> at <strong className="text-slate-800">{analysis.jobDescription.companyName}</strong></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={() => generate(false)} disabled={generating || total > 0} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{generating ? 'Generating…' : 'Generate recommendations'}</span>
          </button>
          {total > 0 && (
            <button onClick={() => generate(true)} disabled={generating} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /><span>Regenerate</span>
            </button>
          )}
          <button onClick={() => navigate(`/resume-enhancement?analysis=${analysis.id}`)} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 cursor-pointer">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /><span>Enhance Resume</span>
          </button>
          <button onClick={() => navigate(`/mock-interview?analysis=${analysis.id}`)} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 cursor-pointer">
            <Bot className="w-3.5 h-3.5 text-blue-600" /><span>Practice Interview</span>
          </button>
        </div>
      </div>

      {genError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3" role="alert">{genError}</p>}
      {total === 0 && <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-card text-xs text-slate-600">No recommendations yet for this analysis. Use “Generate recommendations” to create them.</div>}

      {gap?.summary && total > 0 && (
        <p className="text-xs text-slate-500">
          {gap.summary.counts.total} items • High {gap.summary.byPriority.HIGH} / Medium {gap.summary.byPriority.MEDIUM} / Low {gap.summary.byPriority.LOW} • {gap.summary.completedCount} completed
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {tabBtn('all', `All Items (${total})`, 'bg-blue-600')}
        {tabBtn('improve', <><AlertTriangle className="w-3.5 h-3.5" />Things to Improve ({improve.length})</>, 'bg-amber-600')}
        {tabBtn('learn', <><BookOpen className="w-3.5 h-3.5" />Things to Learn / Add ({learn.length})</>, 'bg-blue-600')}
      </div>

      {(activeTab === 'all' || activeTab === 'improve') && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">Things to Improve</h3>
            <p className="text-xs text-slate-500">You have some evidence for these; the advice is about presenting it better, truthfully.</p>
          </div>
          {improve.length === 0 && <p className="text-xs text-slate-500">None.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{improve.map(renderItem)}</div>
        </section>
      )}
      {(activeTab === 'all' || activeTab === 'learn') && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">Things to Learn / Add</h3>
            <p className="text-xs text-slate-500">No evidence was found for these. Learn them first; do not add them to your resume until you have real experience.</p>
          </div>
          {learn.length === 0 && <p className="text-xs text-slate-500">None.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{learn.map(renderItem)}</div>
        </section>
      )}
    </div>
  );
}
