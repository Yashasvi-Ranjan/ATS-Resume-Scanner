import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Award,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import CircularScore from '../components/CircularScore';
import ProgressBar from '../components/ProgressBar';

const isNumber = (v) => typeof v === 'number' && !Number.isNaN(v);

// Maps a backend report to the page model. Nothing is invented.
function mapReport(data) {
  const metrics = data?.metrics || {};
  const qa = Array.isArray(data?.qaBreakdown) ? data.qaBreakdown : [];
  const questionsReview = qa.map((q) => ({
    questionId: q.id,
    question: q.questionText,
    answer: q.answer?.answerText || '',
    score: isNumber(q.evaluation?.score) ? q.evaluation.score : null,
    verdict: null,
    feedback: q.evaluation?.feedback ?? null,
    revisionTopic: null,
    category: q.category
  }));
  const answeredCount = isNumber(metrics.answeredCount)
    ? metrics.answeredCount
    : questionsReview.filter((q) => q.answer.trim().length > 0).length;
  return {
    overallScore: isNumber(metrics.averageScore) ? metrics.averageScore : null,
    categories: [],
    strongAreas: [],
    weakAreas: [],
    summary: null,
    questionsReview,
    answeredCount,
    completedQuestions: answeredCount,
    totalQuestions: metrics.actualQuestionsCount || metrics.configuredTotalQuestions || questionsReview.length,
    role: data?.session?.jobDescription?.title || '',
    company: data?.session?.jobDescription?.companyName || '',
    evaluatedCount: metrics.evaluatedCount || 0,
    isMockEvaluation: Boolean(metrics.isMockEvaluation)
  };
}

function describeError(err) {
  if (err?.status === 404) return 'This interview could not be found. It may have been removed.';
  if (err?.status === 403) return 'You do not have permission to view this interview.';
  return err?.message || 'Failed to load the interview report.';
}

