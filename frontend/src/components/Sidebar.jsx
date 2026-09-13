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
    }, 600);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-60 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/90">
            <NavLink to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-subtle">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-lg tracking-tight text-slate-900">
                  CVATS
                </span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded">
                  ATS
                </span>
              </div>
            </NavLink>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-md"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1.5">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Bottom */}
        <div className="p-3 border-t border-slate-200/90">
          <NavLink
            to="/profile"
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100/70 transition-colors group mb-1.5"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
              SJ
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-semibold text-slate-900 truncate">
                {userProfile.name}
              </h5>
              <p className="text-[11px] text-slate-500 truncate">
                {userProfile.targetRole}
              </p>
            </div>
          </NavLink>

          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
