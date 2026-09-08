import React from 'react';
import { Loader2, Sparkles, CheckCircle2, Search, Cpu, FileText, ArrowRight } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-card max-w-lg w-full p-8 rounded-2xl border border-brand-500/30 shadow-2xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Animated Spinner Icon */}
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <div className="absolute -inset-1 bg-brand-500/30 rounded-2xl blur-sm -z-10 animate-pulse" />
          </div>

          <h3 className="text-xl font-bold text-white font-display">
            Analyzing Your Resume...
          </h3>
          <p className="mt-2 text-sm text-brand-400 font-medium h-6 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-brand-400" />
            {statusMessage}
          </p>

          {/* Progress bar */}
          <div className="w-full mt-6 mb-8">
            <ProgressBar value={percent} showPercentage={true} color="bg-gradient-to-r from-brand-500 to-indigo-500" height="h-3" />
          </div>

          {/* Step tracker */}
          <div className="w-full space-y-2.5 text-left border-t border-slate-800/80 pt-5">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-brand-500/10 text-brand-300 border border-brand-500/30'
                      : isCompleted
                      ? 'text-slate-400 opacity-80'
                      : 'text-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isCurrent
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.id}
                  </div>
                  <span className="flex-1">{step.label}</span>
                  {isCurrent && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
