import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { DEMO_MODE } from '../config/demoMode';
import { describeApiError } from '../utils/errors';
import { buildAnalysisSummary, toIsoDate, toScore, getVerdict } from '../utils/analysis';

const AppContext = createContext(null);

// History record type strings (must match the filters used by HistoryPage / DashboardPage)
const HISTORY_TYPE_ANALYSIS = 'Resume Analysis';
const HISTORY_TYPE_INTERVIEW = 'Mock Interview';
const HISTORY_TYPE_ENHANCEMENT = 'Resume Enhancement';
const HISTORY_PAGE_SIZE = 10;
const EMPTY_HISTORY_META = { page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false };

export function mapResumeRow(r) {
  return {
    id: r.id,
    name: r.originalFilename,
    size: `${Math.round((r.fileSize || 0) / 1024)} KB`,
    lastModified: toIsoDate(r.createdAt),
    type: r.mimeType,
    parseStatus: r.parseStatus || 'NOT_PARSED',
    parseError: r.parseError || null,
    extractedTextLength: typeof r.extractedTextLength === 'number' ? r.extractedTextLength : null,
    hasParsedData: Boolean(r.hasParsedData)
  };
}

/** Empty profile with the same keys the profile page expects. */
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
 * Initial user-specific state. Always empty: real users start from backend data only.
 * Sample data exists only in DEMO_MODE and is loaded lazily from ../demo/seed.
 */
function getInitialUserState() {
  return {
    resumeFile: null,
    activeJd: null,
    jobDescription: '',
    analysisResult: null,
    gapAnalysis: null,
    historyList: [],
    userProfile: EMPTY_PROFILE
  };
}

/** Remove every per-user key we may have cached in localStorage, except (optionally) the auth token. */
export function clearUserStorage({ keepToken = true } = {}) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
    keys.forEach((k) => {
      if (!k || !k.startsWith('cvats')) return;
      if (keepToken && k === 'cvats_token') return;
      localStorage.removeItem(k);
    });
  } catch {
    // storage unavailable: nothing to clear
  }
}

