import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
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
        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<SignInPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/analysis/results" element={<AnalysisResultsPage />} />
          <Route path="/analysis/results/:id" element={<AnalysisResultsPage />} />
          <Route path="/gap-analysis" element={<GapAnalysisPage />} />
          <Route path="/gap-analysis/:id" element={<GapAnalysisPage />} />
          <Route path="/resume-enhancement" element={<ResumeEnhancementPage />} />
          <Route path="/mock-interview" element={<MockInterviewPage />} />
          <Route path="/mock-interview/results" element={<InterviewResultsPage />} />
          <Route path="/mock-interview/results/:id" element={<InterviewResultsPage />} />
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
