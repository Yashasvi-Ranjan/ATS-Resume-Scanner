import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Check,
  X,
  RotateCw,
  Download,
  FileCheck2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  Bot,
  Layers,
  Copy,
  CheckCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mockApi } from '../services/mockApi';

export default function ResumeEnhancementPage() {
  const navigate = useNavigate();
  const {
    enhancementData,
    updateSectionStatus,
    updateBulletStatus,
    showToast
  } = useApp();

  const [activeSectionId, setActiveSectionId] = useState('summary');
  const [viewMode, setViewMode] = useState('split'); // 'split', 'original', 'enhanced'
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const activeSection = enhancementData.sections.find((s) => s.id === activeSectionId) || enhancementData.sections[0];

  const handleRegenerate = async (sectionId) => {
    setIsRegenerating(true);
    try {
      await mockApi.regenerateSection(sectionId);
      showToast('Regenerated section with targeted keywords and metrics.', 'success');
    } catch (err) {
      showToast('Failed to regenerate section.', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    showToast('Copied enhanced text to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadResume = () => {
    showToast('Preparing your enhanced ATS-optimized PDF resume...', 'info');
    setTimeout(() => {
      showToast('Enhanced Resume (Sarah_Johnson_Enhanced.pdf) generated & downloaded!', 'success');
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI Resume Optimization & Verification</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-white font-display">
            Resume Enhancement
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Target Role: <strong className="text-slate-200">{enhancementData.targetRole}</strong> • Candidate: <strong className="text-slate-200">{enhancementData.candidateName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadResume}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Enhanced Resume</span>
          </button>
          <button
            onClick={() => navigate('/mock-interview')}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all"
          >
            <Bot className="w-4 h-4" />
            <span>Practice Interview</span>
          </button>
        </div>
      </div>

      {/* Mandatory No-Fabrication Trust Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-brand-500/40 flex items-start gap-3.5 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-slate-100">
            Strict No-Fabrication Principle
          </span>
          <p className="text-slate-400 leading-relaxed">
            {enhancementData.noticeText}
          </p>
        </div>
      </div>

      {/* Section Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {enhancementData.sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSectionId(sec.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSectionId === sec.id
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>{sec.name}</span>
            {sec.status === 'accepted' && <Check className="w-3.5 h-3.5 text-emerald-300" />}
            {sec.status === 'rejected' && <X className="w-3.5 h-3.5 text-rose-300" />}
          </button>
        ))}
      </div>

      {/* Main Diff Comparison Workspace */}
      <div className="space-y-6">
        {/* Section Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white font-display">
              {activeSection.name}
            </h3>
            <p className="text-xs text-slate-400">
              Compare original phrasing with ATS-optimized, high-impact phrasing
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRegenerate(activeSection.id)}
              disabled={isRegenerating}
              className="px-3 py-1.5 rounded-lg glass-card hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-brand-400' : ''}`} />
              <span>Regenerate Phrasing</span>
            </button>
          </div>
        </div>

        {/* Multi-bullet vs Single Block Rendering */}
        {activeSection.items ? (
          /* Multi-bullet Experience / Projects */
          <div className="space-y-4">
            {activeSection.items.map((bullet, index) => (
              <div
                key={bullet.id}
                className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/80 pb-2">
                  <span>Bullet Point #{index + 1}</span>
                  <div className="flex items-center gap-2">
                    {bullet.status === 'accepted' && (
                      <span className="text-emerald-400 text-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Accepted
                      </span>
                    )}
                    {bullet.status === 'rejected' && (
                      <span className="text-rose-400 text-xs flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Rejected
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Original */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Original Phrasing
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">
                      "{bullet.original}"
                    </p>
                  </div>

                  {/* Enhanced */}
                  <div className="p-4 rounded-xl bg-brand-950/20 border border-brand-500/30 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Enhanced Impact (ATS Optimized)
                      </span>
                      <button
                        onClick={() => handleCopyText(bullet.enhanced, bullet.id)}
                        className="text-slate-400 hover:text-brand-300 p-1"
                        title="Copy text"
                      >
                        {copiedId === bullet.id ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-emerald-300 leading-relaxed font-medium">
                      "{bullet.enhanced}"
                    </p>
                  </div>
                </div>

                {/* Accept / Reject actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => updateBulletStatus(activeSection.id, bullet.id, 'rejected')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                      bullet.status === 'rejected'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => updateBulletStatus(activeSection.id, bullet.id, 'accepted')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                      bullet.status === 'accepted'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'border-brand-500/40 bg-brand-500/10 text-brand-300 hover:bg-brand-500 hover:text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Change</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single block (Summary, Skills, Education, Certifications) */
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original block */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Original Resume Text
                  </span>
                </div>
                <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-900">
                  {activeSection.original}
                </div>
              </div>

              {/* Enhanced block */}
              <div className="p-5 rounded-xl bg-brand-950/20 border border-brand-500/30 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Enhanced Phrasing
                  </span>
                  <button
                    onClick={() => handleCopyText(activeSection.enhanced, activeSection.id)}
                    className="text-slate-400 hover:text-brand-300 p-1"
                    title="Copy text"
                  >
                    {copiedId === activeSection.id ? (
                      <CheckCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-emerald-300 whitespace-pre-line leading-relaxed font-medium bg-slate-950/80 p-3 rounded-lg border border-brand-500/20">
                  {activeSection.enhanced}
                </div>
              </div>
            </div>

            {/* Improvement Highlights */}
            {activeSection.improvements && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Why this enhancement scores higher:
                </span>
                <ul className="space-y-1.5">
                  {activeSection.improvements.map((imp, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => updateSectionStatus(activeSection.id, 'rejected')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                  activeSection.status === 'rejected'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => updateSectionStatus(activeSection.id, 'accepted')}
                className={`px-5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                  activeSection.status === 'accepted'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-brand-600 border-transparent text-white hover:bg-brand-500'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept Enhanced Section</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Next Flow Step Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => navigate('/gap-analysis')}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          ← Back to Gap Analysis
        </button>
        <button
          onClick={() => navigate('/mock-interview')}
          className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <span>Proceed to Mock Interview</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