function normalizeAnalysis(item) {
  const score = toScore(item.overallScore ?? null);
  return {
    id: item.id,
    type: HISTORY_TYPE_ANALYSIS,
    role: item.jobDescription?.title || 'Untitled role',
    company: item.jobDescription?.companyName || '',
    score,
    scoreVerdict: getVerdict(score),
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
    detailsUrl:
      item.status === 'COMPLETED'
        ? `/mock-interview/results/${item.id}`
        : item.status === 'ABANDONED'
          ? null
          : `/mock-interview?session=${item.id}`,
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
    status: item.generationStatus === 'FAILED' ? 'FAILED' : item.approvedAt ? 'APPROVED' : 'DRAFT',
    detailsUrl: `/resume-enhancement?id=${item.id}`,
    summary: `Version ${item.version ?? '?'} (${item.source || 'USER'}${item.approvedAt ? ', approved' : ', not approved'}) · ${item.resume?.originalFilename || 'Unknown'}`,
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
  const restoreRef = useRef(0);

  // Uploaded resume state
  const [resumeFile, setResumeFile] = useState(initial.resumeFile);
  const [jobDescription, setJobDescription] = useState(initial.jobDescription);
  // Saved job description record ({ id, title, companyName, parseStatus, parseError, fingerprint }).
  const [activeJd, setActiveJd] = useState(initial.activeJd);

  // Analysis results state
  const [analysisResult, setAnalysisResult] = useState(initial.analysisResult);
  const [gapAnalysis, setGapAnalysis] = useState(initial.gapAnalysis);

  // History state
  const [historyList, setHistoryList] = useState(initial.historyList);
  const [historyError, setHistoryError] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyMeta, setHistoryMeta] = useState(EMPTY_HISTORY_META);
  const historyReqRef = useRef(0); // drops out-of-order responses within a session

  // User Profile state
  const [userProfile, setUserProfile] = useState(initial.userProfile);

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
    const st = getInitialUserState();
    setResumeFile(st.resumeFile);
    setActiveJd(st.activeJd);
    setJobDescription(st.jobDescription);
    setAnalysisResult(st.analysisResult);
    setGapAnalysis(st.gapAnalysis);
    setHistoryList(st.historyList);
    setHistoryError(null);
    setIsHistoryLoading(false);
    setHistoryMeta(EMPTY_HISTORY_META);
    historyReqRef.current += 1;
    setUserProfile(st.userProfile);
    clearUserStorage({ keepToken: true });
  }, []);

  /** DEMO_MODE only: seed sample data. The seed module is never loaded otherwise. */
  const applyDemoSeed = useCallback(async () => {
    // Inline env check so the bundler statically drops the demo chunk from normal builds.
    if (import.meta.env.VITE_DEMO_MODE !== 'true') return;
    const { getDemoUserState } = await import('../demo/seed');
    const d = getDemoUserState();
    setResumeFile(d.resumeFile);
    setJobDescription(d.jobDescription);
    setAnalysisResult(d.analysisResult);
    setHistoryList(d.historyList);
    setUserProfile(d.userProfile);
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

  /** Restore a summary of the user's latest analysis so the dashboard reflects real persisted data. */
  const restoreLatestAnalysis = useCallback(async () => {
    const session = sessionRef.current;
    try {
      const list = await api.analyses.list({ limit: 1 });
      const id = list?.data?.[0]?.id;
      if (!id) return;
      const res = await api.analyses.get(id);
      if (session !== sessionRef.current) return;
      setAnalysisResult((prev) => prev ?? buildAnalysisSummary(res?.data));
    } catch (err) {
      if (session !== sessionRef.current) return;
      console.error('Failed to restore latest analysis:', err);
    }
  }, []);

  /** Apply a freshly authenticated user: clean state, then set user + profile, then load history. */
  const applyAuthenticatedUser = useCallback((user) => {
    sessionRef.current += 1;
    resetUserState();
    setCurrentUser(user);
    setUserProfile({ ...EMPTY_PROFILE, name: user?.name || '', email: user?.email || '' });
    if (DEMO_MODE) {
      applyDemoSeed();
      return;
    }
    fetchBackendHistory();
    restoreLatestResume();
    restoreLatestAnalysis();
  }, [resetUserState, fetchBackendHistory, restoreLatestResume, restoreLatestAnalysis, applyDemoSeed]);

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
    clearUserStorage({ keepToken: false });
    setCurrentUser(null);
  }, [resetUserState]);

  // Any 401 from a protected endpoint ends the session locally; ProtectedRoute then redirects to /login.
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      sessionRef.current += 1;
      resetUserState();
      setCurrentUser(null);
      showToast('Your session has expired. Please sign in again.', 'warning', 5000);
    });
    return () => api.setUnauthorizedHandler(null);
  }, [resetUserState, showToast]);

  // ─── Session Restore on Mount ────────────────────────────────────────────────

  useEffect(() => {
    async function restoreSession() {
      setIsAuthLoading(true);
      const session = ++sessionRef.current;
      const restoreId = ++restoreRef.current;
      try {
        const token = api.getToken();
        if (!token) {
          if (DEMO_MODE) applyDemoSeed();
          return;
        }
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
        // Only the latest restore may end the loading state; a superseded call (e.g. React
        // StrictMode's double effect run) must not, or ProtectedRoute redirects to /login too early.
        if (restoreId === restoreRef.current) setIsAuthLoading(false);
      }
    }

    restoreSession();
  }, [applyAuthenticatedUser, applyDemoSeed, resetUserState, showToast]);

  // ─── App Helpers ─────────────────────────────────────────────────────────────

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
      const uploadedData = mapResumeRow(res.data);
      setResumeFile(uploadedData);
      return uploadedData;
    } catch (err) {
      showToast(`Upload failed: ${describeApiError(err)}`, 'error');
      throw err;
    }
  };

  /** Merge fresh fields (e.g. parseStatus after a parse call) into the active resume if it is still the same one. */
  const patchResumeFile = useCallback((id, patch) => {
    setResumeFile((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

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
        patchResumeFile,
        jobDescription,
        setJobDescription,
        activeJd,
        setActiveJd,
        // Analysis
        analysisResult,
        setAnalysisResult,
        gapAnalysis,
        setGapAnalysis,
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
