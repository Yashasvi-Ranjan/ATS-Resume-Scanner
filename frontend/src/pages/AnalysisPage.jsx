import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Loader2,
  RotateCcw,
  CheckCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mockApi } from '../services/mockApi';
import { api } from '../services/api';
import { presetJobDescriptions } from '../data/mockJobDescription';
import FileUploader from '../components/FileUploader';
import LoadingModal from '../components/LoadingModal';
import { DEMO_MODE } from '../config/demoMode';

export default function AnalysisPage() {
  const navigate = useNavigate();
  const {
    resumeFile,
    setResumeFile,
    jobDescription,
    setJobDescription,
    setAnalysisResult,
    fetchBackendHistory,
    showToast
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing scan...');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [requiredSkillsInput, setRequiredSkillsInput] = useState('');

  const inFlightRef = useRef(false);
  const savedAnalysisRef = useRef(null);
  const pendingJdRef = useRef(null);

  const jdText = jobDescription || '';

  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId);
    const preset = presetJobDescriptions.find((p) => p.id === presetId);
    if (preset) {
      setJobDescription(preset.content);
      setJobTitle(preset.title || '');
      setCompanyName(preset.company || '');
      showToast(`Loaded sample "${preset.title}" job description.`, 'info');
    }
  };

  const handleClearJD = () => {
    setJobDescription('');
    showToast('Job description cleared.', 'info');
  };

  const describeApiError = (err, step) => {
    let detail;
    if (Array.isArray(err?.errors) && err.errors.length > 0) {
      detail = err.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    } else if (err?.status === 401) {
      detail = 'Your session has expired. Please sign in again.';
    } else if (err?.status === 403) {
      detail = "You don't have access to that resume or job description.";
    } else if (err?.status === 404 && /resume not found/i.test(err.message || '')) {
      detail = 'The uploaded resume could not be found on the server. Please upload it again.';
      setResumeFile(null);
    } else if (!err?.status && err?.name === 'TypeError') {
      detail = 'Could not reach the server. Check your connection and try again.';
    } else {
      detail = err?.message || 'Something went wrong. Please try again.';
    }
    const prefix =
      step === 'jd'
        ? 'Could not save the job description: '
        : step === 'analysis'
        ? 'Job description saved, but the analysis request failed: '
        : '';
    return `${prefix}${detail}`;
  };

  const handleStartAnalysis = async () => {
    if (inFlightRef.current) return;

    if (DEMO_MODE) {
      if (!resumeFile) {
        showToast('Please upload your resume before continuing.', 'error');
        return;
      }
    } else if (!resumeFile?.id) {
      showToast('Please upload your resume to the server before continuing.', 'error');
      return;
    }
    if (!jdText || jdText.trim().length < 30) {
      showToast('Please provide a job description (at least 30 characters).', 'warning');
      return;
    }

    // DEMO_MODE only: local sample analysis, no backend writes.
    if (DEMO_MODE) {
      inFlightRef.current = true;
      setIsLoading(true);
      setLoadingStep(1);
      setLoadingPercent(10);
      setLoadingMessage('Reading resume file...');
      try {
        const result = await mockApi.analyzeResume(
          resumeFile,
          jdText,
          ({ step, percent, message }) => {
            setLoadingStep(step);
            setLoadingPercent(percent);
            setLoadingMessage(message);
          }
        );
        setAnalysisResult(result.data);
        showToast('Demo analysis loaded (sample data, not saved).', 'info');
        navigate('/analysis/results');
      } catch (err) {
        showToast(err.message || 'Analysis failed. Please try again.', 'error');
      } finally {
        inFlightRef.current = false;
        setIsLoading(false);
      }
      return;
    }

    const title = jobTitle.trim();
    const company = companyName.trim();
    const description = jdText.trim();
    const requiredSkills = requiredSkillsInput
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (title.length < 2) {
      showToast('Please enter the job title (at least 2 characters).', 'warning');
      return;
    }
    if (requiredSkills.length === 0) {
      showToast('Please enter at least one required skill (comma-separated).', 'warning');
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);

    const jdFingerprint = JSON.stringify([title, company, requiredSkills, description]);
    const fullFingerprint = JSON.stringify([resumeFile.id, jdFingerprint]);

    try {
      // Same inputs already saved: go to the existing analysis instead of duplicating it.
      const existing = savedAnalysisRef.current;
      if (existing && existing.fingerprint === fullFingerprint) {
        showToast('This analysis request was already saved.', 'info');
        navigate(`/analysis/results/${existing.analysisId}`);
        return;
      }

      // Reuse a previously saved JD if an earlier attempt failed after creating it.
      let jdId;
      const pending = pendingJdRef.current;
      if (pending && pending.fingerprint === jdFingerprint) {
        jdId = pending.id;
      } else {
        pendingJdRef.current = null;
        let savedJd;
        try {
          const jdPayload = { title, description, requiredSkills };
          if (company) jdPayload.companyName = company;
          const jdResponse = await api.jobDescriptions.create(jdPayload);
          savedJd = jdResponse?.data ?? jdResponse;
          if (!savedJd?.id) {
            throw new Error('The server did not return a job description id.');
          }
        } catch (err) {
          showToast(describeApiError(err, 'jd'), 'error');
          return;
        }
        jdId = savedJd.id;
        pendingJdRef.current = { id: jdId, fingerprint: jdFingerprint };
      }

      let created;
      try {
        // No scores are sent: the backend stores them as null until scoring exists.
        const analysisResponse = await api.analyses.create({
          resumeId: resumeFile.id,
          jobDescriptionId: jdId
        });
        created = analysisResponse?.data ?? analysisResponse;
        if (!created?.id) {
          throw new Error('The server did not return an analysis id.');
        }
      } catch (err) {
        showToast(describeApiError(err, 'analysis'), 'error');
        return;
      }

      pendingJdRef.current = null;
      savedAnalysisRef.current = { fingerprint: fullFingerprint, analysisId: created.id };

      setAnalysisResult({
        id: created.id,
        jobTitle: title,
        company: company || '',
        scanDate: new Date().toISOString().split('T')[0],
        fileName: resumeFile.name,
        overallScore: null,
        verdict: null,
        explanation: null,
        breakdown: [],
        strengths: [],
        improvements: [],
        learnAndAdd: [],
        status: created.status || 'PENDING'
      });
      showToast('Analysis saved. Scoring is not available yet.', 'success');
      navigate(`/analysis/results/${created.id}`);

      if (fetchBackendHistory) {
        Promise.resolve(fetchBackendHistory()).catch(console.error);
      }
    } finally {
      inFlightRef.current = false;
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
          {DEMO_MODE
            ? 'Upload your resume and paste the target job description to generate an explainable ATS match score.'
            : 'Save your resume and job description. Scoring is not available yet.'}
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
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {DEMO_MODE ? 'Ready to scan' : 'Ready to save'}
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
                <option value="">Select a sample...</option>
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
            {!DEMO_MODE && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Frontend Developer"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Company (optional)</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Required Skills</label>
                  <input
                    type="text"
                    value={requiredSkillsInput}
                    onChange={(e) => setRequiredSkillsInput(e.target.value)}
                    placeholder="Comma-separated, e.g. React, SQL"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
            <textarea
              rows={8}
              value={jdText}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste complete job description here, including responsibilities, required skills, and qualification requirements..."
              className="w-full bg-white border border-slate-300 rounded-lg p-3.5 text-xs lg:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono leading-relaxed"
            />

            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Characters: <strong className="text-slate-800">{jdText.length}</strong></span>
                {jdText.length < 30 && (
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
            {isLoading && !DEMO_MODE ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <span>{DEMO_MODE ? 'Analyze Resume' : 'Save Analysis Request'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Modal (demo mode only) */}
      <LoadingModal
        isOpen={DEMO_MODE && isLoading}
        currentStep={loadingStep}
        percent={loadingPercent}
        statusMessage={loadingMessage}
      />
    </div>
  );
}
