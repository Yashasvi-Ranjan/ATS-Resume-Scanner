import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, ShieldCheck, Download, ArrowRight, Bot, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { describeApiError } from '../utils/errors';

const fmtDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};
const SOURCE_LABEL = { AI: 'AI-generated', USER_EDIT: 'Your edit', USER: 'Manual draft' };
const isApproved = (v) => v?.status === 'COMPLETED' && !!v?.approvedAt;

export default function ResumeEnhancementPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { analysisResult, currentUser, showToast } = useApp();
  const userId = currentUser?.id;
  const enhId = params.get('id');
  const analysisParam = params.get('analysis');
  const analysisId = analysisParam || analysisResult?.id || null;

  const [state, setState] = useState({ status: 'loading', error: null });
  const [target, setTarget] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [compare, setCompare] = useState(null);
  const [compareError, setCompareError] = useState(null);
  const [text, setText] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(null); // 'generate' | 'save' | 'approve' | 'download'
  const [actionError, setActionError] = useState(null);
  const busyRef = useRef(false);
  const pendingSelect = useRef(null);

  const selected = versions.find((v) => v.id === selectedId) || null;

  // Resolve (resume, JD) target and load versions.
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', error: null });
    (async () => {
      try {
        let t = null;
        let knownEnhId = null;
        if (enhId) {
          const r = await api.enhancements.get(enhId);
          const e = r?.data;
          t = { resumeId: e.resumeId, jobDescriptionId: e.jobDescriptionId, analysisId: analysisId || null, title: e.jobDescription?.title || '', company: e.jobDescription?.companyName || '', resumeName: e.resume?.originalFilename || '' };
          knownEnhId = e.id;
        } else {
          let id = analysisId;
          if (!id) {
            const list = await api.analyses.list({ limit: 1, status: 'COMPLETED' });
            id = list?.data?.[0]?.id || null;
          }
          if (!id) { if (!cancelled) setState({ status: 'no-analysis', error: null }); return; }
          const res = await api.analyses.get(id);
          const a = res?.data;
          t = { resumeId: a.resumeId, jobDescriptionId: a.jobDescriptionId, analysisId: a.status === 'COMPLETED' ? a.id : null, title: a.jobDescription?.title || '', company: a.jobDescription?.companyName || '', resumeName: a.resume?.originalFilename || '' };
        }
        let anyId = knownEnhId;
        if (!anyId) {
          const enh = await api.enhancements.list({ limit: 100 });
          anyId = (enh?.data || []).find((e) => e.resumeId === t.resumeId && e.jobDescriptionId === t.jobDescriptionId)?.id || null;
        }
        let vs = [];
        if (anyId) {
          const vr = await api.enhancements.getVersions(anyId);
          vs = vr?.data?.versions || [];
        }
        if (cancelled) return;
        setTarget(t);
        setVersions(vs);
        const wanted = pendingSelect.current || knownEnhId;
        pendingSelect.current = null;
        const pick = (wanted && vs.find((v) => v.id === wanted)) || [...vs].reverse().find((v) => v.generationStatus === 'COMPLETED') || vs[vs.length - 1];
        setSelectedId(pick?.id || null);
        setState({ status: 'ready', error: null });
      } catch (err) {
        if (!cancelled) setState({ status: 'error', error: describeApiError(err, 'Failed to load enhancements.') });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, analysisId, enhId, reloadKey]);

  // Load side-by-side comparison for the selected version.
  useEffect(() => {
    setCompare(null);
    setCompareError(null);
    if (!selected) { setText(''); return undefined; }
    setText(selected.enhancedContent || '');
    if (selected.generationStatus !== 'COMPLETED') return undefined;
    let cancelled = false;
    api.enhancements.compare(selected.id).then((res) => { if (!cancelled) setCompare(res?.data); })
      .catch((err) => { if (!cancelled) setCompareError(describeApiError(err)); });
    return () => { cancelled = true; };
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback(async (kind, fn) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    setActionError(null);
    try { await fn(); } catch (err) { setActionError(describeApiError(err)); }
    finally { busyRef.current = false; setBusy(null); }
  }, []);

  const handleGenerate = (force) => run('generate', async () => {
    const res = await api.enhancements.generate({
      resumeId: target.resumeId,
      jobDescriptionId: target.jobDescriptionId,
      ...(target.analysisId ? { analysisId: target.analysisId } : {}),
      force: !!force
    });
    const e = res?.data;
    pendingSelect.current = e?.id || null;
    showToast(e?.reused ? 'Existing enhancement for identical inputs reused.' : 'Enhancement generated.', 'success');
    setReloadKey((k) => k + 1);
  });

  const handleSave = () => run('save', async () => {
    const res = await api.enhancements.update(selected.id, { enhancedContent: text });
    pendingSelect.current = res?.data?.id || null;
    showToast('Saved as a new version.', 'success');
    setReloadKey((k) => k + 1);
  });

  const handleApprove = () => run('approve', async () => {
    await api.enhancements.approve(selected.id);
    pendingSelect.current = selected.id;
    showToast('Version approved.', 'success');
    setReloadKey((k) => k + 1);
  });

  const handleDownload = (format) => run('download', () =>
    api.enhancements.download(selected.id, format, `enhanced-resume-v${selected.version}.${format}`));

  const box = (children) => (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center space-y-3">{children}</div>
  );
  if (state.status === 'loading') return box(<p className="text-sm text-slate-600" role="status">Loading saved versions…</p>);
  if (state.status === 'error') return box(<><p className="text-sm text-rose-700" role="alert">{state.error}</p><button onClick={() => setReloadKey((k) => k + 1)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer">Retry</button></>);
  if (state.status === 'no-analysis') return box(<><p className="text-sm text-slate-600">Run an analysis first.</p><button onClick={() => navigate('/analysis')} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><span>Go to Analysis</span><ArrowRight className="w-3.5 h-3.5" /></button></>);

  const approved = isApproved(selected);
  const canEdit = selected && selected.generationStatus === 'COMPLETED';
  const edited = canEdit && text.trim() && text.trim() !== (selected.enhancedContent || '').trim();
  const report = compare?.groundingReport;
  const generating = busy === 'generate';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5"><Sparkles className="w-3.5 h-3.5" /><span>Resume Enhancement</span></div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">Resume Enhancement & Phrasing Optimization</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target Role: <strong className="text-slate-800">{target.title || 'N/A'}</strong>
            {target.company && <> at <strong className="text-slate-800">{target.company}</strong></>}
            {target.resumeName && <> • Resume: <strong className="text-slate-800">{target.resumeName}</strong></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={() => handleGenerate(versions.some((v) => v.source === 'AI'))} disabled={!!busy} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{generating ? 'Generating (may take a minute)…' : versions.some((v) => v.source === 'AI') ? 'Regenerate AI enhancement' : 'Generate AI enhancement'}</span>
          </button>
          <button onClick={() => navigate('/mock-interview')} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 cursor-pointer"><Bot className="w-3.5 h-3.5 text-blue-600" /><span>Practice Interview</span></button>
        </div>
      </div>

      <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <span className="font-bold text-slate-900">AI-suggested content — review before use</span>
          <p className="text-slate-600 leading-relaxed">Suggestions only reword what is already in your resume and are checked against it. They are not treated as verified by you until you approve a version.</p>
        </div>
      </div>

      {actionError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3" role="alert">{actionError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-xs font-bold text-slate-700">Versions</h3>
          {versions.length === 0 && <p className="text-xs text-slate-500">No versions yet. Generate an AI enhancement to start.</p>}
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-1">
            {[...versions].reverse().map((v) => (
              <button key={v.id} onClick={() => setSelectedId(v.id)} className={`px-3.5 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${selectedId === v.id ? 'bg-blue-600 text-white shadow-subtle' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
                <span className="block whitespace-nowrap">v{v.version} · {SOURCE_LABEL[v.source] || v.source}</span>
                <span className="block font-normal opacity-80 whitespace-nowrap">
                  {v.generationStatus === 'FAILED' ? 'Failed' : v.generationStatus === 'PROCESSING' ? 'Generating…' : isApproved(v) ? 'Approved' : 'Draft (not approved)'} · {fmtDate(v.createdAt)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!selected && <p className="text-xs text-slate-500">Select or generate a version.</p>}
          {selected?.generationStatus === 'FAILED' && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3" role="alert">
              This generation failed: {selected.errorMessage || 'unknown error'}. Use “Generate AI enhancement” to retry.
            </p>
          )}
          {selected?.generationStatus === 'PROCESSING' && <p className="text-xs text-slate-600">This version is still being generated.</p>}

          {canEdit && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded border font-semibold ${approved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {approved ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Approved by you</span> : 'Draft — not approved'}
                </span>
                <span className="text-slate-500">{SOURCE_LABEL[selected.source] || selected.source}</span>
              </div>

              {compareError && <p className="text-xs text-rose-700" role="alert">{compareError}</p>}
              {!compare && !compareError && <p className="text-xs text-slate-500" role="status">Loading comparison…</p>}

              {compare && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-card">
                    <h4 className="text-xs font-bold text-slate-900 mb-2">Original resume</h4>
                    <pre className="whitespace-pre-wrap text-[11px] text-slate-700 font-mono max-h-80 overflow-auto">{compare.original?.text || 'No original text available.'}</pre>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-card">
                    <h4 className="text-xs font-bold text-slate-900 mb-2">This version {approved ? '' : '(suggested, unverified)'}</h4>
                    <pre className="whitespace-pre-wrap text-[11px] text-slate-700 font-mono max-h-80 overflow-auto">{compare.enhanced?.text}</pre>
                  </div>
                </div>
              )}

              {report && (
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-card space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Grounding report</h4>
                  <p className="text-slate-600">
                    {report.skipped ? 'No original data was available to verify against.' : `${report.checkedItems} items checked • ${report.acceptedItems} accepted • ${report.revertedItems} reverted • ${report.needsReviewItems} need your review`}
                    {report.advisory ? ' (advisory only for your own edits)' : ''}
                  </p>
                  {(report.warnings || []).map((w, i) => <p key={i} className="text-amber-700">{w}</p>)}
                  {(report.flagged || []).length > 0 && (
                    <ul className="space-y-2">
                      {report.flagged.map((f, i) => (
                        <li key={i} className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                          <p className="font-semibold text-amber-900 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{f.issue.replace(/_/g, ' ')} — {f.action === 'reverted' ? 'reverted to your original wording' : 'needs review'}</p>
                          {f.detail && <p className="text-amber-800">{f.detail}</p>}
                          <p className="text-slate-600">Original: {f.originalText || '—'}</p>
                          <p className="text-slate-600">Proposed: {f.proposedText}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {compare?.changes?.length > 0 && (
                <details className="bg-white rounded-xl p-4 border border-slate-200 shadow-card text-xs">
                  <summary className="font-bold text-slate-900 cursor-pointer">Changes made ({compare.changes.length})</summary>
                  <ul className="mt-2 space-y-2">
                    {compare.changes.map((c, i) => (
                      <li key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-[10px] uppercase font-semibold text-slate-500">{c.changeType} · {c.path}</p>
                        <p className="text-slate-500 line-through">{c.originalText}</p>
                        <p className="text-slate-800">{c.enhancedText}</p>
                        {c.justification && <p className="text-slate-500 italic">{c.justification}</p>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {compare?.metricSuggestions?.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-1">
                  <h4 className="font-bold text-slate-900">Notes: where you could add real numbers</h4>
                  <p className="text-slate-500">These are prompts only. Add a metric yourself only if it is true.</p>
                  <ul className="list-disc pl-4 text-slate-700">{compare.metricSuggestions.map((m, i) => <li key={i}>{m.suggestion}</li>)}</ul>
                </div>
              )}

              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">Edit version {selected.version}</h3>
                  <p className="text-xs text-slate-500">Saving creates a new version (marked as your edit); earlier versions are kept.</p>
                </div>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} className="w-full p-3 rounded-lg border border-slate-300 text-xs text-slate-900 leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button onClick={() => handleDownload('txt')} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"><Download className="w-3.5 h-3.5" />TXT</button>
                  <button onClick={() => handleDownload('docx')} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"><Download className="w-3.5 h-3.5" />DOCX</button>
                  <button onClick={handleSave} disabled={!edited || !!busy} className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer">{busy === 'save' ? 'Saving…' : 'Save as new version'}</button>
                  <button onClick={handleApprove} disabled={approved || !!edited || !!busy} title={edited ? 'Save your edits first' : undefined} className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer">{busy === 'approve' ? 'Approving…' : approved ? 'Approved' : 'Approve this version'}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={() => navigate('/gap-analysis')} className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer">← Back to Gap Analysis</button>
        <button onClick={() => navigate('/mock-interview')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"><span>Proceed to Mock Interview</span><ArrowRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
