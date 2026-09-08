import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  RotateCcw,
  SkipForward,
  Send,
  Loader2,
  FileCheck,
  ChevronLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mockApi } from '../services/mockApi';
import ProgressBar from '../components/ProgressBar';

export default function MockInterviewPage() {
  const navigate = useNavigate();
  const {
    interviewQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    interviewAnswers,
    setInterviewAnswers,
    showToast
  } = useApp();

  const [hasStarted, setHasStarted] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [showHint, setShowHint] = useState(false);

  const currentQuestion = interviewQuestions[currentQuestionIndex] || interviewQuestions[0];
  const totalQuestions = interviewQuestions.length;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

  // Load existing answer when navigating between questions
  useEffect(() => {
    if (hasStarted) {
      setCurrentAnswer(interviewAnswers[currentQuestion.id] || '');
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

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleFillSample = () => {
    if (currentQuestion.sampleAnswer) {
      setCurrentAnswer(currentQuestion.sampleAnswer);
      showToast('Sample answer populated for demo.', 'info');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer || currentAnswer.trim().length === 0) {
      showToast('Please provide an answer before submitting.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await mockApi.submitInterviewAnswer(currentQuestion.id, currentAnswer);
      
      // Save answer in state
      setInterviewAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: currentAnswer
      }));

      showToast(`Question ${currentQuestionIndex + 1} answer submitted successfully!`, 'success');

      if (currentQuestionIndex + 1 < totalQuestions) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        showToast('All interview questions completed! Evaluating results...', 'success');
        navigate('/mock-interview/results');
      }
    } catch (err) {
      showToast(err.message || 'Submission error.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipQuestion = () => {
    showToast(`Skipped question ${currentQuestionIndex + 1}.`, 'info');
    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      navigate('/mock-interview/results');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {!hasStarted ? (
        /* Start Screen */
        <div className="glass-card rounded-2xl p-8 lg:p-12 border border-slate-800 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-brand-500/25">
            <Bot className="w-10 h-10" />
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
              <span>Interactive Technical Evaluation</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white font-display">
              Mock Interview — Frontend Developer
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Test your technical knowledge, communication clarity, and problem-solving readiness against real interview questions tailored for React & Frontend engineering roles.
            </p>
          </div>

          {/* Key metadata tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-left">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 block">Total Questions</span>
              <strong className="text-lg text-white font-display">8 Questions</strong>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 block">Question Types</span>
              <strong className="text-lg text-white font-display">Tech + Behavioral</strong>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 block">Estimated Time</span>
              <strong className="text-lg text-white font-display">15 - 20 Mins</strong>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                setHasStarted(true);
                setCurrentQuestionIndex(0);
              }}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-brand-500/25 flex items-center justify-center gap-3 mx-auto transition-all active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Interview</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Interview Runner Screen */
        <div className="space-y-6">
          {/* Top Progress & Timer Bar */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-brand-400 uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="text-slate-400">
                  {currentQuestion.type} Category
                </span>
              </div>
              <ProgressBar value={progressPercent} showPercentage={false} height="h-2" />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                  timerSeconds < 30
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timerSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className="glass-card rounded-2xl p-6 lg:p-8 border border-slate-800 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {currentQuestion.title}
                </span>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide Hint' : 'Show Answer Hint'}</span>
                </button>
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-white font-display leading-snug">
                "{currentQuestion.question}"
              </h3>
            </div>

            {/* Hint Callout */}
            {showHint && (
              <div className="p-4 rounded-xl bg-brand-950/30 border border-brand-500/30 text-xs text-brand-300 space-y-1 animate-in fade-in">
                <strong className="font-semibold text-white">💡 Evaluation Guide:</strong>
                <p className="leading-relaxed">{currentQuestion.hint}</p>
              </div>
            )}

            {/* Candidate Answer Textarea */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label htmlFor="answer-input" className="font-medium text-slate-300">
                  Your Answer:
                </label>
                <button
                  onClick={handleFillSample}
                  type="button"
                  className="text-[11px] text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3" /> Auto-fill Sample Answer
                </button>
              </div>

              <textarea
                id="answer-input"
                rows={7}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your structured answer here. Speak to your practical experience, best practices, and trade-offs..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 text-xs lg:text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none leading-relaxed font-sans"
              />

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{currentAnswer.length} characters typed</span>
                <span>Press Submit when you are finished</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSkipQuestion}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                <span>Skip Question</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {currentQuestionIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                    className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
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
