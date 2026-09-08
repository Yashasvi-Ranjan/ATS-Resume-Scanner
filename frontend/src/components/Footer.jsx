import React from 'react';
import { Link } from 'react-router-dom';
import { FileCheck2, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-lg text-white">
                CVATS
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-powered job-readiness & ATS resume validation system for ambitious software engineers and job seekers.
            </p>
          </div>

          {/* Product Col */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/analysis" className="hover:text-white transition-colors">
                  Resume Analysis
                </Link>
              </li>
              <li>
                <Link to="/gap-analysis" className="hover:text-white transition-colors">
                  Gap Analysis
                </Link>
              </li>
              <li>
                <Link to="/resume-enhancement" className="hover:text-white transition-colors">
                  Resume Enhancement
                </Link>
              </li>
              <li>
                <Link to="/mock-interview" className="hover:text-white transition-colors">
                  Mock Interview
                </Link>
              </li>
            </ul>
          </div>

          {/* Features Col */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Features
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="hover:text-white transition-colors">
                Explainable Match Scoring
              </li>
              <li className="hover:text-white transition-colors">
                No-Fabrication Resume Rewriter
              </li>
              <li className="hover:text-white transition-colors">
                Role-Specific Interview Prep
              </li>
              <li className="hover:text-white transition-colors">
                Historical Progress Tracking
              </li>
            </ul>
          </div>

          {/* About & Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Project & Contact
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="text-slate-400">
                Final-Year Software Engineering Project
              </li>
              <li className="text-slate-400">
                Frontend Implementation Prototype
              </li>
              <li className="text-slate-400">
                Designed for Candidate Empowerment
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} CVATS System. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Built with precision for software engineering excellence</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
