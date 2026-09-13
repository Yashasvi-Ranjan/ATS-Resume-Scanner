import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  FileText
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
      showToast(`Loaded sample "${preset.title}" job description.`, 'info');
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-900 font-display">
          Resume & Job Description Analysis
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Upload your resume and paste the target job description to generate an explainable ATS match score.
        </p>
      </div>

      <div className="space-y-5">
        {/* Step 1: Resume Upload */}
        <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-display">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Upload Candidate Resume
                </h3>
                <p className="text-xs text-slate-500">
                  Select or drag your PDF/DOCX resume file
                </p>
              </div>
            </div>
            {resumeFile && (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Ready to scan
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
        <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-100 gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-display">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Target Job Description
                </h3>
                <p className="text-xs text-slate-500">
                  Paste the requirements and responsibilities for the target position
                </p>
              </div>
            </div>

            {/* Presets selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Sample JD:</span>
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
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
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste complete job description here, including responsibilities, required skills, and qualification requirements..."
              className="w-full bg-white border border-slate-300 rounded-lg p-3.5 text-xs lg:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono leading-relaxed"
            />

            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Characters: <strong className="text-slate-800">{jobDescription.length}</strong></span>
                {jobDescription.length < 30 && (
                  <span className="text-rose-600 text-[11px]">(Minimum 30 characters required)</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearJD}
                className="text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Analyze Button */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={isLoading}
            className="w-full sm:w-auto px-7 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-subtle flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
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
