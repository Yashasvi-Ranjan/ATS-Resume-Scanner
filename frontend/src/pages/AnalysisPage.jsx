import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSearch,
  Sparkles,
  Briefcase,
  Layers,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  FileText,
  HelpCircle,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mockApi } from '../services/mockApi';
import { presetJobDescriptions } from '../data/mockJobDescription';
import FileUploader from '../components/FileUploader';
import LoadingModal from '../components/LoadingModal';

export default function AnalysisPage() {
  const navigate = useNavigate();
  const {
    resumeFile,
    setResumeFile,
    jobDescription,
    setJobDescription,
    setAnalysisResult,
    showToast
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing scan...');
  const [selectedPreset, setSelectedPreset] = useState('jd-1');

  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId);
    const preset = presetJobDescriptions.find((p) => p.id === presetId);
    if (preset) {
      setJobDescription(preset.content);
      showToast(`Loaded "${preset.title}" job description.`, 'info');
    }
  };

  const handleClearJD = () => {
    setJobDescription('');
    showToast('Job description cleared.', 'info');
  };

  const handleStartAnalysis = async () => {
    if (!resumeFile) {
      showToast('Please upload your resume before continuing.', 'error');
      return;
    }
    if (!jobDescription || jobDescription.trim().length < 30) {
      showToast('Please provide a job description (at least 30 characters).', 'warning');
      return;
    }

    setIsLoading(true);
    setLoadingStep(1);
    setLoadingPercent(10);
    setLoadingMessage('Reading resume file...');

    try {
      const result = await mockApi.analyzeResume(
        resumeFile,
        jobDescription,
        ({ step, percent, message }) => {
          setLoadingStep(step);
          setLoadingPercent(percent);
          setLoadingMessage(message);
        }
      );

      setAnalysisResult(result.data);
      showToast('ATS Analysis completed successfully!', 'success');
      navigate('/analysis/results');
    } catch (err) {
      showToast(err.message || 'Analysis failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center sm:text-left space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5" />
          <span>Two-Step ATS Match Scanner</span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-extrabold text-white font-display">
          Resume + Job Description Analysis
        </h2>
        <p className="text-sm text-slate-400">
          Upload your resume and provide target job requirements to generate an explainable, multi-factor match score and skill gap breakdown.
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Resume Upload */}
        <div className="glass-card rounded-2xl p-6 lg:p-7 border border-slate-800">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold font-display">
                1
              </span>
              <div>
                <h3 className="text-base font-bold text-white">
                  Upload Candidate Resume
                </h3>
                <p className="text-xs text-slate-400">
                  Select or drag your PDF/DOCX resume file
                </p>
              </div>
            </div>
            {resumeFile && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Ready to parse
              </span>
            )}
          </div>

          <FileUploader
            currentFile={resumeFile}
            onFileSelected={(file) => {
              setResumeFile(file);
              showToast(`Loaded ${file.name}`, 'success');
            }}
            onFileRemoved={() => {
              setResumeFile(null);
              showToast('Resume removed. Please select or upload a resume.', 'warning');
            }}
            onError={(msg) => showToast(msg, 'error')}
          />
        </div>

        {/* Step 2: Job Description */}
        <div className="glass-card rounded-2xl p-6 lg:p-7 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-800 gap-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold font-display">
                2
              </span>
              <div>
                <h3 className="text-base font-bold text-white">
                  Paste Job Description
                </h3>
                <p className="text-xs text-slate-400">
                  Provide the target job posting to compare against
                </p>
              </div>
            </div>

            {/* Presets selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Sample JD:</span>
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-brand-500 focus:outline-none"
              >
                {presetJobDescriptions.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.title} ({preset.company})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-3">
            <textarea
              rows={9}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste complete job description here, including responsibilities, required skills, and qualification requirements..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 text-xs lg:text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none font-mono leading-relaxed"
            />

            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Character Count: <strong className="text-slate-200">{jobDescription.length}</strong></span>
                {jobDescription.length < 30 && (
                  <span className="text-rose-400 text-[11px]">(Minimum 30 characters required)</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearJD}
                className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Analyze Button */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze Resume</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading Modal */}
      <LoadingModal
        isOpen={isLoading}
        currentStep={loadingStep}
        percent={loadingPercent}
        statusMessage={loadingMessage}
      />
    </div>
  );
}
