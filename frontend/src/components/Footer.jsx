import React from 'react';
import { Link } from 'react-router-dom';
import { FileCheck2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-base text-slate-900">
                CVATS
              </span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed">
              AI-powered ATS resume matching, gap analysis, grounded resume enhancement, and mock interviews for job seekers.
            </p>
          </div>

          {/* Product Col */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">
              Workflow
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/analysis" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Resume Analysis
                </Link>
              </li>
              <li>
                <Link to="/gap-analysis" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Gap Analysis
                </Link>
              </li>
              <li>
                <Link to="/resume-enhancement" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Resume Enhancement
                </Link>
              </li>
              <li>
                <Link to="/mock-interview" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Mock Interview
                </Link>
              </li>
            </ul>
          </div>

          {/* Features Col */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">
              Core Principles
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>Explainable ATS Match Scoring</li>
              <li>No-Fabrication Policy</li>
              <li>Targeted Role Alignment</li>
              <li>Progress & History Logs</li>
            </ul>
          </div>

          {/* Project & Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">
              About
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>AI-Powered Job Readiness System</li>
              <li>Designed for Candidates & Students</li>
              <li>Interactive SaaS Prototype</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} CVATS System. All rights reserved.</p>
          <span>Minimal, clean, and grounded career preparation</span>
        </div>
      </div>
    </footer>
  );
}
