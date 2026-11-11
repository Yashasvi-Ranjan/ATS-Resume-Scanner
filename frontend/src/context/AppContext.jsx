import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { DEMO_MODE } from '../config/demoMode';
import { mockCandidateProfile, mockDefaultResumeFile } from '../data/mockResume';
import { defaultJobDescription } from '../data/mockJobDescription';
import { mockAnalysisResult } from '../data/mockAnalysis';
import { mockGapAnalysisData } from '../data/mockGapAnalysis';
import { mockEnhancementData } from '../data/mockEnhancement';
import { mockHistoryData } from '../data/mockHistory';
import { mockInterviewQuestions, mockInterviewResultsData } from '../data/mockInterview';

const AppContext = createContext(null);

// History record type strings (must match the filters used by HistoryPage / DashboardPage)
const HISTORY_TYPE_ANALYSIS = 'Resume Analysis';
const HISTORY_TYPE_INTERVIEW = 'Mock Interview';
const HISTORY_TYPE_ENHANCEMENT = 'Resume Enhancement';
const HISTORY_PAGE_SIZE = 10;
const EMPTY_HISTORY_META = { page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false };

function mapResumeRow(r) {
  return {
    id: r.id,
    name: r.originalFilename,
    size: `${Math.round(r.fileSize / 1024)} KB`,
    lastModified: toIsoDate(r.createdAt),
    type: r.mimeType
  };
}

/** Empty profile — mirrors the keys of mockCandidateProfile with empty values. */
const EMPTY_PROFILE = {
  name: '',
  email: '',
  phone: '',
  location: '',
  targetRole: '',
  experienceLevel: '',
  headline: '',
  skills: []
};

/**
 * Initial user-specific state. Sample data is seeded ONLY when DEMO_MODE is
 * explicitly enabled; otherwise every user starts with empty state.
 */
function getInitialUserState() {
  if (DEMO_MODE) {
    return {
      resumeFile: mockDefaultResumeFile,
      jobDescription: defaultJobDescription,
      analysisResult: mockAnalysisResult,
      gapAnalysis: mockGapAnalysisData,
      enhancementData: mockEnhancementData,
      historyList: mockHistoryData,
      interviewAnswers: {},
      currentQuestionIndex: 0,
      interviewResults: mockInterviewResultsData,
      userProfile: mockCandidateProfile
    };
  }
  return {
    resumeFile: null,
    jobDescription: '',
    analysisResult: null,
    gapAnalysis: null,
    enhancementData: null,
    historyList: [],
    interviewAnswers: {},
    currentQuestionIndex: 0,
    interviewResults: null,
    userProfile: EMPTY_PROFILE
  };
}

function toIsoDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

