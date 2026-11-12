import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { describeApiError } from '../utils/errors';
import { buildAnalysisSummary } from '../utils/analysis';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import FileUploader from '../components/FileUploader';
import ResumeParsedPanel from '../components/ResumeParsedPanel';
import JdParsedPanel from '../components/JdParsedPanel';

const inputCls =
  'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none';

export default function AnalysisPage() {
  const navigate = useNavigate();
  const {
    resumeFile,
    setResumeFile,
    jobDescription,
    setJobDescription,
    activeJd,
    setActiveJd,
    analysisResult,
    setAnalysisResult,
    fetchBackendHistory,
    showToast
  } = useApp();

  const [jobTitle, setJobTitle] = useState(activeJd?.title || '');
  const [companyName, setCompanyName] = useState(activeJd?.companyName || '');
  const [skillsInput, setSkillsInput] = useState('');
  const [savingJd, setSavingJd] = useState(false);
  const [starting, setStarting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [runError, setRunError] = useState(null);
  const [runId, setRunId] = useState(
    analysisResult && (analysisResult.status === 'PENDING' || analysisResult.status === 'PROCESSING')
      ? analysisResult.id
      : null
  );
  const inFlight = useRef(false);
  const navigatedFor = useRef(null);

  const jdText = jobDescription || '';
  const fingerprint = JSON.stringify([jobTitle.trim(), companyName.trim(), skillsInput.trim(), jdText.trim()]);
  const jdUpToDate = activeJd && activeJd.fingerprint === fingerprint;

  const { analysis, error: pollError, timedOut, isPolling, restart } = useAnalysisPolling(runId);
  const status = analysis?.status || (runId ? 'PENDING' : null);

  // react to terminal states
  useEffect(() => {
    if (!analysis) return;
    setAnalysisResult(buildAnalysisSummary(analysis));
    if (analysis.status === 'COMPLETED' && navigatedFor.current !== analysis.id) {
      navigatedFor.current = analysis.id;
      showToast('Analysis complete.', 'success');
      if (fetchBackendHistory) Promise.resolve(fetchBackendHistory()).catch(() => {});
      navigate(`/analysis/results/${analysis.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  const handleSaveJd = async () => {
    if (inFlight.current) return;
    const title = jobTitle.trim();
    if (title.length < 2) return showToast('Please enter the job title (at least 2 characters).', 'warning');
    if (jdText.trim().length < 30) return showToast('Please paste the job description (at least 30 characters).', 'warning');
    inFlight.current = true;
    setSavingJd(true);
    try {
      const payload = { title, description: jdText.trim(), parse: true };
      if (companyName.trim()) payload.companyName = companyName.trim();
      const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
      if (skills.length) payload.requiredSkills = skills;
      const res = await api.jobDescriptions.create(payload);
      const jd = res?.data;
      if (!jd?.id) throw new Error('The server did not return a job description id.');
      setActiveJd({
        id: jd.id,
        title: jd.title,
        companyName: jd.companyName || '',
        parseStatus: jd.parseStatus || 'NOT_PARSED',
        parseError: jd.parseError || null,
        fingerprint
      });
      setRunId(null);
      setRunError(null);
    } catch (err) {
      showToast(describeApiError(err), 'error');
    } finally {
      inFlight.current = false;
      setSavingJd(false);
    }
  };

  const handleStart = async () => {
    if (inFlight.current) return;
    if (!resumeFile?.id) return showToast('Please upload your resume first.', 'warning');
    if (!activeJd?.id) return showToast('Please save the job description first.', 'warning');
    inFlight.current = true;
    setStarting(true);
    setRunError(null);
    try {
      const res = await api.analyses.create({ resumeId: resumeFile.id, jobDescriptionId: activeJd.id });
      const rec = res?.data;
      if (!rec?.id) throw new Error('The server did not return an analysis id.');
      navigatedFor.current = null;
      setAnalysisResult(buildAnalysisSummary(rec));
      setRunId(rec.id);
    } catch (err) {
      setRunError(describeApiError(err));
      if (err?.status === 404 && /resume/i.test(err.message || '')) setResumeFile(null);
    } finally {
      inFlight.current = false;
      setStarting(false);
    }
  };

  const handleRetry = async () => {
    if (!runId || retrying) return;
    setRetrying(true);
    try {
      await api.analyses.retry(runId);
      navigatedFor.current = null;
      restart();
    } catch (err) {
      setRunError(describeApiError(err));
    } finally {
      setRetrying(false);
    }
  };

  const busyRun = starting || status === 'PENDING' || status === 'PROCESSING';
  const canStart =
    !!resumeFile?.id && !!activeJd?.id && resumeFile.parseStatus !== 'PROCESSING' && resumeFile.extractedTextLength !== 0 && !busyRun;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-900 font-display">Resume & Job Description Analysis</h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Upload your resume and paste the target job description to get an explainable estimated ATS/job match score.
        </p>
      </div>

      {/* Step 1 */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-display">1</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Candidate Resume</h3>
              <p className="text-xs text-slate-500">Select or drag your PDF/DOCX resume file (text-based; scanned images are not supported)</p>
            </div>
          </div>
          {resumeFile?.parseStatus === 'PARSED' && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Parsed
            </span>
          )}
        </div>
        <FileUploader
          currentFile={resumeFile}
          onFileSelected={() => {}}
          onFileRemoved={() => {
            setResumeFile(null);
            setRunId(null);
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
        {resumeFile?.id && <ResumeParsedPanel resume={resumeFile} />}
      </div>

      {/* Step 2 */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card">
        <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-display">2</span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Target Job Description</h3>
            <p className="text-xs text-slate-500">Paste the real posting. Title is required; skills are optional and are extracted automatically.</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Job Title *</label>
              <input className={inputCls} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Frontend Developer" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Company (optional)</label>
              <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Required skills (optional)</label>
              <input className={inputCls} value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="Comma-separated hints" />
            </div>
          </div>
          <textarea
            rows={8}
            value={jdText}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste complete job description here, including responsibilities, required skills, and qualification requirements..."
            className="w-full bg-white border border-slate-300 rounded-lg p-3.5 text-xs lg:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono leading-relaxed"
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Characters: <strong className="text-slate-800">{jdText.length}</strong>
              {jdText.length < 30 && <span className="text-rose-600 text-[11px]"> (minimum 30 required)</span>}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setJobDescription(''); setJobTitle(''); setCompanyName(''); setSkillsInput(''); setActiveJd(null); setRunId(null); }}
                className="text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear
              </button>
              <button
                type="button"
                onClick={handleSaveJd}
                disabled={savingJd || jdUpToDate}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {savingJd && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {savingJd ? 'Saving & parsing…' : jdUpToDate ? 'Saved' : activeJd ? 'Save as new job description' : 'Save & parse job description'}
              </button>
            </div>
          </div>
        </div>
        {activeJd?.id && <JdParsedPanel jd={activeJd} />}
      </div>

      {/* Step 3 */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-display">3</span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Run Analysis</h3>
            <p className="text-xs text-slate-500">Scores are estimates computed on the server from your parsed resume and the job description.</p>
          </div>
        </div>

        {(status === 'PENDING' || status === 'PROCESSING') && (
          <p className="text-xs text-slate-700 flex items-center gap-2" role="status">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            {status === 'PENDING' ? 'Analysis queued…' : 'Analysis in progress…'} This can take up to a minute.
          </p>
        )}
        {timedOut && (
          <p className="text-xs text-amber-700" role="alert">
            Still working after several minutes. You can leave this page; the result will appear in your history when ready.
          </p>
        )}
        {pollError && (
          <p className="text-xs text-rose-700" role="alert">Lost contact while checking progress: {describeApiError(pollError)}</p>
        )}
        {status === 'FAILED' && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-2" role="alert">
            <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Analysis failed</p>
            <p>{analysis?.errorMessage || 'The analysis could not be completed.'}</p>
            <button type="button" onClick={handleRetry} disabled={retrying} className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 font-semibold disabled:opacity-50 cursor-pointer">
              {retrying ? 'Retrying…' : 'Retry analysis'}
            </button>
          </div>
        )}
        {runError && <p className="text-xs text-rose-700" role="alert">{runError}</p>}
        {!resumeFile?.id && <p className="text-[11px] text-slate-500">Upload a resume to continue.</p>}
        {resumeFile?.id && !activeJd?.id && <p className="text-[11px] text-slate-500">Save the job description to continue.</p>}
        {resumeFile?.id && resumeFile.parseStatus !== 'PARSED' && resumeFile.extractedTextLength !== 0 && (
          <p className="text-[11px] text-amber-700">
            The resume is not parsed yet; the server will try to parse it during the analysis, which needs the AI service.
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="w-full sm:w-auto px-7 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-subtle flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {busyRun || isPolling ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Analyzing…</span></>
            ) : (
              <><span>Run Analysis</span><ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
