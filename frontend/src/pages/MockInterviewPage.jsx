import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bot,
  Play,
  Clock,
  HelpCircle,
  Sparkles,
  SkipForward,
  Send,
  Loader2,
  ChevronLeft,
  Plus,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mockApi } from '../services/mockApi';
import api from '../services/api';
import { DEMO_MODE } from '../config/demoMode';
import ProgressBar from '../components/ProgressBar';

export default function MockInterviewPage() {
  const navigate = useNavigate();
  const {
    interviewQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    interviewAnswers,
    setInterviewAnswers,
    setInterviewResults,
    analysisResult,
    currentUser,
    showToast
  } = useApp();
  const userId = currentUser?.id;

  const [hasStarted, setHasStarted] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [showHint, setShowHint] = useState(false);

  // Backend-integrated (non-demo) state
  const [source, setSource] = useState('bank'); // 'bank' | 'custom'
  const [customQuestions, setCustomQuestions] = useState([]);
  const [draftQuestion, setDraftQuestion] = useState('');
  const [analysisInfo, setAnalysisInfo] = useState(null);
  const [analysisState, setAnalysisState] = useState(DEMO_MODE ? 'ready' : 'loading'); // loading | ready | none | error
  const [analysisError, setAnalysisError] = useState('');
  const [analysisAttempt, setAnalysisAttempt] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [pendingSetup, setPendingSetup] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  // sessionRef holds the created session and per-question progress so a failed
  // start can resume instead of creating a second session.
  const sessionRef = useRef({ id: null, questions: [], qMap: {}, answerIds: {} });
  const busyRef = useRef(false);

  const bankQuestions = Array.isArray(interviewQuestions) ? interviewQuestions : [];
  const customAsQuestions = customQuestions.map((text, i) => ({
    id: `custom-${i}`,
    type: 'Custom',
    title: `Question ${i + 1}`,
    question: text,
    hint: null,
    timeLimitSeconds: 120
  }));
  const chosenQuestions = source === 'custom' ? customAsQuestions : bankQuestions;
  const questions = DEMO_MODE ? bankQuestions : hasStarted ? activeQuestions : chosenQuestions;
  const currentQuestion = questions[currentQuestionIndex] || questions[0];
  const totalQuestions = questions.length;
  const progressPercent = totalQuestions > 0
    ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
    : 0;

  const resetSession = () => {
    sessionRef.current = { id: null, questions: [], qMap: {}, answerIds: {} };
    busyRef.current = false;
    setSessionId(null);
    setPendingSetup(false);
    setStartError('');
    setIsStarting(false);
    setIsSubmitting(false);
    setHasStarted(false);
    setActiveQuestions([]);
  };

  // User switch: drop any session/question state belonging to the previous user.
  useEffect(() => {
    resetSession();
    setCustomQuestions([]);
    setDraftQuestion('');
    setAnalysisInfo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Resolve the analysis (context first, else latest saved) and fetch its resume/job ids.
  useEffect(() => {
    if (DEMO_MODE) return undefined;
    let cancelled = false;
    setAnalysisState('loading');
    setAnalysisError('');
    (async () => {
      try {
        let id = analysisResult?.id;
        if (!id) {
          const list = await api.analyses.list({ limit: 1 });
          id = list?.data?.[0]?.id;
        }
        if (!id) {
          if (!cancelled) {
            setAnalysisInfo(null);
            setAnalysisState('none');
          }
          return;
        }
        const res = await api.analyses.get(id);
        const rec = res?.data ?? res;
        if (!rec?.resumeId || !rec?.jobDescriptionId) {
          throw new Error('The saved analysis is missing its resume or job description.');
        }
        if (cancelled) return;
        setAnalysisInfo({
          id,
          resumeId: rec.resumeId,
          jobDescriptionId: rec.jobDescriptionId,
          title: rec.jobDescription?.title || '',
          company: rec.jobDescription?.companyName || ''
        });
        setAnalysisState('ready');
      } catch (err) {
        if (cancelled) return;
        setAnalysisInfo(null);
        setAnalysisError(err?.message || 'Failed to load your saved analysis.');
        setAnalysisState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, analysisResult?.id, analysisAttempt]);

  // Load existing answer when navigating between questions
  useEffect(() => {
    if (hasStarted && currentQuestion) {
      setCurrentAnswer(interviewAnswers?.[currentQuestion.id] || '');
      setTimerSeconds(currentQuestion.timeLimitSeconds || 120);
      setShowHint(false);
    }
  }, [currentQuestionIndex, hasStarted]);

  // Timer countdown
  useEffect(() => {
    let interval = null;
    if (hasStarted && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [hasStarted, timerSeconds]);

  const addCustomQuestion = () => {
    const text = draftQuestion.trim();
    if (text.length < 5) {
      showToast('A question needs at least 5 characters.', 'warning');
      return;
    }
    if (customQuestions.length >= 20) {
      showToast('You can add up to 20 questions.', 'warning');
      return;
    }
    setCustomQuestions((prev) => [...prev, text]);
    setDraftQuestion('');
  };

  // Creates the session (once) and posts each question sequentially, resuming after a failure.
  const handleStartInterview = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsStarting(true);
    setStartError('');
    const sess = sessionRef.current;
    try {
      if (!sess.id) {
        if (!analysisInfo) throw new Error('No saved analysis is available.');
        const chosen = chosenQuestions.slice(0, 20);
        if (chosen.length < 1) throw new Error('Add at least one question to start.');
        const res = await api.interviews.create({
          resumeId: analysisInfo.resumeId,
          jobDescriptionId: analysisInfo.jobDescriptionId,
          analysisId: analysisInfo.id,
          totalQuestions: Math.min(20, Math.max(1, chosen.length))
        });
        const created = res?.data ?? res;
        if (!created?.id) throw new Error('Unexpected response while creating the interview.');
        sess.id = created.id;
        sess.questions = chosen;
        setSessionId(created.id);
        setPendingSetup(true);
      }
      for (let i = 0; i < sess.questions.length; i += 1) {
        if (sess.qMap[i]) continue;
        const q = sess.questions[i];
        const res = await api.interviews.addQuestion(sess.id, {
          questionText: q.question,
          order: i + 1,
          category: q.type || 'Practice'
        });
        const created = res?.data ?? res;
        if (!created?.id) throw new Error('Unexpected response while saving a question.');
        sess.qMap[i] = created.id;
      }
      setActiveQuestions(sess.questions);
      setInterviewAnswers({});
      setCurrentQuestionIndex(0);
      setPendingSetup(false);
      setHasStarted(true);
    } catch (err) {
      const msg = err?.message || 'Failed to start the interview.';
      setStartError(msg);
      showToast(msg, 'error');
    } finally {
      busyRef.current = false;
      setIsStarting(false);
    }
  };

  const handleCancelSetup = async () => {
    const id = sessionRef.current.id;
    resetSession();
    if (!id) return;
    try {
      await api.interviews.updateStatus(id, 'ABANDONED');
    } catch (err) {
      showToast(`Setup cancelled, but the session could not be marked abandoned: ${err?.message || 'Unknown error'}`, 'error');
    }
  };

  // Marks the session completed and opens its saved report. Returns false on failure.
  const completeSession = async () => {
    const id = sessionRef.current.id;
    try {
      await api.interviews.updateStatus(id, 'COMPLETED');
    } catch (err) {
      showToast(err?.message || 'Could not complete the interview.', 'error');
      return false;
    }
    showToast('Interview completed.', 'success');
    navigate(`/mock-interview/results/${id}`);
    return true;
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Builds a factual, unscored summary of the session (no automated evaluation).
  const finishInterview = (answers) => {
    const questionsReview = questions.map((q) => ({
      questionId: q.id,
      question: q.question,
      answer: answers[q.id] || '',
      score: null,
      verdict: null,
      feedback: null,
      revisionTopic: null
    }));
    const answeredCount = questionsReview.filter((q) => q.answer.trim().length > 0).length;
    setInterviewResults({
      overallScore: null,
      categories: [],
      strongAreas: [],
      weakAreas: [],
      summary: null,
      questionsReview,
      answeredCount,
      completedQuestions: answeredCount,
      totalQuestions,
      evaluated: false
    });
    navigate('/mock-interview/results');
  };

  const handleFillSample = () => {
    if (DEMO_MODE && currentQuestion?.sampleAnswer) {
      setCurrentAnswer(currentQuestion.sampleAnswer);
      showToast('Sample answer populated for demo.', 'info');
    }
  };

  const handleSubmitAnswerBackend = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsSubmitting(true);
    try {
      const sess = sessionRef.current;
      const idx = currentQuestionIndex;
      const saved = interviewAnswers?.[currentQuestion.id];
      if (!sess.answerIds[idx] || saved !== currentAnswer) {
        const questionId = sess.qMap[idx];
        if (!questionId) throw new Error('This question was not saved to the server.');
        if (sess.answerIds[idx]) {
          await api.interviews.updateAnswer(sess.id, sess.answerIds[idx], currentAnswer);
        } else {
          const res = await api.interviews.submitAnswer(sess.id, { questionId, answerText: currentAnswer });
          const created = res?.data ?? res;
          if (!created?.id) throw new Error('Unexpected response while saving the answer.');
          sess.answerIds[idx] = created.id;
        }
        setInterviewAnswers({ ...interviewAnswers, [currentQuestion.id]: currentAnswer });
      }
      if (idx + 1 < totalQuestions) {
        showToast(`Question ${idx + 1} answer saved.`, 'success');
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        await completeSession();
      }
    } catch (err) {
      showToast(err?.message || 'Submission error.', 'error');
    } finally {
      busyRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer || currentAnswer.trim().length === 0) {
      showToast('Please provide an answer before submitting.', 'warning');
      return;
    }
    if (!DEMO_MODE) {
      await handleSubmitAnswerBackend();
      return;
    }

    setIsSubmitting(true);
    try {
      // Demo only: simulated latency; the response is not used.
      await mockApi.submitInterviewAnswer(currentQuestion.id, currentAnswer);

      // Save answer locally in state
      const updatedAnswers = {
        ...interviewAnswers,
        [currentQuestion.id]: currentAnswer
      };
      setInterviewAnswers(updatedAnswers);

      showToast(`Question ${currentQuestionIndex + 1} answer saved.`, 'success');

      if (currentQuestionIndex + 1 < totalQuestions) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        showToast('All interview questions completed.', 'success');
        finishInterview(updatedAnswers);
      }
    } catch (err) {
      showToast(err?.message || 'Submission error.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipQuestion = async () => {
    if (!DEMO_MODE) {
      if (busyRef.current) return;
      if (currentQuestionIndex + 1 < totalQuestions) {
        showToast(`Skipped question ${currentQuestionIndex + 1} (left unanswered).`, 'info');
        setCurrentQuestionIndex((prev) => prev + 1);
        return;
      }
      busyRef.current = true;
      setIsSubmitting(true);
      try {
        await completeSession();
      } finally {
        busyRef.current = false;
        setIsSubmitting(false);
      }
      return;
    }
    showToast(`Skipped question ${currentQuestionIndex + 1}.`, 'info');
    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishInterview(interviewAnswers || {});
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {!hasStarted ? (
        /* Start Screen */
        <div className="bg-white rounded-xl p-8 lg:p-10 border border-slate-200 shadow-card text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
            <Bot className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <span>Technical Role Practice</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 font-display">
              {DEMO_MODE
                ? 'Mock Technical Interview — Frontend Developer'
                : `Mock Interview${analysisInfo?.title ? ` — ${analysisInfo.title}` : ''}`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {DEMO_MODE
                ? 'Practice role-specific technical questions tailored for React and frontend engineering, evaluated on technical accuracy, structure, and communication clarity.'
                : 'Practice answering interview questions. Your answers are saved to your account; they are not scored automatically.'}
            </p>
          </div>

          {/* Key metadata tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto text-left">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Total Questions</span>
              <strong className="text-sm text-slate-900 font-display">{totalQuestions} Questions</strong>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Category</span>
              <strong className="text-sm text-slate-900 font-display">
                {DEMO_MODE ? 'Tech + Architecture' : source === 'custom' ? 'Custom' : 'Practice bank'}
              </strong>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Estimated Time</span>
              <strong className="text-sm text-slate-900 font-display">15 - 20 Mins</strong>
            </div>
          </div>

          {!DEMO_MODE && (
            <div className="max-w-md mx-auto text-left space-y-3">
              {analysisState === 'loading' && (
                <p className="text-xs text-slate-500 text-center">Loading your saved analysis...</p>
              )}
              {analysisState === 'none' && (
                <p className="text-xs text-slate-600 text-center">
                  Save a resume and job description analysis first.{' '}
                  <Link to="/analysis" className="text-blue-600 hover:underline font-semibold">
                    Go to Analysis
                  </Link>
                </p>
              )}
              {analysisState === 'error' && (
                <div className="text-center space-y-2">
                  <p className="text-xs text-rose-600">{analysisError}</p>
                  <button
                    type="button"
                    onClick={() => setAnalysisAttempt((n) => n + 1)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {analysisState === 'ready' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['bank', 'Practice question bank'],
                      ['custom', 'My own questions']
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        disabled={pendingSetup || isStarting}
                        onClick={() => setSource(key)}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                          source === key
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {source === 'bank' ? (
                    <p className="text-[11px] text-slate-500">
                      Sample practice questions (not generated from your resume).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500">
                        Write your own questions (at least 5 characters each, up to 20).
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={draftQuestion}
                          disabled={pendingSetup || isStarting}
                          onChange={(e) => setDraftQuestion(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomQuestion();
                            }
                          }}
                          placeholder="Type a question..."
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={addCustomQuestion}
                          disabled={pendingSetup || isStarting}
                          className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                      <ul className="space-y-1.5">
                        {customQuestions.map((text, i) => (
                          <li
                            key={i}
                            className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
                          >
                            <span>
                              <strong className="text-slate-500">{i + 1}.</strong> {text}
                            </span>
                            <button
                              type="button"
                              aria-label={`Remove question ${i + 1}`}
                              disabled={pendingSetup || isStarting}
                              onClick={() => setCustomQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {startError && (
            <p className="text-xs text-rose-600">{startError}</p>
          )}

          <div className="pt-2">
            {!DEMO_MODE && analysisState !== 'ready' ? null : totalQuestions === 0 ? (
              <p className="text-xs text-slate-500">
                {DEMO_MODE || source === 'bank' ? 'No practice questions available.' : 'Add at least one question to start.'}
              </p>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    if (DEMO_MODE) {
                      setHasStarted(true);
                      setCurrentQuestionIndex(0);
                    } else {
                      handleStartInterview();
                    }
                  }}
                  disabled={isStarting}
                  className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-subtle flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isStarting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>
                    {isStarting
                      ? 'Setting up...'
                      : pendingSetup
                      ? 'Retry Setup'
                      : DEMO_MODE
                      ? 'Start Interview Session'
                      : 'Start Interview'}
                  </span>
                </button>
                {pendingSetup && !isStarting && (
                  <button
                    type="button"
                    onClick={handleCancelSetup}
                    className="px-4 py-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : !currentQuestion ? (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center">
          <p className="text-xs text-slate-500">No practice questions available.</p>
        </div>
      ) : (
        /* Active Interview Screen */
        <div className="space-y-4">
          {/* Top Progress & Timer Bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-blue-700 uppercase tracking-wider text-[11px]">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="text-slate-500 font-normal">
                  {currentQuestion.type} Category
                </span>
              </div>
              <ProgressBar value={progressPercent} showPercentage={false} height="h-1.5" />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md border font-mono text-xs font-bold ${
                  timerSeconds < 30
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timerSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-xl p-5 lg:p-7 border border-slate-200 shadow-card space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {currentQuestion.title}
                </span>
                {currentQuestion.hint && (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide Guidance' : 'Show Guidance'}</span>
                </button>
                )}
              </div>
              <h3 className="text-base lg:text-lg font-bold text-slate-900 font-display leading-snug">
                "{currentQuestion.question}"
              </h3>
            </div>

            {/* Hint Callout */}
            {showHint && (
              <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-100 text-xs text-slate-700 space-y-1">
                <strong className="font-semibold text-blue-900">Evaluation Guide:</strong>
                <p className="leading-relaxed">{currentQuestion.hint}</p>
              </div>
            )}

            {/* Candidate Answer Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <label htmlFor="answer-input" className="font-medium text-slate-800">
                  Your Response:
                </label>
                {DEMO_MODE && (
                  <button
                    onClick={handleFillSample}
                    type="button"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-fill Sample Answer
                  </button>
                )}
              </div>

              <textarea
                id="answer-input"
                rows={7}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your structured answer here. Include relevant details on trade-offs, practical experiences, and architectural rationale..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs lg:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none leading-relaxed font-sans"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{currentAnswer.length} characters</span>
                <span>Click Submit Answer when complete</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSkipQuestion}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium border border-slate-300 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Skip Question</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {currentQuestionIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                    className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {currentQuestionIndex + 1 === totalQuestions
                      ? 'Submit & Finish Interview'
                      : 'Submit Answer'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
