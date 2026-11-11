import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  ArrowRight,
  Menu,
  X,
  LogIn,
  UserPlus,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  User
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout } = useApp();
  const userMenuRef = useRef(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    await logout();
    navigate('/');
  };

  // Get user initials for avatar
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-subtle">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight">
              CVATS
            </span>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
              ATS Match
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            Features
          </button>
          {currentUser && (
            <Link to="/dashboard" className="hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
          )}
        </div>

        {/* Auth / CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {currentUser ? (
            /* ── Logged-in user menu ── */
            <div className="relative" ref={userMenuRef}>
              <button
                id="navbar-user-menu-btn"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {initials}
                </div>
                <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                  {currentUser.name}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50">
                  <div className="px-3.5 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-slate-400" />
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Profile
                  </Link>
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    id="navbar-logout-btn"
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ── Guest buttons ── */
            <>
              <Link
                to="/login"
                id="navbar-signin-link"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                to="/register"
                id="navbar-register-link"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Get Started</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-5 py-4 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-700 hover:text-blue-600"
          >
            Home
          </Link>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="block text-sm font-medium text-slate-700 hover:text-blue-600 text-left w-full cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="block text-sm font-medium text-slate-700 hover:text-blue-600 text-left w-full cursor-pointer"
          >
            Features
          </button>
          {currentUser && (
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-700 hover:text-blue-600"
            >
              Dashboard
            </Link>
          )}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            {currentUser ? (
              <>
                <div className="flex items-center gap-2.5 px-1 py-1">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{currentUser.name}</p>
                    <p className="text-xs text-slate-500">{currentUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-center font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-center font-semibold text-xs transition-colors block"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold text-xs transition-colors block"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
