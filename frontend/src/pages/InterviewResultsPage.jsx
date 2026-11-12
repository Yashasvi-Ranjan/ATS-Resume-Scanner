import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Award, RotateCcw, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { describeApiError } from '../utils/errors';
import CircularScore from '../components/CircularScore';
import ProgressBar from '../components/ProgressBar';
import { EvaluationView } from './MockInterviewPage';

const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);
const DISCLAIMER = 'Coaching feedback, not a hiring decision.';

export default function InterviewResultsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useApp();
  const userId = currentUser?.id;
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setState('loading');
    (async () => {
      try {
        let sid = id;
        if (!sid) {
          const l = await api.interviews.list({ status: 'COMPLETED', limit: 1 });
          sid = l?.data?.[0]?.id;
          if (!sid) { if (!cancelled) setState('none'); return; }
          if (!cancelled) navigate(`/mock-interview/results/${sid}`, { replace: true });
          return;
        }
        const res = await api.interviews.getReport(sid);
        if (cancelled) return;
        if (!res?.data || !Array.isArray(res.data.qaBreakdown)) throw new Error('Unexpected response while loading the interview report.');
        setData(res.data);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err?.status === 404 ? 'This interview could not be found.' : describeApiError(err, 'Failed to load the interview report.'));
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [id, userId, attempt, navigate]);

  const box = (c) => <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center space-y-3">{c}</div>;
  if (state === 'loading') return box(<p className="text-sm text-slate-600" role="status">Loading interview report…</p>);
  if (state === 'none') return box(<><p className="text-sm text-slate-600">No completed interviews yet.</p><button onClick={() => navigate('/mock-interview')} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer">Go to Mock Interview</button></>);
  if (state === 'error') return box(<><p className="text-sm text-rose-600" role="alert">{error}</p><button onClick={() => setAttempt((n) => n + 1)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer">Retry</button></>);

  const { report, metrics, qaBreakdown, session, persisted } = data;
  const overall = isNum(report?.overallScore) ? report.overallScore : isNum(metrics?.averageScore) ? metrics.averageScore : null;
  const counts = report?.counts;
  const byCat = Object.entries(report?.averageByCategory || {});
  const qa = Object.fromEntries(qaBreakdown.map((q) => [q.id, q]));
  const perQuestion = report?.perQuestion?.length ? report.perQuestion : qaBreakdown.map((q) => ({ questionId: q.id, order: q.order, category: q.category, questionText: q.questionText, answered: !!q.answer, evaluated: !!q.evaluation, score: q.evaluation?.score ?? null, feedback: q.evaluation?.feedback ?? null }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-0.5"><Award className="w-3.5 h-3.5" /><span>Interview Coaching Report</span></div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">Mock Interview Results{session?.jobDescription?.title ? ` — ${session.jobDescription.title}` : ''}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {session?.jobDescription?.companyName && <>Company: <strong className="text-slate-800">{session.jobDescription.companyName}</strong> • </>}
            Answered: <strong className="text-slate-800">{metrics.answeredCount} of {metrics.actualQuestionsCount} questions</strong> • Evaluated: <strong className="text-slate-800">{metrics.evaluatedCount}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate('/mock-interview')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /><span>New Interview</span></button>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-lg bg-white text-slate-700 text-xs font-semibold border border-slate-300 cursor-pointer">Dashboard</button>
        </div>
      </div>

      {!persisted && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">This interview is not completed yet; the figures below are provisional.</p>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-4 bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center flex flex-col items-center justify-center space-y-3">
          <CircularScore score={overall} size={150} label="Interview Score" emptyLabel="Not evaluated" />
          <p className="text-[11px] text-slate-500">{report?.scoringNote || DISCLAIMER}</p>
        </div>
        <div className="lg:col-span-8 bg-white rounded-xl p-6 border border-slate-200 shadow-card space-y-4">
          <div className="pb-3 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900 font-display">Average by Category</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {byCat.length === 0 && <p className="text-xs text-slate-500">Not evaluated</p>}
            {byCat.map(([name, score]) => (
              <div key={name} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-800 capitalize">{name.replace(/_/g, ' ')}</span><span className="font-bold text-slate-900">{isNum(score) ? Math.round(score) : 'N/A'}</span></div>
                <ProgressBar value={isNum(score) ? score : null} showPercentage={false} height="h-1.5" />
              </div>
            ))}
          </div>
          <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-slate-700 leading-relaxed space-y-1">
            <strong className="text-blue-900 font-semibold block">Summary</strong>
            <p>{report?.summary || 'Not available'}</p>
            {report?.narrative && <p>{report.narrative}</p>}
            {report?.narrativeNote && <p className="text-slate-500">{report.narrativeNote}</p>}
            {counts && <p className="text-slate-500">{counts.answeredNotEvaluated > 0 ? `${counts.answeredNotEvaluated} answer(s) could not be evaluated. ` : ''}{counts.practiceQuestions > 0 ? `${counts.practiceQuestions} practice question(s) excluded from scoring.` : ''}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card space-y-2">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><h3 className="text-sm font-bold text-slate-900 font-display">Demonstrated Strengths</h3></div>
          {(report?.topStrengths || []).length === 0 && <p className="text-xs text-slate-500">None recorded.</p>}
          <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1">{(report?.topStrengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card space-y-2">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100"><AlertTriangle className="w-4 h-4 text-amber-600" /><h3 className="text-sm font-bold text-slate-900 font-display">Areas to Improve</h3></div>
          {(report?.areasToImprove || []).length === 0 && <p className="text-xs text-slate-500">None recorded.</p>}
          <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1">{(report?.areasToImprove || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          {(report?.topicsToRevise || []).length > 0 && (
            <div className="pt-2 border-t border-slate-100"><p className="text-[11px] font-semibold text-blue-700 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />Topics to revise</p>
              <div className="flex flex-wrap gap-1 mt-1">{report.topicsToRevise.map((t, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">{t}</span>)}</div></div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card space-y-4">
        <div className="pb-3 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900 font-display">Question-by-Question Feedback</h3></div>
        <div className="space-y-3.5">
          {perQuestion.map((p, i) => {
            const full = qa[p.questionId];
            return (
              <div key={p.questionId} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Question {p.order ?? i + 1}{p.category ? ` · ${p.category}` : ''}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-white text-slate-600 border-slate-200">{isNum(p.score) ? `Score: ${Math.round(p.score)}` : p.answered ? 'Not evaluated' : 'Unanswered'}</span>
                </div>
                <h4 className="text-xs font-semibold text-slate-900">“{p.questionText}”</h4>
                <p className="text-xs text-slate-600 whitespace-pre-line"><strong className="text-slate-800">Your answer: </strong>{full?.answer?.answerText || 'Not answered'}</p>
                {full?.evaluation && isNum(full.evaluation.score) && <EvaluationView evaluation={full.evaluation} />}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500">{report?.disclaimer || DISCLAIMER}</p>
      </div>
    </div>
  );
}
