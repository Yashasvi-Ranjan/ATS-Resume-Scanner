import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  History,
  FileSearch,
  Bot,
  Trash2,
  ExternalLink,
  Calendar,
  Building,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { historyList, deleteHistoryItem } = useApp();
  const [filterType, setFilterType] = useState('All'); // 'All', 'Resume Analysis', 'Mock Interview'

  const filteredItems = historyList.filter((item) => {
    if (filterType === 'All') return true;
    return item.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail & Records</span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">
            Analysis & Mock Interview History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review past resume match evaluations and interview performance records
          </p>
        </div>

        <button
          onClick={() => navigate('/analysis')}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Analysis</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['All', 'Resume Analysis', 'Mock Interview'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterType === type
                ? 'bg-blue-600 text-white shadow-subtle'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* History Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-2">
            <History className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs">No historical records found for this filter category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Target Job Role</th>
                  <th className="py-3 px-5">Company</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Score</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-5 text-slate-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.date}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 font-bold text-slate-900 font-display">
                      {item.role}
                    </td>
                    <td className="py-3 px-5 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.company}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border inline-flex items-center gap-1 ${
                          item.type === 'Resume Analysis'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 font-display">
                          {item.score}%
                        </span>
                        <span className="text-[10px] text-slate-500 hidden sm:inline">
                          ({item.scoreVerdict})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{item.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(item.detailsUrl)}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
