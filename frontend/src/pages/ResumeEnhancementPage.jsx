import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Check,
  X,
  RotateCw,
  Download,
  ArrowRight,
  Bot,
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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const activeSection = enhancementData.sections.find((s) => s.id === activeSectionId) || enhancementData.sections[0];

  const handleRegenerate = async (sectionId) => {
    setIsRegenerating(true);
    try {
      await mockApi.regenerateSection(sectionId);
      showToast('Regenerated phrasing with targeted keywords and metrics.', 'success');
    } catch (err) {
      showToast('Failed to regenerate section.', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    showToast('Copied text to clipboard.', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadResume = () => {
    showToast('Preparing your enhanced ATS-optimized resume...', 'info');
    setTimeout(() => {
      showToast('Enhanced Resume (Sarah_Johnson_Enhanced.pdf) generated!', 'success');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Grounded AI Resume Enhancement</span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">
            Resume Enhancement & Phrasing Optimization
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target Role: <strong className="text-slate-800">{enhancementData.targetRole}</strong> • Candidate: <strong className="text-slate-800">{enhancementData.candidateName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadResume}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Enhanced Resume</span>
          </button>
          <button
            onClick={() => navigate('/mock-interview')}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-blue-600" />
            <span>Practice Interview</span>
          </button>
        </div>
      </div>

      {/* Mandatory No-Fabrication Trust Banner */}
      <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <span className="font-bold text-slate-900">
            Strict No-Fabrication Policy
          </span>
          <p className="text-slate-600 leading-relaxed">
            {enhancementData.noticeText}
          </p>
        </div>
      </div>

      {/* Section Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {enhancementData.sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSectionId(sec.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSectionId === sec.id
                ? 'bg-blue-600 text-white shadow-subtle'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>{sec.name}</span>
            {sec.status === 'accepted' && <Check className="w-3 h-3 text-emerald-300" />}
            {sec.status === 'rejected' && <X className="w-3 h-3 text-rose-300" />}
          </button>
        ))}
      </div>

      {/* Main Diff Comparison Workspace */}
      <div className="space-y-4">
        {/* Section Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">
              {activeSection.name}
            </h3>
            <p className="text-xs text-slate-500">
              Compare original phrasing with ATS-optimized, high-impact phrasing
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRegenerate(activeSection.id)}
              disabled={isRegenerating}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-blue-600' : ''}`} />
              <span>Regenerate Phrasing</span>
            </button>
          </div>
        </div>

        {/* Multi-bullet vs Single Block Rendering */}
        {activeSection.items ? (
          /* Multi-bullet Experience / Projects */
          <div className="space-y-3.5">
            {activeSection.items.map((bullet, index) => (
              <div
                key={bullet.id}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b border-slate-100 pb-2">
                  <span>Bullet Point #{index + 1}</span>
                  <div className="flex items-center gap-2">
                    {bullet.status === 'accepted' && (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Accepted
                      </span>
                    )}
                    {bullet.status === 'rejected' && (
                      <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                        <X className="w-3 h-3 text-rose-600" /> Rejected
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                  {/* Original */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Original Phrasing
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-mono">
                      "{bullet.original}"
                    </p>
                  </div>

                  {/* Enhanced */}
                  <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200 space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Enhanced Impact (ATS Optimized)
                      </span>
                      <button
                        onClick={() => handleCopyText(bullet.enhanced, bullet.id)}
                        className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === bullet.id ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-900 leading-relaxed font-medium">
                      "{bullet.enhanced}"
                    </p>
                  </div>
                </div>

                {/* Accept / Reject actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => updateBulletStatus(activeSection.id, bullet.id, 'rejected')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                      bullet.status === 'rejected'
                        ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                        : 'border-slate-300 text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => updateBulletStatus(activeSection.id, bullet.id, 'accepted')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                      bullet.status === 'accepted'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                        : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Suggestion</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single block (Summary, Skills, Education, Certifications) */
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Original block */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Original Resume Text
                </span>
                <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-mono">
                  {activeSection.original}
                </div>
              </div>

              {/* Enhanced block */}
              <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Enhanced Phrasing
                  </span>
                  <button
                    onClick={() => handleCopyText(activeSection.enhanced, activeSection.id)}
                    className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                    title="Copy text"
                  >
                    {copiedId === activeSection.id ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-slate-900 whitespace-pre-line leading-relaxed font-medium">
                  {activeSection.enhanced}
                </div>
              </div>
            </div>

            {/* Improvement Highlights */}
            {activeSection.improvements && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Why this enhancement scores higher:
                </span>
                <ul className="space-y-1">
                  {activeSection.improvements.map((imp, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => updateSectionStatus(activeSection.id, 'rejected')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
                  activeSection.status === 'rejected'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'border-slate-300 text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => updateSectionStatus(activeSection.id, 'accepted')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
                  activeSection.status === 'accepted'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-blue-600 border-transparent text-white hover:bg-blue-700'
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
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate('/gap-analysis')}
          className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          ← Back to Gap Analysis
        </button>
        <button
          onClick={() => navigate('/mock-interview')}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-1.5 transition-colors"
        >
          <span>Proceed to Mock Interview</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
