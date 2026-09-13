import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-0.5">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Interview Evaluation Report</span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">
            Mock Interview Results — {interviewResults.role}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluated for: <strong className="text-slate-800">{interviewResults.company}</strong> • Answered: <strong className="text-slate-800">{interviewResults.completedQuestions} of {interviewResults.totalQuestions} questions</strong>
          </p>
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
          <CircularScore score={interviewResults.overallScore} size={150} label="Interview Score" subtitle="Passed Evaluation" />
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              76 / 100 Overall Score
            </span>
            <span className="text-[11px] text-slate-500">
              Ready for technical phone screens
            </span>
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
            <span className="text-xs font-semibold text-slate-400">Benchmark: &gt;70%</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {interviewResults.categories.map((cat) => (
              <div key={cat.name} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{cat.name}</span>
                  <span className="font-bold font-display text-slate-900">{cat.score}%</span>
                </div>
                <ProgressBar value={cat.score} showPercentage={false} height="h-1.5" />
              </div>
            ))}
          </div>

          {/* Qualitative Performance Summary */}
          <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-slate-700 leading-relaxed">
            <strong className="text-blue-900 font-semibold block mb-0.5">
              Evaluator Summary:
            </strong>
            {interviewResults.summary}
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
            {interviewResults.strongAreas.map((item, idx) => (
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
            {interviewResults.weakAreas.map((item, idx) => (
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
          {interviewResults.questionsReview.map((item) => (
            <div
              key={item.questionId}
              className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Question #{item.questionId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      item.score >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.score >= 70
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    Score: {item.score}% ({item.verdict})
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-900">
                  "{item.question}"
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {item.feedback}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-200/80">
                <span className="text-[11px] text-blue-700 font-medium flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Topic: {item.revisionTopic}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
