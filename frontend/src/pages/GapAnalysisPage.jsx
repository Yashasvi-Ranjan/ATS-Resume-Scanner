import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Sparkles,
  Bot,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { DEMO_MODE } from '../config/demoMode';

const STATUS_LABELS = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed'
};
const IMPORTANCE_LABELS = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

function mapRecommendation(rec) {
  return {
    id: rec.id,
    skill: rec.title,
    status: STATUS_LABELS[rec.status] || rec.status,
    rawStatus: rec.status,
    importance: IMPORTANCE_LABELS[rec.priority] || rec.priority,
    reason: rec.reason || rec.description,
    recommendation: rec.description
  };
}

export default function GapAnalysisPage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { analysisResult, gapAnalysis, setGapAnalysis, showToast, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'strong', 'improve', 'learn'

  const userId = currentUser?.id;
  const analysisId = routeId || analysisResult?.id || null;
  const useDemoData = DEMO_MODE && !!gapAnalysis && !gapAnalysis.analysisId && !analysisId;

  const [view, setView] = useState(null);
  const [isLoading, setIsLoading] = useState(!useDemoData);
  const [noAnalysis, setNoAnalysis] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [savingIds, setSavingIds] = useState({});
  const savingRef = useRef(new Set());
  const loadKeyRef = useRef(0);

  useEffect(() => {
    const key = ++loadKeyRef.current;
    savingRef.current = new Set();
    setSavingIds({});
    setView(null);
    setError(null);
    setNoAnalysis(false);
    if (useDemoData) {
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    let cancelled = false;

    (async () => {
      try {
        let id = analysisId;
        if (!id) {
          const listRes = await api.analyses.list({ limit: 1 });
          if (cancelled) return;
          id = listRes?.data?.[0]?.id || null;
          if (!id) {
            setNoAnalysis(true);
            setIsLoading(false);
            return;
          }
        }
        const [analysisRes, recsRes] = await Promise.all([
          api.analyses.get(id),
          api.analyses.getRecommendations(id)
        ]);
        if (cancelled) return;
        const a = analysisRes?.data || {};
        const recs = Array.isArray(recsRes?.data) ? recsRes.data : [];
        setView({
          analysisId: id,
          analysisStatus: a.status || null,
          jobTitle: a.jobDescription?.title ?? null,
          company: a.jobDescription?.companyName ?? null,
          overallScore: a.overallScore ?? null,
          strongMatches: [],
          improve: recs.filter((r) => r.category === 'IMPROVE').map(mapRecommendation),
          learnAndAdd: recs.filter((r) => r.category === 'LEARN_ADD').map(mapRecommendation)
        });
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load gap analysis:', err);
        setError(err?.message || 'Failed to load gap analysis.');
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysisId, userId, attempt, useDemoData]);

  // Mirror the loaded (real) data into context so Dashboard counts stay consistent.
  useEffect(() => {
    if (!view) return;
    const { analysisStatus, ...shared } = view;
    setGapAnalysis(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleStatusChange = useCallback(async (item, newStatus) => {
    if (!item.id || newStatus === item.rawStatus || savingRef.current.has(item.id)) return;
    const key = loadKeyRef.current;
    savingRef.current.add(item.id);
    setSavingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await api.recommendations.updateStatus(item.id, newStatus);
      if (key !== loadKeyRef.current) return;
      const updated = res?.data?.status || newStatus;
      const patch = (list) =>
        list.map((it) =>
          it.id === item.id ? { ...it, rawStatus: updated, status: STATUS_LABELS[updated] || updated } : it
        );
      setView((prev) =>
        prev ? { ...prev, improve: patch(prev.improve), learnAndAdd: patch(prev.learnAndAdd) } : prev
      );
      showToast('Recommendation status updated.', 'success');
    } catch (err) {
      if (key !== loadKeyRef.current) return;
      showToast(`Failed to update status: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      if (key === loadKeyRef.current) {
        savingRef.current.delete(item.id);
        setSavingIds((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }
    }
  }, [showToast]);

  const renderStatusSelect = (item) => {
    if (!item.rawStatus || useDemoData) return null;
    return (
      <select
        value={item.rawStatus}
        disabled={!!savingIds[item.id]}
        onChange={(e) => handleStatusChange(item, e.target.value)}
        aria-label={`Status for ${item.skill}`}
        className="ml-2 px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px] text-slate-700 disabled:opacity-60 cursor-pointer"
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    );
  };

  const getImportanceBadge = (importance) => {
    switch (importance?.toLowerCase()) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Medium Priority</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Preferred</span>;
    }
  };

  const data = useDemoData ? gapAnalysis : view;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center">
          <p className="text-sm text-slate-600">Loading gap analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (noAnalysis || !data) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center space-y-3">
          <p className="text-sm text-slate-600">No analysis yet. Run an analysis to see your gap analysis.</p>
          <button
            onClick={() => navigate('/analysis')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Go to Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const strongMatchesItems = data.strongMatches || [];
  const improveItems = data.improve || [];
  const learnAndAddItems = data.learnAndAdd || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Job-Specific Competency Mapping</span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">
            Skill & Experience Gap Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target: <strong className="text-slate-800">{data.jobTitle || 'N/A'}</strong> at <strong className="text-slate-800">{data.company || 'N/A'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/resume-enhancement')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enhance Resume Gaps</span>
          </button>
          <button
            onClick={() => navigate('/mock-interview')}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-blue-600" />
            <span>Practice Interview</span>
          </button>
        </div>
      </div>

      {!useDemoData && data.improve.length === 0 && data.learnAndAdd.length === 0 && (
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-card space-y-1">
          <p className="text-xs text-slate-600">
            No recommendations have been recorded for this analysis yet. Gap recommendations are not generated automatically.
          </p>
          {data.analysisStatus === 'PENDING' && (
            <p className="text-xs text-slate-500">This analysis is still pending, so scoring is not available yet.</p>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-subtle'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Items ({strongMatchesItems.length + improveItems.length + learnAndAddItems.length})
        </button>
        <button
          onClick={() => setActiveTab('strong')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'strong'
              ? 'bg-emerald-600 text-white shadow-subtle'
              : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Strong Matches ({strongMatchesItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('improve')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'improve'
              ? 'bg-amber-600 text-white shadow-subtle'
              : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Needs Improvement ({improveItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('learn')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'learn'
              ? 'bg-blue-600 text-white shadow-subtle'
              : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
          <span>Missing / Learn & Add ({learnAndAddItems.length})</span>
        </button>
      </div>

      {/* Sections Grid */}
      <div className="space-y-6">
        {/* Section 1: Strong Matches */}
        {(activeTab === 'all' || activeTab === 'strong') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  1. Strong Matches & Proven Competencies
                </h3>
                <p className="text-xs text-slate-500">
                  Skills present in your resume that satisfy job description requirements
                </p>
              </div>
            </div>

            {strongMatchesItems.length === 0 && (
              <p className="text-xs text-slate-500">{useDemoData ? 'Not evaluated' : 'None recorded'}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {strongMatchesItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-card flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-slate-900 font-display">
                        {item.skill}
                      </h4>
                      {getImportanceBadge(item.importance)}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mb-1.5">
                      <Check className="w-3 h-3 text-emerald-600" /> {item.status}
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100">
                    <p className="text-xs text-slate-700 font-medium">
                      Action: <span className="text-slate-600 font-normal">{item.recommendation}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Needs Improvement */}
        {(activeTab === 'all' || activeTab === 'improve') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  2. Existing Skills That Need Stronger Representation
                </h3>
                <p className="text-xs text-slate-500">
                  Capabilities in your background described with low impact or missing metrics
                </p>
              </div>
            </div>

            {improveItems.length === 0 && (
              <p className="text-xs text-slate-500">{useDemoData ? 'Not evaluated' : 'None recorded'}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {improveItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-card flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-slate-900 font-display">
                        {item.skill}
                      </h4>
                      {getImportanceBadge(item.importance)}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mb-1.5">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> {item.status}
                    </span>
                    {renderStatusSelect(item)}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100">
                    <p className="text-xs text-slate-700 font-medium">
                      Recommendation: <span className="text-slate-600 font-normal">{item.recommendation}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Learn / Add */}
        {(activeTab === 'all' || activeTab === 'learn') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  3. Skills to Learn / Add (Missing from Resume)
                </h3>
                <p className="text-xs text-slate-500">
                  Technologies required in the target role but absent from your resume
                </p>
              </div>
            </div>

            {learnAndAddItems.length === 0 && (
              <p className="text-xs text-slate-500">{useDemoData ? 'Not evaluated' : 'None recorded'}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learnAndAddItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-card flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-slate-900 font-display">
                        {item.skill}
                      </h4>
                      {getImportanceBadge(item.importance)}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 mb-1.5">
                      • {item.status}
                    </span>
                    {renderStatusSelect(item)}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100">
                    <p className="text-xs text-slate-700 font-medium">
                      Learning Plan: <span className="text-slate-600 font-normal">{item.recommendation}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Next Step Callout */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Ready to enhance your resume to address these gaps?
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            The Resume Enhancement tool rewrites existing experience bullets to highlight missing metrics truthfully.
          </p>
        </div>
        <button
          onClick={() => navigate('/resume-enhancement')}
          className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <span>Open Resume Enhancement</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
