import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Bot, Play, Send, Loader2, ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { describeApiError } from '../utils/errors';
import ProgressBar from '../components/ProgressBar';

const DISCLAIMER = 'Coaching feedback, not a hiring decision.';

function List({ title, items, tone = 'text-slate-700' }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-600">{title}</p>
      <ul className={`list-disc pl-4 text-xs ${tone}`}>{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  );
}

export function EvaluationView({ evaluation }) {
  const d = evaluation?.details || {};
  return (
    <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-100 space-y-2" data-testid="evaluation">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-xs text-blue-900">Coaching feedback</strong>
        <span className="text-sm font-bold text-slate-900 font-display">{Math.round(evaluation.score)} / 100</span>
      </div>
      <p className="text-xs text-slate-700">{evaluation.feedback}</p>
      <List title="Strengths" items={d.strengths} tone="text-emerald-800" />
      <List title="Weaknesses" items={d.weaknesses} tone="text-amber-800" />
      <List title="Missing concepts" items={d.missingConcepts} />
      <List title="Improved answer outline" items={d.improvedAnswerOutline} />
      <List title="Topics to revise" items={d.topicsToRevise} />
      <p className="text-[10px] text-slate-500">{DISCLAIMER}</p>
    </div>
  );
}

export default function MockInterviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { analysisResult, currentUser, showToast } = useApp();
  const userId = currentUser?.id;
  const sessionParam = params.get('session');
  const analysisParam = params.get('analysis');

  const [setup, setSetup] = useState({ state: 'loading', error: null, info: null, unfinished: null });
  const [difficulty, setDifficulty] = useState('mixed');
  const [count, setCount] = useState(5);
  const [session, setSession] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(null); // start | generate | submit | evaluate | complete | load
  const [error, setError] = useState(null);
  const [evalErrors, setEvalErrors] = useState({}); // questionId -> message
  const busyRef = useRef(false);

  const loadSession = useCallback(async (id) => {
    const res = await api.interviews.get(id);
    const s = res?.data;
    setSession(s);
    const nextIdx = s.progress?.nextQuestionId ? s.questions.findIndex((q) => q.id === s.progress.nextQuestionId) : 0;
    setIdx(Math.max(0, nextIdx));
    return s;
  }, []);

  const run = useCallback(async (kind, fn) => {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(kind);
    setError(null);
    try { return await fn(); }
    catch (err) { setError(describeApiError(err)); return null; }
    finally { busyRef.current = false; setBusy(null); }
  }, []);

  // Setup: resolve analysis + detect unfinished session (or load ?session=).
  useEffect(() => {
    let cancelled = false;
    setSession(null);
    setSetup({ state: 'loading', error: null, info: null, unfinished: null });
    (async () => {
      try {
        if (sessionParam) {
          const s = await loadSession(sessionParam);
          if (cancelled) return;
          if (s.status === 'COMPLETED') { navigate(`/mock-interview/results/${s.id}`, { replace: true }); return; }
          setSetup({ state: 'active', error: null, info: null, unfinished: null });
          return;
        }
        let id = analysisParam || (analysisResult?.status === 'COMPLETED' ? analysisResult.id : null);
        if (!id) {
          const l = await api.analyses.list({ limit: 1, status: 'COMPLETED' });
          id = l?.data?.[0]?.id || null;
        }
        const [ip, sch] = await Promise.all([
          api.interviews.list({ status: 'IN_PROGRESS', limit: 1 }),
          api.interviews.list({ status: 'SCHEDULED', limit: 1 })
        ]);
        const unfinished = ip?.data?.[0] || sch?.data?.[0] || null;
        let info = null;
        if (id) {
          const a = (await api.analyses.get(id))?.data;
          if (a?.status === 'COMPLETED') info = { id: a.id, resumeId: a.resumeId, jobDescriptionId: a.jobDescriptionId, title: a.jobDescription?.title || '', company: a.jobDescription?.companyName || '' };
        }
        if (cancelled) return;
        setSetup({ state: 'ready', error: null, info, unfinished });
      } catch (err) {
        if (!cancelled) setSetup({ state: 'error', error: describeApiError(err), info: null, unfinished: null });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, sessionParam, analysisParam]);

  const questions = session?.questions || [];
  const current = questions[idx];
  useEffect(() => { setAnswer(current?.answer?.answerText || ''); }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = () => run('start', async () => {
    const res = await api.interviews.create({
      resumeId: setup.info.resumeId,
      jobDescriptionId: setup.info.jobDescriptionId,
      analysisId: setup.info.id,
      totalQuestions: count,
      difficulty,
      generate: true
    });
    const s = res?.data;
    setSession(s);
    setIdx(0);
    setSetup((p) => ({ ...p, state: 'active' }));
  });

  const handleGenerate = (regenerate) => run('generate', async () => {
    await api.interviews.generateQuestions(session.id, regenerate);
    await loadSession(session.id);
  });

  const patchQuestion = (qid, patch) =>
    setSession((s) => ({ ...s, questions: s.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)) }));

  const handleSubmit = () => {
    const text = answer.trim();
    if (!text) return showToast('Please write an answer first.', 'warning');
    return run('submit', async () => {
      const q = current;
      const res = q.answer
        ? await api.interviews.updateAnswer(session.id, q.answer.id, text)
        : await api.interviews.submitAnswer(session.id, { questionId: q.id, answerText: text });
      const r = res?.data;
      const { evaluation, evaluationStatus, evaluationError, ...ans } = r;
      patchQuestion(q.id, { answer: ans, evaluation: evaluation || null });
      setEvalErrors((e) => ({ ...e, [q.id]: evaluationStatus === 'FAILED' ? evaluationError || 'Evaluation failed.' : null }));
      if (evaluationStatus === 'NOT_APPLICABLE') showToast('Answer saved (practice question, not evaluated).', 'info');
    });
  };

  const handleEvaluate = () => run('evaluate', async () => {
    const q = current;
    const res = await api.interviews.evaluateAnswer(session.id, q.answer.id);
    patchQuestion(q.id, { evaluation: res?.data });
    setEvalErrors((e) => ({ ...e, [q.id]: null }));
  }).then(() => {});

  const handleComplete = async () => {
    const r = await run('complete', async () => {
      await api.interviews.complete(session.id);
      return true;
    });
    if (r) { showToast('Interview completed.', 'success'); navigate(`/mock-interview/results/${session.id}`); }
  };

  const box = (children) => <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-card text-center space-y-4">{children}</div>;
  const errLine = error && <p className="text-xs text-rose-700" role="alert">{error}</p>;

  if (setup.state === 'loading') return <div className="max-w-3xl mx-auto">{box(<p className="text-sm text-slate-600" role="status">Loading…</p>)}</div>;
  if (setup.state === 'error') return <div className="max-w-3xl mx-auto">{box(<><p className="text-sm text-rose-700" role="alert">{setup.error}</p><button onClick={() => navigate(0)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer">Retry</button></>)}</div>;

  // Setup screen
  if (!session) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-xl p-8 lg:p-10 border border-slate-200 shadow-card text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto"><Bot className="w-7 h-7" /></div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 font-display">Mock Interview{setup.info?.title ? ` — ${setup.info.title}` : ''}</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Questions are generated from your parsed resume and the job description. Answers are saved to your account and evaluated as coaching feedback.</p>
          </div>

          {setup.unfinished && (
            <div className="max-w-md mx-auto p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <p>You have an unfinished interview ({setup.unfinished.jobDescription?.title || 'Untitled role'}, {setup.unfinished.status.toLowerCase().replace('_', ' ')}).</p>
              <button onClick={() => run('load', async () => { await loadSession(setup.unfinished.id); setSetup((p) => ({ ...p, state: 'active' })); })} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 font-semibold disabled:opacity-50 cursor-pointer">Resume unfinished interview</button>
            </div>
          )}

          {!setup.info ? (
            <p className="text-xs text-slate-600">Complete a resume and job description analysis first. <Link to="/analysis" className="text-blue-600 hover:underline font-semibold">Go to Analysis</Link></p>
          ) : (
            <div className="max-w-md mx-auto grid grid-cols-2 gap-3 text-left">
              <div><label className="text-[11px] font-semibold text-slate-600">Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  {['mixed', 'easy', 'medium', 'hard'].map((d) => <option key={d} value={d}>{d}</option>)}
                </select></div>
              <div><label className="text-[11px] font-semibold text-slate-600">Questions</label>
                <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                </select></div>
            </div>
          )}
          {errLine}
          {setup.info && (
            <button onClick={handleStart} disabled={!!busy} className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 mx-auto disabled:opacity-50 cursor-pointer">
              {busy === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{busy === 'start' ? 'Generating questions…' : 'Start new interview'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Session with no usable questions
  if (questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        {box(
          <>
            <p className="text-sm text-slate-700">
              {session.generationStatus === 'FAILED' ? 'Question generation failed.' : session.generationStatus === 'PROCESSING' ? 'Questions are being generated…' : 'No questions yet.'}
            </p>
            {session.errorMessage && <p className="text-xs text-rose-700" role="alert">{session.errorMessage}</p>}
            {errLine}
            <button onClick={() => handleGenerate(false)} disabled={!!busy} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer">
              {busy === 'generate' ? 'Generating…' : 'Generate questions'}
            </button>
          </>
        )}
      </div>
    );
  }

  const answered = questions.filter((q) => q.answer).length;
  const evalFailed = current?.answer && !current.evaluation && current.source !== 'USER';
  const changed = current?.answer ? answer.trim() !== current.answer.answerText.trim() : answer.trim().length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-card space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-blue-700 uppercase tracking-wider text-[11px]">Question {idx + 1} of {questions.length}</span>
          <span className="text-slate-500 font-normal">{answered} answered</span>
        </div>
        <ProgressBar value={(answered / questions.length) * 100} showPercentage={false} height="h-1.5" />
      </div>

      <div className="bg-white rounded-xl p-5 lg:p-7 border border-slate-200 shadow-card space-y-5">
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {[current.category, current.difficulty].filter(Boolean).join(' · ') || 'Question'}
          </span>
          <h3 className="text-base lg:text-lg font-bold text-slate-900 font-display leading-snug">“{current.questionText}”</h3>
        </div>

        <div className="space-y-2">
          <label htmlFor="answer-input" className="text-xs font-medium text-slate-800">Your Response:</label>
          <textarea id="answer-input" rows={7} value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={!!busy}
            placeholder="Type your structured answer here…"
            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs lg:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none leading-relaxed" />
          <div className="text-[11px] text-slate-400">{answer.length} / 8000 characters</div>
        </div>

        {errLine}

        {current.evaluation && <EvaluationView evaluation={current.evaluation} />}
        {evalFailed && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-2" role="alert">
            <p>Your answer was saved, but it could not be evaluated: {evalErrors[current.id] || 'evaluation not available.'}</p>
            <button onClick={handleEvaluate} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 font-semibold disabled:opacity-50 cursor-pointer">
              {busy === 'evaluate' ? 'Evaluating…' : 'Retry evaluation'}
            </button>
          </div>
        )}
        {current.answer && current.source === 'USER' && <p className="text-[11px] text-slate-500">Practice question: saved but not evaluated.</p>}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0 || !!busy} className="px-3 py-2 rounded-lg bg-white text-slate-700 text-xs font-medium border border-slate-300 flex items-center gap-1 disabled:opacity-50 cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" />Previous</button>
            <button onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))} disabled={idx === questions.length - 1 || !!busy} className="px-3 py-2 rounded-lg bg-white text-slate-700 text-xs font-medium border border-slate-300 flex items-center gap-1 disabled:opacity-50 cursor-pointer">Next<ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSubmit} disabled={!!busy || !changed} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              {busy === 'submit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{busy === 'submit' ? 'Saving & evaluating…' : current.answer ? 'Update answer' : 'Submit answer'}</span>
            </button>
            <button onClick={handleComplete} disabled={!!busy || answered === 0} title={answered === 0 ? 'Answer at least one question' : undefined} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              {busy === 'complete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              <span>{busy === 'complete' ? 'Building report…' : 'Complete interview'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
