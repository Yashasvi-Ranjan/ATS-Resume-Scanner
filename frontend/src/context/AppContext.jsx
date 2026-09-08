import React, { createContext, useContext, useState } from 'react';
import { mockCandidateProfile, mockDefaultResumeFile } from '../data/mockResume';
import { defaultJobDescription } from '../data/mockJobDescription';
import { mockAnalysisResult } from '../data/mockAnalysis';
import { mockGapAnalysisData } from '../data/mockGapAnalysis';
import { mockEnhancementData } from '../data/mockEnhancement';
import { mockHistoryData } from '../data/mockHistory';
import { mockInterviewQuestions, mockInterviewResultsData } from '../data/mockInterview';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Uploaded resume state
  const [resumeFile, setResumeFile] = useState(mockDefaultResumeFile);
  const [jobDescription, setJobDescription] = useState(defaultJobDescription);

  // Analysis results state
  const [analysisResult, setAnalysisResult] = useState(mockAnalysisResult);
  const [gapAnalysis, setGapAnalysis] = useState(mockGapAnalysisData);
  const [enhancementData, setEnhancementData] = useState(mockEnhancementData);

  // History state
  const [historyList, setHistoryList] = useState(mockHistoryData);

  // User Profile state
  const [userProfile, setUserProfile] = useState(mockCandidateProfile);

  // Mock interview state
  const [interviewQuestions] = useState(mockInterviewQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState({
    1: "I'm a frontend developer with 2+ years of experience building responsive React web apps and integrating REST APIs.",
    2: "Props are immutable arguments passed from parent components, while state is mutable component-internal data managed with hooks."
  });
  const [interviewResults, setInterviewResults] = useState(mockInterviewResultsData);

  // Global Toasts system
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Section enhancement status updater
  const updateSectionStatus = (sectionId, status) => {
    setEnhancementData((prev) => {
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

  // Sub-bullet enhancement status updater
  const updateBulletStatus = (sectionId, bulletId, status) => {
    setEnhancementData((prev) => {
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

  // Delete history record
  const deleteHistoryItem = (id) => {
    setHistoryList((prev) => prev.filter((item) => item.id !== id));
    showToast('Record deleted from history.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        resumeFile,
        setResumeFile,
        jobDescription,
        setJobDescription,
        analysisResult,
        setAnalysisResult,
        gapAnalysis,
        setGapAnalysis,
        enhancementData,
        setEnhancementData,
        updateSectionStatus,
        updateBulletStatus,
        historyList,
        setHistoryList,
        deleteHistoryItem,
        userProfile,
        setUserProfile,
        interviewQuestions,
        currentQuestionIndex,
        setCurrentQuestionIndex,
        interviewAnswers,
        setInterviewAnswers,
        interviewResults,
        setInterviewResults,
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
