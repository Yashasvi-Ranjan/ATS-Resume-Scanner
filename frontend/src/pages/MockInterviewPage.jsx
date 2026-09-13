import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Play,
  Clock,
  HelpCircle,
  Sparkles,
  SkipForward,
  Send,
  Loader2,
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

      showToast(`Question ${currentQuestionIndex + 1} answer submitted!`, 'success');

      if (currentQuestionIndex + 1 < totalQuestions) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        showToast('All interview questions completed! Evaluating...', 'success');
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
              Mock Technical Interview — Frontend Developer
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Practice role-specific technical questions tailored for React and frontend engineering, evaluated on technical accuracy, structure, and communication clarity.
            </p>
          </div>

          {/* Key metadata tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto text-left">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Total Questions</span>
              <strong className="text-sm text-slate-900 font-display">8 Questions</strong>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Category</span>
              <strong className="text-sm text-slate-900 font-display">Tech + Architecture</strong>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Estimated Time</span>
              <strong className="text-sm text-slate-900 font-display">15 - 20 Mins</strong>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setHasStarted(true);
                setCurrentQuestionIndex(0);
              }}
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-subtle flex items-center justify-center gap-2 mx-auto transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Interview Session</span>
            </button>
          </div>
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
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide Guidance' : 'Show Guidance'}</span>
                </button>
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
                <button
                  onClick={handleFillSample}
                  type="button"
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Auto-fill Sample Answer
                </button>
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
                className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
