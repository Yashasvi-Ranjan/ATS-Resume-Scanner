import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileCheck2, ArrowRight, Menu, X, Sparkles } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              CVATS
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                AI System
              </span>
            </span>
            <span className="text-[10px] text-slate-400 tracking-wide">
              CV Analysis & ATS Validation
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link to="/" className="hover:text-brand-400 transition-colors">
            Home
          </Link>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-brand-400 transition-colors"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="hover:text-brand-400 transition-colors"
          >
            Features
          </button>
          <Link to="/dashboard" className="hover:text-brand-400 transition-colors">
            Dashboard
          </Link>
        </div>

        {/* Auth / CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 transition-colors"
          >
            Login
          </Link>
          <button
            onClick={() => navigate('/analysis')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/25 transition-all active:scale-95"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-6 py-5 space-y-4">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-200"
          >
            Home
          </Link>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="block text-sm font-medium text-slate-200 text-left w-full"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="block text-sm font-medium text-slate-200 text-left w-full"
          >
            Features
          </button>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-200"
          >
            Dashboard
          </Link>
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/analysis');
              }}
              className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-center font-semibold text-sm"
            >
              Get Started Free
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
