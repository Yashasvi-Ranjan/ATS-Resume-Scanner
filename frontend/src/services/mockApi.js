import { mockCandidateProfile, mockDefaultResumeFile, mockResumeSections } from '../data/mockResume';
import { defaultJobDescription } from '../data/mockJobDescription';
import { mockAnalysisResult } from '../data/mockAnalysis';
import { mockGapAnalysisData } from '../data/mockGapAnalysis';
import { mockEnhancementData } from '../data/mockEnhancement';
import { mockInterviewQuestions, mockInterviewResultsData } from '../data/mockInterview';
import { mockHistoryData } from '../data/mockHistory';

// Utility helper to simulate network latency
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApi = {
  /**
   * Simulates uploading a resume file
   */
  async uploadResume(file) {
    await delay(600);
    if (!file) {
      throw new Error("No resume file provided.");
    }
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"
    ];
    // Check extension as fallback
    const isDocxOrPdf = file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc');
    
    if (!validTypes.includes(file.type) && !isDocxOrPdf) {
      throw new Error("Unsupported file format. Please upload a PDF or DOCX file.");
    }

    return {
      success: true,
      file: {
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        lastModified: new Date().toISOString().split('T')[0],
        type: file.type || 'application/pdf'
      }
    };
  },

  /**
   * Simulates end-to-end ATS resume analysis with multi-stage progress callbacks
   */
  async analyzeResume(resumeFile, jobDescription, onProgress = () => {}) {
    if (!resumeFile) {
      throw new Error("Please upload your resume before continuing.");
    }
    if (!jobDescription || jobDescription.trim().length < 30) {
      throw new Error("Please provide a detailed job description (at least 30 characters).");
    }

    // Step 1: Read resume
    onProgress({ step: 1, percent: 20, message: "Reading & extracting resume text..." });
    await delay(600);

    // Step 2: Parse skills & experience
    onProgress({ step: 2, percent: 45, message: "Extracting skills, experience, and education..." });
    await delay(600);

    // Step 3: Compare with job description
    onProgress({ step: 3, percent: 70, message: "Comparing candidate profile against target job description..." });
    await delay(700);

    // Step 4: Identify gaps & generate metrics
    onProgress({ step: 4, percent: 90, message: "Identifying skill gaps and computing ATS match breakdown..." });
    await delay(500);

    // Final result
    onProgress({ step: 5, percent: 100, message: "Preparing explainable match report..." });
    await delay(300);

    return {
      success: true,
      data: mockAnalysisResult
    };
  },

  /**
   * Fetches latest match results
   */
  async getMatchResults() {
    await delay(300);
    return mockAnalysisResult;
  },

  /**
   * Fetches structured gap analysis
   */
  async getGapAnalysis() {
    await delay(300);
    return mockGapAnalysisData;
  },

  /**
   * Fetches resume enhancement suggestions
   */
  async getEnhancementData() {
    await delay(300);
    return mockEnhancementData;
  },

  /**
   * Simulates regenerating a specific enhancement section
   */
  async regenerateSection(sectionId) {
    await delay(800);
    return {
      success: true,
      sectionId,
      message: "Section enhancement regenerated with updated ATS keywords."
    };
  },

  /**
   * Starts a mock interview session
   */
  async startInterview() {
    await delay(300);
    return {
      success: true,
      questions: mockInterviewQuestions,
      totalQuestions: mockInterviewQuestions.length
    };
  },

  /**
   * Submits a single answer during the mock interview
   */
  async submitInterviewAnswer(questionId, answer) {
    if (!answer || answer.trim().length === 0) {
      throw new Error("Please provide an answer before submitting.");
    }
    await delay(500);
    return {
      success: true,
      questionId,
      status: "Submitted",
      message: "Answer recorded and evaluated successfully."
    };
  },

  /**
   * Fetches the completed interview evaluation report
   */
  async getInterviewResults() {
    await delay(400);
    return mockInterviewResultsData;
  },

  /**
   * Fetches candidate scan & interview history
   */
  async getHistory() {
    await delay(300);
    return mockHistoryData;
  },

  /**
   * Fetches candidate profile
   */
  async getProfile() {
    await delay(200);
    return mockCandidateProfile;
  },

  /**
   * Updates candidate profile
   */
  async saveProfile(profileData) {
    await delay(400);
    return {
      success: true,
      profile: profileData,
      message: "Profile updated successfully."
    };
  }
};
