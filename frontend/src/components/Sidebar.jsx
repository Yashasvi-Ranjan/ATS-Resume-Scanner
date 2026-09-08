import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSearch,
  Sparkles,
  GitPullRequest,
  Bot,
  History,
  User,
  LogOut,
  Target,
  FileCheck2,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Sidebar({ isOpen, onClose }) {
  const { userProfile, showToast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Resume Analysis', path: '/analysis', icon: FileSearch },
    { name: 'Match Results', path: '/analysis/results', icon: Target },
    { name: 'Gap Analysis', path: '/gap-analysis', icon: GitPullRequest },
    { name: 'Resume Enhancement', path: '/resume-enhancement', icon: Sparkles },
    { name: 'Mock Interview', path: '/mock-interview', icon: Bot },
    { name: 'History', path: '/history', icon: History },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const handleLogoutClick = () => {
    showToast('Logged out of demo session. Redirecting to home...', 'info');
    setTimeout(() => {
      navigate('/');
    }, 800);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900/95 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
            <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                  CVATS
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                    ATS
                  </span>
                </span>
              </div>
            </NavLink>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav List */}
          <nav className="p-4 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
              Platform Workflow
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Bottom */}
        <div className="p-4 border-t border-slate-800/80">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors group mb-2"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center font-bold text-sm text-white border border-slate-700 shrink-0">
              SJ
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-semibold text-slate-200 truncate group-hover:text-brand-300">
                {userProfile.name}
              </h5>
              <p className="text-[11px] text-slate-400 truncate">
                {userProfile.targetRole}
              </p>
            </div>
          </NavLink>

          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
