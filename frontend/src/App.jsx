import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import AnalysisPage from './pages/AnalysisPage';
import AnalysisResultsPage from './pages/AnalysisResultsPage';
import GapAnalysisPage from './pages/GapAnalysisPage';
import ResumeEnhancementPage from './pages/ResumeEnhancementPage';
import MockInterviewPage from './pages/MockInterviewPage';
import InterviewResultsPage from './pages/InterviewResultsPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import ToastContainer from './components/ToastContainer';

export default function App() {
  return (
    <>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboard Layout for Platform Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/analysis/results" element={<AnalysisResultsPage />} />
          <Route path="/gap-analysis" element={<GapAnalysisPage />} />
          <Route path="/resume-enhancement" element={<ResumeEnhancementPage />} />
          <Route path="/mock-interview" element={<MockInterviewPage />} />
          <Route path="/mock-interview/results" element={<InterviewResultsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
