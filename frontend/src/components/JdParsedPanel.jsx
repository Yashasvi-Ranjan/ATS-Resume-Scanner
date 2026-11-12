import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, X, Save } from 'lucide-react';
import { api } from '../services/api';
import { describeApiError } from '../utils/errors';
import { useApp } from '../context/AppContext';
import SkillBadge from './SkillBadge';

const inputCls =
  'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none';

const COMPLETENESS = {
  complete: 'Complete description',
  partial: 'Partially specified',
  vague: 'Vague description'
};

/** Shows parse status / extracted requirements of the saved JD and lets the user correct them. */
export default function JdParsedPanel({ jd }) {
  const { setActiveJd, showToast } = useApp();
  const [parsed, setParsed] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [inputs, setInputs] = useState({ requiredSkills: '', preferredSkills: '' });
  const busyRef = useRef(false);
  const jdId = jd?.id;
  const status = jd?.parseStatus || 'NOT_PARSED';

  const patchJd = useCallback(
    (patch) => setActiveJd((prev) => (prev && prev.id === jdId ? { ...prev, ...patch } : prev)),
    [jdId, setActiveJd]
  );

  const loadParsed = useCallback(async () => {
    try {
      const res = await api.jobDescriptions.getParsed(jdId);
      const d = res?.data;
      setParsed(d?.effective ?? null);
      patchJd({ parseStatus: d?.parseStatus, parseError: d?.parseError || null });
    } catch (err) {
      setError(describeApiError(err));
    }
  }, [jdId, patchJd]);

  const runParse = async (force = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    patchJd({ parseStatus: 'PROCESSING' });
    try {
      const res = await api.jobDescriptions.parse(jdId, force ? { force: true } : {});
      const d = res?.data;
      setParsed(d?.effective ?? null);
      patchJd({ parseStatus: d?.parseStatus || 'PARSED', parseError: d?.parseError || null });
    } catch (err) {
      setError(describeApiError(err, 'Job description parsing failed.'));
      try {
        const res = await api.jobDescriptions.getParsed(jdId);
        patchJd({ parseStatus: res?.data?.parseStatus || 'FAILED', parseError: res?.data?.parseError || null });
      } catch {
        patchJd({ parseStatus: 'FAILED' });
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    setParsed(null);
    setEditing(false);
    setError(null);
  }, [jdId]);

  useEffect(() => {
    if (jdId && status === 'PARSED' && !parsed) loadParsed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jdId, status]);

  if (!jd) return null;

  const save = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await api.jobDescriptions.updateParsed(jdId, draft);
      setParsed(res?.data?.effective ?? draft);
      setEditing(false);
      showToast('Job description corrections saved.', 'success');
    } catch (err) {
      setError(describeApiError(err, 'Could not save corrections.'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const addSkill = (key) => {
    const name = inputs[key].trim();
    if (!name) return;
    setDraft((d) =>
      d[key].some((s) => s.name.toLowerCase() === name.toLowerCase())
        ? d
        : { ...d, [key]: [...d[key], { name, canonical: '', evidence: '' }] }
    );
    setInputs((p) => ({ ...p, [key]: '' }));
  };
  const removeSkill = (key, i) => setDraft((d) => ({ ...d, [key]: d[key].filter((_, idx) => idx !== i) }));

  const data = editing ? draft : parsed;

  const skillBlock = (key, label, variant) => (
    <div>
      <label className="text-[11px] font-semibold text-slate-600">{label} ({data[key]?.length || 0})</label>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {(data[key] || []).length === 0 && <span className="text-slate-400">None extracted</span>}
        {(data[key] || []).map((s, i) => (
          <span key={`${s.name}-${i}`} className="inline-flex items-center gap-1">
            <SkillBadge label={s.name} variant={variant} />
            {editing && (
              <button type="button" aria-label={`Remove ${s.name}`} onClick={() => removeSkill(key, i)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {editing && (
        <div className="flex gap-2 mt-2">
          <input
            className={inputCls}
            placeholder={`Add ${label.toLowerCase()}`}
            value={inputs[key]}
            onChange={(e) => setInputs((p) => ({ ...p, [key]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(key); } }}
          />
          <button type="button" onClick={() => addSkill(key)} className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center gap-1 cursor-pointer">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-4 space-y-3" aria-live="polite">
      {(status === 'PROCESSING' || busy) && (
        <p className="text-xs text-slate-600 flex items-center gap-2" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> Parsing job description…
        </p>
      )}

      {(status === 'FAILED' || status === 'NOT_PARSED') && !busy && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2" role={status === 'FAILED' ? 'alert' : undefined}>
          <p>
            {status === 'FAILED'
              ? error || jd.parseError || 'Job description parsing failed.'
              : error || 'This job description has not been parsed yet.'}
          </p>
          <button type="button" disabled={busy} onClick={() => runParse(status === 'FAILED')} className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 font-semibold disabled:opacity-50 cursor-pointer">
            {status === 'FAILED' ? 'Retry parsing' : 'Parse job description'}
          </button>
        </div>
      )}

      {error && status === 'PARSED' && <p className="text-xs text-rose-700" role="alert">{error}</p>}

      {data && status === 'PARSED' && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900">Extracted requirements</h4>
              <span className="px-2 py-0.5 rounded border text-[10px] font-semibold bg-white text-slate-600 border-slate-200">
                {COMPLETENESS[data.completeness] || data.completeness}
              </span>
            </div>
            {!editing ? (
              <button type="button" onClick={() => { setDraft(JSON.parse(JSON.stringify(parsed))); setEditing(true); }} className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 font-semibold cursor-pointer">
                Correct details
              </button>
            ) : (
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={save} className="px-2.5 py-1 rounded-md bg-blue-600 text-white font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer">
                  <Save className="w-3 h-3" /> {busy ? 'Saving…' : 'Save corrections'}
                </button>
                <button type="button" disabled={busy} onClick={() => setEditing(false)} className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 cursor-pointer">
                  Cancel
                </button>
              </div>
            )}
          </div>

          {skillBlock('requiredSkills', 'Required skills', 'danger')}
          {skillBlock('preferredSkills', 'Preferred skills', 'low')}

          {(data.experienceRequirements || []).length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Experience</label>
              <ul className="list-disc pl-4 text-slate-700">
                {data.experienceRequirements.map((e, i) => (
                  <li key={i}>
                    {[e.minYears != null && `${e.minYears}+ years`, e.area, e.required ? '(required)' : '(preferred)'].filter(Boolean).join(' ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(data.educationRequirements || []).length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Education</label>
              <ul className="list-disc pl-4 text-slate-700">
                {data.educationRequirements.map((e, i) => (
                  <li key={i}>{[e.level, e.field, e.required ? '(required)' : '(preferred)'].filter(Boolean).join(' ')}</li>
                ))}
              </ul>
            </div>
          )}
          {[...(data.ambiguityNotes || []), ...(data.parseWarnings || [])].length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-amber-700">Ambiguity / completeness notes</label>
              <ul className="list-disc pl-4 text-amber-800">
                {[...(data.ambiguityNotes || []), ...(data.parseWarnings || [])].map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
