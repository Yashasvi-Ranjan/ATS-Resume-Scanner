// DEMO MODE ONLY. This module is loaded with a dynamic import() guarded by DEMO_MODE
// (VITE_DEMO_MODE === 'true'). Nothing here is ever imported in normal operation.
import { mockCandidateProfile, mockDefaultResumeFile } from '../data/mockResume';
import { defaultJobDescription } from '../data/mockJobDescription';
import { mockAnalysisResult } from '../data/mockAnalysis';
import { mockHistoryData } from '../data/mockHistory';

export function getDemoUserState() {
  return {
    resumeFile: mockDefaultResumeFile,
    jobDescription: defaultJobDescription,
    analysisResult: mockAnalysisResult,
    historyList: mockHistoryData,
    userProfile: mockCandidateProfile
  };
}