export default function InterviewResultsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { interviewResults: memoryResults, setCurrentQuestionIndex, currentUser } = useApp();
  const userId = currentUser?.id;
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setLoaded(null);
    setLoading(true);
    setError(null);
    api.interviews
      .getReport(id)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        if (!data || !Array.isArray(data.qaBreakdown)) {
          throw new Error('Unexpected response while loading the interview report.');
        }
        setLoaded({ id, model: mapReport(data) });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(describeError(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, userId, attempt]);

  // With an id, only ever show data loaded for that id; no fallback to in-memory results.
  const interviewResults = id ? (loaded?.id === id ? loaded.model : null) : memoryResults;

  const handleRetake = () => {
    setCurrentQuestionIndex(0);
    navigate('/mock-interview');
  };

  if (id && loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center">
        <p className="text-sm text-slate-600">Loading interview report...</p>
      </div>
    );
  }

  if (id && error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center space-y-3">
        <p className="text-sm text-rose-600">{error}</p>
        <button
          onClick={retry}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!interviewResults) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center space-y-3">
          <p className="text-sm text-slate-600">No interview results yet.</p>
          <button
            onClick={() => navigate('/mock-interview')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Go to Mock Interview</span>
          </button>
        </div>
      </div>
    );
  }

  const isNum = isNumber;
  const hasScore = isNum(interviewResults.overallScore);
  const categories = interviewResults.categories || [];
  const strongAreas = interviewResults.strongAreas || [];
  const weakAreas = interviewResults.weakAreas || [];
  const questionsReview = interviewResults.questionsReview || [];
  const answeredCount = interviewResults.completedQuestions ?? interviewResults.answeredCount ?? 0;
  const totalCount = interviewResults.totalQuestions ?? questionsReview.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-0.5">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Interview Evaluation Report</span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">
            Mock Interview Results{interviewResults.role ? ` — ${interviewResults.role}` : ''}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {interviewResults.company && (
              <>Evaluated for: <strong className="text-slate-800">{interviewResults.company}</strong> • </>
            )}
            Answered: <strong className="text-slate-800">{answeredCount} of {totalCount} questions</strong>
          </p>
          {id && !interviewResults.evaluatedCount && (
            <p className="text-xs text-slate-500 mt-0.5">Evaluation not available yet</p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRetake}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Interview</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
          >
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Main Score & Performance Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Score gauge */}
        <div className="lg:col-span-4 bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center flex flex-col items-center justify-center space-y-3">
          <CircularScore
            score={hasScore ? interviewResults.overallScore : null}
            size={150}
            label="Interview Score"
            subtitle={hasScore ? (interviewResults.isMockEvaluation ? 'Sample evaluation' : 'Evaluated') : 'Not evaluated'}
            emptyLabel="Not evaluated"
          />
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              {hasScore ? `${interviewResults.overallScore} / 100 Overall Score` : 'Not evaluated'}
            </span>
            {hasScore && interviewResults.isMockEvaluation && (
              <span className="text-[11px] text-slate-500">Sample evaluation</span>
            )}
          </div>
        </div>

        {/* Category Breakdown list */}
        <div className="lg:col-span-8 bg-white rounded-xl p-6 border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Competency Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Performance across technical depth, articulation, and problem solving
              </p>
            </div>
            {hasScore && (
              <span className="text-xs font-semibold text-slate-400">Benchmark: &gt;70%</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {categories.length === 0 && (
              <p className="text-xs text-slate-500">Not evaluated</p>
            )}
            {categories.map((cat) => (
              <div key={cat.name} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{cat.name}</span>
                  <span className="font-bold font-display text-slate-900">{isNum(cat.score) ? `${cat.score}%` : 'N/A'}</span>
                </div>
                <ProgressBar value={isNum(cat.score) ? cat.score : null} showPercentage={false} height="h-1.5" emptyLabel="Not evaluated" />
              </div>
            ))}
          </div>

          {/* Qualitative Performance Summary */}
          <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-slate-700 leading-relaxed">
            <strong className="text-blue-900 font-semibold block mb-0.5">
              Evaluator Summary:
            </strong>
            {interviewResults.summary || 'Not evaluated'}
          </div>
        </div>
      </div>

      {/* Strong Areas vs Weak Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strong Areas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Demonstrated Strengths
            </h3>
          </div>
          <div className="space-y-2.5">
            {strongAreas.length === 0 && (
              <p className="text-xs text-slate-500">Not evaluated</p>
            )}
            {strongAreas.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-0.5">
                <h4 className="text-xs font-bold text-emerald-900">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Areas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Areas to Revise & Deepen
            </h3>
          </div>
          <div className="space-y-2.5">
            {weakAreas.length === 0 && (
              <p className="text-xs text-slate-500">Not evaluated</p>
            )}
            {weakAreas.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-amber-50/50 border border-amber-100 space-y-0.5">
                <h4 className="text-xs font-bold text-amber-900">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question-by-Question Feedback & Revision Topics */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 font-display">
            Question Feedback & Suggested Revision Topics
          </h3>
          <p className="text-xs text-slate-500">
            Review detailed feedback and focus on key concepts to sharpen before actual interviews
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {questionsReview.length === 0 && (
            <p className="text-xs text-slate-500">Not evaluated</p>
          )}
          {questionsReview.map((item, idx) => (
            <div
              key={item.questionId ?? idx}
              className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {id ? `Question ${idx + 1}${item.category ? ` · ${item.category}` : ''}` : `Question #${item.questionId}`}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      !isNum(item.score)
                        ? 'bg-slate-50 text-slate-600 border-slate-200'
                        : item.score >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.score >= 70
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {isNum(item.score)
                      ? `Score: ${item.score}%${item.verdict ? ` (${item.verdict})` : ''}`
                      : 'Score: N/A'}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-900">
                  "{item.question}"
                </h4>
                {item.answer !== undefined && (
                  <p className="text-xs text-slate-600 leading-relaxed mt-1 whitespace-pre-line">
                    <strong className="text-slate-800 font-semibold">Your answer: </strong>
                    {item.answer || 'Not answered'}
                  </p>
                )}
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {item.feedback || 'Not evaluated'}
                </p>
              </div>

              {item.revisionTopic && (
                <div className="pt-2.5 border-t border-slate-200/80">
                  <span className="text-[11px] text-blue-700 font-medium flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Topic: {item.revisionTopic}</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
