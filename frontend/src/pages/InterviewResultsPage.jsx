import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Award,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Bot,
  Brain,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import CircularScore from '../components/CircularScore';
import ProgressBar from '../components/ProgressBar';

export default function InterviewResultsPage() {
  const navigate = useNavigate();
  const { interviewResults, setCurrentQuestionIndex } = useApp();

  const handleRetake = () => {
    setCurrentQuestionIndex(0);
    navigate('/mock-interview');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Interview Evaluation Report Completed</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-white font-display">
            Mock Interview Results — {interviewResults.role}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluated for: <strong className="text-slate-200">{interviewResults.company}</strong> • Answered: <strong className="text-slate-200">{interviewResults.completedQuestions} of {interviewResults.totalQuestions} questions</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRetake}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Interview Again</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Main Score & Performance Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Score gauge */}
        <div className="lg:col-span-4 glass-card rounded-2xl p-8 border border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
          <CircularScore score={interviewResults.overallScore} size={170} label="Interview Score" subtitle="Passed Evaluation" />
          <div>
            <span className="text-sm font-bold text-white block">
              76 / 100 Overall Score
            </span>
            <span className="text-xs text-slate-400">
              Ready for technical phone screens
            </span>
          </div>
        </div>

        {/* Category Breakdown list */}
        <div className="lg:col-span-8 glass-card rounded-2xl p-6 lg:p-7 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Evaluation Competency Breakdown
              </h3>
              <p className="text-xs text-slate-400">
                Performance across technical depth, articulation, and problem solving
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Target: &gt;70%</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {interviewResults.categories.map((cat) => (
              <div key={cat.name} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{cat.name}</span>
                  <span className={`font-bold font-display text-sm ${cat.color}`}>{cat.score}%</span>
                </div>
                <ProgressBar value={cat.score} showPercentage={false} color={cat.bg} />
              </div>
            ))}
          </div>

          {/* Qualitative Performance Summary */}
          <div className="p-4 rounded-xl bg-brand-950/20 border border-brand-500/20 text-xs text-slate-300 leading-relaxed">
            <strong className="text-brand-300 font-semibold block mb-1">
              Evaluator Summary:
            </strong>
            {interviewResults.summary}
          </div>
        </div>
      </div>

      {/* Strong Areas vs Weak Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strong Areas */}
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/20 bg-emerald-950/5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white font-display">
              Demonstrated Strengths
            </h3>
          </div>
          <div className="space-y-3">
            {interviewResults.strongAreas.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <h4 className="text-xs font-bold text-emerald-300">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Areas */}
        <div className="glass-card rounded-2xl p-6 border border-amber-500/20 bg-amber-950/5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white font-display">
              Areas to Revise & Deepen
            </h3>
          </div>
          <div className="space-y-3">
            {interviewResults.weakAreas.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <h4 className="text-xs font-bold text-amber-300">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question-by-Question Feedback & Revision Topics */}
      <div className="glass-card rounded-2xl p-6 lg:p-7 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white font-display">
              Detailed Question-by-Question Feedback
            </h3>
            <p className="text-xs text-slate-400">
              Review specific questions where scores were docked and practice target revision topics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interviewResults.questionsReview.map((item) => (
            <div
              key={item.questionId}
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Question #{item.questionId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      item.score >= 80
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : item.score >= 70
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    Score: {item.score}% ({item.verdict})
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-200">
                  "{item.question}"
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  {item.feedback}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <span className="text-[11px] text-brand-300 font-medium flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span>Revision: {item.revisionTopic}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
