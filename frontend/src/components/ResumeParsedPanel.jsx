import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, X, RefreshCw, Save } from 'lucide-react';
import { api } from '../services/api';
import { describeApiError } from '../utils/errors';
import { useApp } from '../context/AppContext';
import SkillBadge from './SkillBadge';

const inputCls =
  'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none';

/**
 * Shows extraction/parse status of the active resume, lets the user trigger parsing,
 * view parsed info and correct it (PATCH /resumes/:id/parsed). Nothing is fabricated:
 * everything shown comes from the backend.
 */
export default function ResumeParsedPanel({ resume }) {
  const { patchResumeFile, showToast } = useApp();
  const [parsed, setParsed] = useState(null); // effective data
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const busyRef = useRef(false);
  const autoTriedRef = useRef(null);

  const resumeId = resume?.id;
  const status = resume?.parseStatus || 'NOT_PARSED';

  const loadParsed = useCallback(async () => {
    try {
      const res = await api.resumes.getParsed(resumeId);
      const d = res?.data;
      setParsed(d?.effective ?? d?.userEditedData ?? d?.parsedData ?? null);
      patchResumeFile(resumeId, { parseStatus: d?.parseStatus, parseError: d?.parseError || null });
    } catch (err) {
      setError(describeApiError(err));
    }
  }, [resumeId, patchResumeFile]);

  const runParse = useCallback(
    async (opts = {}) => {
      if (busyRef.current || !resumeId) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      patchResumeFile(resumeId, { parseStatus: 'PROCESSING', parseError: null });
      try {
        const res = await api.resumes.parse(resumeId, opts);
        const r = res?.data || {};
        patchResumeFile(resumeId, {
          parseStatus: r.parseStatus || 'PARSED',
          parseError: r.parseError || null,
          hasParsedData: Boolean(r.hasParsedData ?? true),
          extractedTextLength: r.extractedTextLength
        });
        setParsed(r.userEditedData ?? r.parsedData ?? null);
      } catch (err) {
        setError(describeApiError(err, 'Resume parsing failed.'));
        try {
          const fresh = await api.resumes.get(resumeId);
          const r = fresh?.data || {};
          patchResumeFile(resumeId, {
            parseStatus: r.parseStatus || 'FAILED',
            parseError: r.parseError || null,
            extractedTextLength: r.extractedTextLength
          });
        } catch {
          patchResumeFile(resumeId, { parseStatus: 'FAILED' });
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [resumeId, patchResumeFile]
  );

  // reset when the resume changes
  useEffect(() => {
    setParsed(null);
    setDraft(null);
    setEditing(false);
    setError(null);
  }, [resumeId]);

  // Load parsed data when available; auto-trigger a parse once for freshly extracted resumes.
  useEffect(() => {
    if (!resumeId) return;
    if (status === 'PARSED' && !parsed) loadParsed();
    if (
      status === 'NOT_PARSED' &&
      resume.extractedTextLength > 0 &&
      autoTriedRef.current !== resumeId
    ) {
      autoTriedRef.current = resumeId;
      runParse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, status]);

  if (!resume) return null;

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(parsed)));
    setEditing(true);
  };

  const save = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await api.resumes.updateParsed(resumeId, draft);
      const r = res?.data || {};
      setParsed(r.userEditedData ?? r.parsedData ?? draft);
      setEditing(false);
      showToast('Parsed resume corrections saved.', 'success');
    } catch (err) {
      setError(describeApiError(err, 'Could not save corrections.'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const setField = (path, value) =>
    setDraft((d) => {
      const next = { ...d };
      let cur = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        cur[path[i]] = Array.isArray(cur[path[i]]) ? [...cur[path[i]]] : { ...cur[path[i]] };
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });

  const removeItem = (key, idx) => setDraft((d) => ({ ...d, [key]: d[key].filter((_, i) => i !== idx) }));

  const addSkill = () => {
    const name = skillInput.trim();
    if (!name) return;
    if (draft.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setSkillInput('');
      return;
    }
    setDraft((d) => ({
      ...d,
      skills: [...d.skills, { name, canonical: '', evidence: [], confidence: 'explicit', source: 'user' }]
    }));
    setSkillInput('');
  };

  const data = editing ? draft : parsed;

  return (
    <div className="mt-4 space-y-3" aria-live="polite">
      {status === 'PROCESSING' || busy ? (
        <p className="text-xs text-slate-600 flex items-center gap-2" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          {busy && status !== 'PROCESSING' ? 'Working…' : 'Parsing resume (this can take a few seconds)…'}
        </p>
      ) : null}

      {resume.extractedTextLength === 0 && (
        <p className="text-xs text-rose-700" role="alert">
          No text could be extracted from this file.{' '}
          {resume.parseError ||
            'Image-only (scanned) PDFs are not supported because OCR is not available. Upload a text-based PDF or DOCX.'}
        </p>
      )}

      {typeof resume.extractedTextLength === 'number' && resume.extractedTextLength > 0 && (
        <p className="text-[11px] text-slate-500">
          Text extracted ({resume.extractedTextLength.toLocaleString()} characters). Parse status:{' '}
          <strong className="text-slate-700">{status.replace('_', ' ').toLowerCase()}</strong>
        </p>
      )}

      {status === 'FAILED' && resume.extractedTextLength !== 0 && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-2" role="alert">
          <p>{error || resume.parseError || 'Resume parsing failed.'}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => runParse({ force: true })}
            className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 font-semibold disabled:opacity-50 cursor-pointer"
          >
            Retry parsing
          </button>
        </div>
      )}

      {status === 'NOT_PARSED' && resume.extractedTextLength !== 0 && !busy && (
        <button
          type="button"
          disabled={busy}
          onClick={() => runParse()}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
        >
          Parse resume
        </button>
      )}

      {error && status !== 'FAILED' && (
        <p className="text-xs text-rose-700" role="alert">{error}</p>
      )}

      {data && status === 'PARSED' && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-slate-900">Parsed resume</h4>
            <div className="flex items-center gap-2">
              {!editing ? (
                <>
                  <button type="button" onClick={startEdit} className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 font-semibold cursor-pointer">
                    Correct details
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm('Re-parse and discard your corrections?')) runParse({ force: true, resetEdits: true });
                    }}
                    title="Re-parse and discard corrections"
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" disabled={busy} onClick={save} className="px-2.5 py-1 rounded-md bg-blue-600 text-white font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer">
                    <Save className="w-3 h-3" /> {busy ? 'Saving…' : 'Save corrections'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setEditing(false)} className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 cursor-pointer">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {(data.parseWarnings || []).length > 0 && (
            <ul className="text-[11px] text-amber-700 list-disc pl-4">
              {data.parseWarnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}

          {/* Contact / summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {['name', 'email', 'phone'].map((k) => (
              <div key={k}>
                <label className="text-[11px] font-semibold text-slate-600 capitalize">{k}</label>
                {editing ? (
                  <input className={inputCls} value={data.contact?.[k] || ''} onChange={(e) => setField(['contact', k], e.target.value)} />
                ) : (
                  <p className="text-slate-800">{data.contact?.[k] || <span className="text-slate-400">Not found</span>}</p>
                )}
              </div>
            ))}
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600">Summary</label>
            {editing ? (
              <textarea rows={3} className={inputCls} value={data.summary || ''} onChange={(e) => setField(['summary'], e.target.value)} />
            ) : (
              <p className="text-slate-700">{data.summary || <span className="text-slate-400">Not found</span>}</p>
            )}
          </div>

          {/* Skills */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600">Skills ({data.skills?.length || 0})</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(data.skills || []).length === 0 && <span className="text-slate-400">None found</span>}
              {(data.skills || []).map((sk, i) => (
                <span key={`${sk.name}-${i}`} className="inline-flex items-center gap-1">
                  <SkillBadge label={sk.name} variant={sk.source === 'user' ? 'success' : 'default'} />
                  {editing && (
                    <button type="button" aria-label={`Remove ${sk.name}`} onClick={() => removeItem('skills', i)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
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
                  value={skillInput}
                  placeholder="Add a skill"
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                />
                <button type="button" onClick={addSkill} className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            )}
          </div>

          {/* Experience */}
          <Section title={`Experience (${data.experience?.length || 0})`}>
            {(data.experience || []).map((e, i) => (
              <ItemRow key={i} editing={editing} onRemove={() => removeItem('experience', i)}>
                {editing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                    <input className={inputCls} placeholder="Title" value={e.title || ''} onChange={(ev) => setField(['experience', i, 'title'], ev.target.value)} />
                    <input className={inputCls} placeholder="Company" value={e.company || ''} onChange={(ev) => setField(['experience', i, 'company'], ev.target.value)} />
                    <input className={inputCls} placeholder="Start" value={e.startDate || ''} onChange={(ev) => setField(['experience', i, 'startDate'], ev.target.value)} />
                    <input className={inputCls} placeholder="End" value={e.endDate || ''} onChange={(ev) => setField(['experience', i, 'endDate'], ev.target.value)} />
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-900">{e.title || 'Role'} — {e.company}</p>
                    <p className="text-slate-500">{[e.startDate, e.isCurrent ? 'Present' : e.endDate].filter(Boolean).join(' – ')}</p>
                    {(e.bullets || []).slice(0, 3).map((b, bi) => <p key={bi} className="text-slate-600">• {b.text}</p>)}
                  </div>
                )}
              </ItemRow>
            ))}
          </Section>

          {/* Education */}
          <Section title={`Education (${data.education?.length || 0})`}>
            {(data.education || []).map((e, i) => (
              <ItemRow key={i} editing={editing} onRemove={() => removeItem('education', i)}>
                {editing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <input className={inputCls} placeholder="Institution" value={e.institution || ''} onChange={(ev) => setField(['education', i, 'institution'], ev.target.value)} />
                    <input className={inputCls} placeholder="Degree" value={e.degree || ''} onChange={(ev) => setField(['education', i, 'degree'], ev.target.value)} />
                    <input className={inputCls} placeholder="Field" value={e.field || ''} onChange={(ev) => setField(['education', i, 'field'], ev.target.value)} />
                  </div>
                ) : (
                  <p className="text-slate-800">{[e.degree, e.field].filter(Boolean).join(', ')} {e.degree || e.field ? '—' : ''} {e.institution}</p>
                )}
              </ItemRow>
            ))}
          </Section>

          {/* Projects */}
          <Section title={`Projects (${data.projects?.length || 0})`}>
            {(data.projects || []).map((p, i) => (
              <ItemRow key={i} editing={editing} onRemove={() => removeItem('projects', i)}>
                {editing ? (
                  <div className="flex-1 space-y-2">
                    <input className={inputCls} placeholder="Name" value={p.name || ''} onChange={(ev) => setField(['projects', i, 'name'], ev.target.value)} />
                    <textarea rows={2} className={inputCls} placeholder="Description" value={p.description || ''} onChange={(ev) => setField(['projects', i, 'description'], ev.target.value)} />
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    {p.description && <p className="text-slate-600">{p.description}</p>}
                    {(p.technologies || []).length > 0 && <p className="text-slate-500">{p.technologies.join(', ')}</p>}
                  </div>
                )}
              </ItemRow>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  const items = React.Children.toArray(children);
  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-600">{title}</label>
      <div className="space-y-2 mt-1">
        {items.length === 0 ? <p className="text-slate-400">None found</p> : items}
      </div>
    </div>
  );
}

function ItemRow({ editing, onRemove, children }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200">
      {children}
      {editing && (
        <button type="button" aria-label="Remove item" onClick={onRemove} className="text-slate-400 hover:text-rose-600 cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
