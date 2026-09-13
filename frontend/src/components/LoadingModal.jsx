import React from 'react';
import { Loader2, CheckCircle2, FileText, Search, Cpu, Sparkles } from 'lucide-react';
import ProgressBar from './ProgressBar';

export default function LoadingModal({ isOpen, currentStep = 1, percent = 0, statusMessage = "Analyzing your resume..." }) {
  if (!isOpen) return null;

  const steps = [
    { id: 1, label: "Reading resume file", icon: FileText },
    { id: 2, label: "Extracting skills & background", icon: Search },
    { id: 3, label: "Comparing with Job Description", icon: Cpu },
    { id: 4, label: "Identifying skill gaps", icon: Sparkles },
    { id: 5, label: "Generating ATS Match Report", icon: CheckCircle2 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white max-w-md w-full p-6 lg:p-7 rounded-2xl border border-slate-200 shadow-elevated relative">
        <div className="flex flex-col items-center text-center">
          {/* Spinner Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 font-display">
            Analyzing Resume
          </h3>
          <p className="mt-1 text-xs text-slate-500 font-medium h-5 flex items-center justify-center gap-1.5">
            {statusMessage}
          </p>

          {/* Progress bar */}
          <div className="w-full mt-4 mb-6">
            <ProgressBar value={percent} showPercentage={true} height="h-2" color="bg-blue-600" />
          </div>

          {/* Step tracker */}
          <div className="w-full space-y-2 text-left border-t border-slate-100 pt-4">
            {steps.map((step) => {
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-blue-50 text-blue-800 font-semibold'
                      : isCompleted
                      ? 'text-slate-500'
                      : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : step.id}
                  </div>
                  <span className="flex-1">{step.label}</span>
                  {isCurrent && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
