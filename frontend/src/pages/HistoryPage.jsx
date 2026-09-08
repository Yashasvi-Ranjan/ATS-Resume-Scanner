import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  History,
  FileSearch,
  Bot,
  Trash2,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { historyList, deleteHistoryItem, showToast } = useApp();
  const [filterType, setFilterType] = useState('All'); // 'All', 'Resume Analysis', 'Mock Interview'

  const filteredItems = historyList.filter((item) => {
    if (filterType === 'All') return true;
    return item.type === filterType;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            <span>Audit Trail & Assessment History</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-white font-display">
            Analysis & Interview History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review your past resume scans, match scores, and interview performance logs
          </p>
        </div>

        <button
          onClick={() => navigate('/analysis')}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Analysis</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {['All', 'Resume Analysis', 'Mock Interview'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filterType === type
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* History Records Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <History className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm">No historical records found for this category filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                  <th className="py-4 px-6 font-semibold">Date</th>
                  <th className="py-4 px-6 font-semibold">Target Job Role</th>
                  <th className="py-4 px-6 font-semibold">Company</th>
                  <th className="py-4 px-6 font-semibold">Assessment Type</th>
                  <th className="py-4 px-6 font-semibold">Score</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-4 px-6 text-slate-400 font-mono">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.date}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-100 font-display">
                      {item.role}
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.company}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border inline-flex items-center gap-1.5 ${
                          item.type === 'Resume Analysis'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {item.type === 'Resume Analysis' ? (
                          <FileSearch className="w-3 h-3" />
                        ) : (
                          <Bot className="w-3 h-3" />
                        )}
                        <span>{item.type}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-emerald-400 font-display">
                          {item.score}%
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          ({item.scoreVerdict})
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{item.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(item.detailsUrl)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