function toScore(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getScoreVerdict(score) {
  if (score == null) return null;
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'Low';
}

function normalizeAnalysis(item) {
  const score = toScore(item.overallScore ?? null);
  return {
    id: item.id,
    type: HISTORY_TYPE_ANALYSIS,
    role: item.jobDescription?.title || 'Untitled role',
    company: item.jobDescription?.companyName || '',
    score,
    scoreVerdict: getScoreVerdict(score),
    date: toIsoDate(item.createdAt),
    createdAt: item.createdAt,
    status: item.status,
    detailsUrl: `/analysis/results/${item.id}`,
    summary: `Resume: ${item.resume?.originalFilename || 'Unknown'}`,
    overallScore: score,
    skillsScore: toScore(item.skillsScore ?? null),
    experienceScore: toScore(item.experienceScore ?? null)
  };
}

function normalizeInterview(item) {
  const answered = item._count?.answers ?? 0;
  const total = item.totalQuestions ?? item._count?.questions ?? 0;
  return {
    id: item.id,
    type: HISTORY_TYPE_INTERVIEW,
    role: item.jobDescription?.title || 'Untitled role',
    company: item.jobDescription?.companyName || '',
    score: null,
    scoreVerdict: null,
    date: toIsoDate(item.createdAt),
    createdAt: item.createdAt,
    status: item.status,
    detailsUrl: `/mock-interview/results/${item.id}`,
    summary: `${answered} of ${total} questions answered`,
    overallScore: null,
    skillsScore: null,
    experienceScore: null
  };
}

function normalizeEnhancement(item) {
  return {
    id: item.id,
    type: HISTORY_TYPE_ENHANCEMENT,
    role: item.jobDescription?.title || 'Untitled role',
    company: item.jobDescription?.companyName || '',
    score: null,
    scoreVerdict: null,
    date: toIsoDate(item.createdAt),
    createdAt: item.createdAt,
    status: item.status,
    detailsUrl: null,
    summary: `Version ${item.version ?? '?'} · ${item.resume?.originalFilename || 'Unknown'}`,
    overallScore: null,
    skillsScore: null,
    experienceScore: null
  };
}

export function AppProvider({ children }) {
  const initial = getInitialUserState();

  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Incremented on every session change (login/register/logout/restore) so that
  // in-flight requests from a previous session can be discarded.
  const sessionRef = useRef(0);

  // Uploaded resume state
  const [resumeFile, setResumeFile] = useState(initial.resumeFile);
  const [jobDescription, setJobDescription] = useState(initial.jobDescription);

  // Analysis results state
  const [analysisResult, setAnalysisResult] = useState(initial.analysisResult);
  const [gapAnalysis, setGapAnalysis] = useState(initial.gapAnalysis);
  const [enhancementData, setEnhancementData] = useState(initial.enhancementData);

  // History state
  const [historyList, setHistoryList] = useState(initial.historyList);
  const [historyError, setHistoryError] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyMeta, setHistoryMeta] = useState(EMPTY_HISTORY_META);
  const historyReqRef = useRef(0); // drops out-of-order responses within a session

  // User Profile state
  const [userProfile, setUserProfile] = useState(initial.userProfile);

  // Mock interview state — interviewQuestions is a static practice prompt bank (read-only)
  const [interviewQuestions] = useState(mockInterviewQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initial.currentQuestionIndex);
  const [interviewAnswers, setInterviewAnswers] = useState(initial.interviewAnswers);
  const [interviewResults, setInterviewResults] = useState(initial.interviewResults);

  // Global Toasts system
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  /** Reset every piece of user-specific state to its initial (empty) value. */
  const resetUserState = useCallback(() => {
    const s = getInitialUserState();
    setResumeFile(s.resumeFile);
    setJobDescription(s.jobDescription);
    setAnalysisResult(s.analysisResult);
    setGapAnalysis(s.gapAnalysis);
    setEnhancementData(s.enhancementData);
    setHistoryList(s.historyList);
    setHistoryError(null);
    setIsHistoryLoading(false);
    setHistoryMeta(EMPTY_HISTORY_META);
    historyReqRef.current += 1;
    setInterviewAnswers(s.interviewAnswers);
    setCurrentQuestionIndex(s.currentQuestionIndex);
    setInterviewResults(s.interviewResults);
    setUserProfile(s.userProfile);
  }, []);

  /**
   * Load one page of history. NOTE: pagination is per-source — page N of
   * analyses, enhancements and interviews (10 each) is fetched in parallel and
   * merged by createdAt desc, so a page may hold up to 30 records. historyMeta
   * reports totalPages = max across sources and total = sum across sources.
   * Calling with no argument loads page 1.
   */
  const fetchBackendHistory = useCallback(async ({ page = 1 } = {}) => {
    const session = sessionRef.current;
    const reqId = ++historyReqRef.current;
    setIsHistoryLoading(true);
    setHistoryError(null);

    const params = { page, limit: HISTORY_PAGE_SIZE };
    const sources = [
      { label: 'analysis', call: () => api.analyses.list(params), normalize: normalizeAnalysis },
      { label: 'enhancement', call: () => api.enhancements.list(params), normalize: normalizeEnhancement },
      { label: 'interview', call: () => api.interviews.list(params), normalize: normalizeInterview }
    ];
    const results = await Promise.allSettled(sources.map((s) => s.call()));

    // Session changed or a newer request started — discard stale results.
    if (session !== sessionRef.current || reqId !== historyReqRef.current) return;

    const records = [];
    const errors = [];
    let totalPages = 1;
    let total = 0;

    results.forEach((res, i) => {
      const src = sources[i];
      if (res.status === 'fulfilled') {
        (Array.isArray(res.value?.data) ? res.value.data : []).forEach((item) => records.push(src.normalize(item)));
        const m = res.value?.meta;
        if (m) {
          totalPages = Math.max(totalPages, m.totalPages || 1);
          total += m.total || 0;
        }
      } else {
        console.error(`Failed to load ${src.label} history:`, res.reason);
        errors.push(`Could not load ${src.label} history: ${res.reason?.message || 'Unknown error'}`);
      }
    });

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setHistoryList(records);
    setHistoryMeta({ page, totalPages, total, hasNext: page < totalPages, hasPrev: page > 1 });
    setIsHistoryLoading(false);

    if (errors.length > 0) {
      const message = errors.join(' ');
      setHistoryError(message);
      showToast(message, 'error', 5000);
    }
  }, [showToast]);

  /** Restore the user's most recent uploaded resume (only if none is set yet). */
  const restoreLatestResume = useCallback(async () => {
    const session = sessionRef.current;
    try {
      const res = await api.resumes.list({ limit: 1 });
      if (session !== sessionRef.current) return;
      const row = Array.isArray(res?.data) ? res.data[0] : null;
      if (row) setResumeFile((prev) => prev ?? mapResumeRow(row));
    } catch (err) {
      if (session !== sessionRef.current) return;
      console.error('Failed to restore latest resume:', err);
      showToast(`Could not load your latest resume: ${err?.message || 'Unknown error'}`, 'error', 5000);
    }
  }, [showToast]);

  /** Apply a freshly authenticated user: clean state, then set user + profile, then load history. */
  const applyAuthenticatedUser = useCallback((user) => {
    sessionRef.current += 1;
    resetUserState();
    setCurrentUser(user);
    setUserProfile({ ...EMPTY_PROFILE, name: user?.name || '', email: user?.email || '' });
    fetchBackendHistory();
    restoreLatestResume();
  }, [resetUserState, fetchBackendHistory, restoreLatestResume]);

  // ─── Auth Actions ────────────────────────────────────────────────────────────

  /** Register a new user and set session. */
  const register = useCallback(async ({ name, email, password }) => {
    const res = await api.auth.register({ name, email, password });
    applyAuthenticatedUser(res.data?.user);
    return res;
  }, [applyAuthenticatedUser]);

  /** Log in an existing user and set session. */
  const login = useCallback(async ({ email, password }) => {
    const res = await api.auth.login({ email, password });
    applyAuthenticatedUser(res.data?.user);
    return res;
  }, [applyAuthenticatedUser]);

  /** Log out and clear session. The token is always removed by api.auth.logout(). */
  const logout = useCallback(async () => {
    sessionRef.current += 1;
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Server logout failed (local session cleared anyway):', err);
    }
    resetUserState();
    setCurrentUser(null);
  }, [resetUserState]);

  // ─── Session Restore on Mount ────────────────────────────────────────────────

  useEffect(() => {
    async function restoreSession() {
      setIsAuthLoading(true);
      const session = ++sessionRef.current;
      try {
        const token = api.getToken();
        if (!token) return;
        const userRes = await api.auth.getMe();
        if (session !== sessionRef.current) return;
        if (userRes.data) {
          applyAuthenticatedUser(userRes.data);
        }
      } catch (err) {
        if (session !== sessionRef.current) return;
        if (err?.status === 401 || err?.status === 403) {
          // Token is invalid/expired — clear it
          api.setToken(null);
          resetUserState();
          setCurrentUser(null);
        } else {
          // Network/server error — keep token so the session can be restored later
          console.error('Failed to restore session:', err);
          setCurrentUser(null);
          showToast(`Could not restore your session: ${err?.message || 'Unknown error'}`, 'error', 5000);
        }
      } finally {
        setIsAuthLoading(false);
      }
    }

    restoreSession();
  }, [applyAuthenticatedUser, resetUserState, showToast]);

  // ─── App Helpers ─────────────────────────────────────────────────────────────

  const updateSectionStatus = (sectionId, status) => {
    if (!enhancementData) return;
    setEnhancementData((prev) => {
      if (!prev?.sections) return prev;
      const newSections = prev.sections.map((sec) => {
        if (sec.id === sectionId) {
          return { ...sec, status };
        }
        return sec;
      });
      return { ...prev, sections: newSections };
    });
    showToast(`Section ${status === 'accepted' ? 'accepted' : 'rejected'}.`, 'success');
  };

  const updateBulletStatus = (sectionId, bulletId, status) => {
    if (!enhancementData) return;
    setEnhancementData((prev) => {
      if (!prev?.sections) return prev;
      const newSections = prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.items) {
          const newItems = sec.items.map((it) => (it.id === bulletId ? { ...it, status } : it));
          return { ...sec, items: newItems };
        }
        return sec;
      });
      return { ...prev, sections: newSections };
    });
    showToast(`Suggestion ${status === 'accepted' ? 'accepted' : 'rejected'}.`, 'success');
  };

  /**
   * Delete a history record on the backend, then remove it locally.
   * Returns true on success, false on failure (an error toast is shown).
   */
  const deleteHistoryItem = async (id, type) => {
    const recordType = type || historyList.find((item) => item.id === id)?.type;

    if (recordType === HISTORY_TYPE_INTERVIEW || recordType === 'interview') {
      showToast('Deleting interview sessions is not supported by the server.', 'error');
      return false;
    }
    if (recordType === HISTORY_TYPE_ENHANCEMENT) {
      showToast('Deleting enhancements is not supported by the server.', 'error');
      return false;
    }
    if (recordType !== HISTORY_TYPE_ANALYSIS && recordType !== 'analysis') {
      showToast('Could not delete record: unknown record type.', 'error');
      return false;
    }

    try {
      await api.analyses.delete(id);
    } catch (err) {
      console.error('Failed to delete analysis:', err);
      showToast(`Failed to delete record: ${err?.message || 'Unknown error'}`, 'error');
      return false;
    }

    const remaining = historyList.filter((item) => item.id !== id);
    setHistoryList(remaining);
    showToast('Record deleted.', 'success');
    // Refetch so pagination counts stay accurate; step back if the page emptied.
    const page = historyMeta.page;
    fetchBackendHistory({ page: remaining.length === 0 && page > 1 ? page - 1 : page });
    return true;
  };

  const uploadResume = async (file) => {
    try {
      const res = await api.resumes.upload(file);
      const uploadedData = {
        id: res.data.id,
        name: res.data.originalFilename,
        size: `${Math.round(res.data.fileSize / 1024)} KB`,
        lastModified: new Date(res.data.createdAt).toISOString().split('T')[0],
        type: res.data.mimeType
      };
      setResumeFile(uploadedData);
      showToast('Resume uploaded and persisted to PostgreSQL backend!', 'success');
      return uploadedData;
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error');
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        // Auth
        currentUser,
        setCurrentUser,
        isAuthLoading,
        login,
        register,
        logout,
        resetUserState,
        // Resume / JD
        resumeFile,
        setResumeFile,
        uploadResume,
        jobDescription,
        setJobDescription,
        // Analysis
        analysisResult,
        setAnalysisResult,
        gapAnalysis,
        setGapAnalysis,
        enhancementData,
        setEnhancementData,
        updateSectionStatus,
        updateBulletStatus,
        // History
        historyList,
        setHistoryList,
        historyError,
        isHistoryLoading,
        historyMeta,
        fetchBackendHistory,
        deleteHistoryItem,
        // Profile
        userProfile,
        setUserProfile,
        // Interview
        interviewQuestions,
        currentQuestionIndex,
        setCurrentQuestionIndex,
        interviewAnswers,
        setInterviewAnswers,
        interviewResults,
        setInterviewResults,
        // Toasts
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
