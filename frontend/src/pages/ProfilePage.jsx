import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  Save,
  Check,
  Plus,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export default function ProfilePage() {
  const { userProfile, setUserProfile, showToast, currentUser, setCurrentUser } = useApp();
  const toFormData = (profile) => ({
    ...(profile || {}),
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    targetRole: profile?.targetRole || '',
    experienceLevel: profile?.experienceLevel || '',
    headline: profile?.headline || '',
    skills: Array.isArray(profile?.skills) ? profile.skills : []
  });
  const [formData, setFormData] = useState(() => toFormData(userProfile));
  const [isSaving, setIsSaving] = useState(false);
  const [counts, setCounts] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState([]);
  const mountedRef = useRef(true);
  const userId = currentUser?.id;

  const loadAccount = useCallback(async () => {
    setAccountLoading(true);
    setAccountError(null);
    try {
      const res = await api.auth.getMe();
      if (!mountedRef.current) return;
      const me = res?.data;
      if (me) {
        if (me.id !== userId) return; // stale: belongs to a different session
        setCounts(me._count || null);
        setUserProfile((prev) => ({ ...(prev || {}), name: me.name || '', email: me.email || '' }));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Failed to load account:', err);
      setAccountError(err?.message || 'Failed to load account details.');
    } finally {
      if (mountedRef.current) setAccountLoading(false);
    }
  }, [userId, setUserProfile]);

  useEffect(() => {
    mountedRef.current = true;
    setCounts(null);
    if (userId) loadAccount();
    return () => {
      mountedRef.current = false;
    };
  }, [userId, loadAccount]);

  // Re-sync the form when the profile changes (e.g. a different user signs in)
  useEffect(() => {
    setFormData(toFormData(userProfile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);
  const [newSkill, setNewSkill] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    if ((formData.skills || []).includes(newSkill.trim())) {
      showToast('Skill already added.', 'warning');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      skills: [...(prev.skills || []), newSkill.trim()]
    }));
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((s) => s !== skillToRemove)
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    // Only name and email are persisted by the backend (PATCH /auth/profile).
    const payload = {};
    const name = (formData.name || '').trim();
    const email = (formData.email || '').trim();
    const savedName = userProfile?.name || currentUser?.name || '';
    const savedEmail = userProfile?.email || currentUser?.email || '';
    if (name && name !== savedName) payload.name = name;
    if (email && email.toLowerCase() !== savedEmail.toLowerCase()) payload.email = email;

    setIsSaving(true);
    setFieldErrors([]);
    let saved = null;
    try {
      if (Object.keys(payload).length > 0) {
        const res = await api.auth.updateProfile(payload);
        saved = res?.data || null;
      }
    } catch (err) {
      if (Array.isArray(err?.errors) && err.errors.length > 0) {
        setFieldErrors(
          err.errors.map((e) =>
            typeof e === 'string' ? e : `${e.field || e.path || ''}${e.field || e.path ? ': ' : ''}${e.message || ''}`
          )
        );
      }
      showToast(err?.message || 'Failed to save profile.', 'error');
      if (mountedRef.current) setIsSaving(false);
      return;
    }

    if (saved) {
      setCurrentUser((prev) => ({ ...(prev || {}), ...saved }));
      setUserProfile({ ...formData, name: saved.name ?? formData.name, email: saved.email ?? formData.email });
    } else {
      setUserProfile(formData);
    }
    if (!mountedRef.current) return;
    setIsSaving(false);
    setIsSaved(true);
    const savedFields = Object.keys(payload).length > 0
      ? `${Object.keys(payload).map((k) => (k === 'name' ? 'Name' : 'Email')).join(' and ')} saved.`
      : 'Name and email unchanged.';
    showToast(`${savedFields} Other profile fields are stored for this session only.`, 'success');

    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
            <User className="w-3.5 h-3.5" />
            <span>Candidate Profile</span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 font-display">
            Candidate Profile & Preferences
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal contact details, target career role, and skills inventory
          </p>
          {accountLoading && <p className="text-[11px] text-slate-400 mt-1">Loading account...</p>}
          {accountError && (
            <p className="text-[11px] text-rose-600 mt-1">
              {accountError}{' '}
              <button type="button" onClick={loadAccount} className="underline font-semibold cursor-pointer">
                Retry
              </button>
            </p>
          )}
          {counts && !accountError && (
            <p className="text-[11px] text-slate-400 mt-1">
              Account: {counts.resumes ?? 0} resumes · {counts.analyses ?? 0} analyses · {counts.enhancements ?? 0} enhancements · {counts.interviewSessions ?? 0} interview sessions
            </p>
          )}
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
        >
          {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaved ? 'Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-5">
        {fieldErrors.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 space-y-0.5">
            {fieldErrors.map((m, i) => (
              <p key={i}>{m}</p>
            ))}
          </div>
        )}
        {/* Basic Information */}
        <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-display border-b border-slate-100 pb-2.5">
            Personal & Contact Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Target Role & Experience */}
        <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-display border-b border-slate-100 pb-2.5">
            Career Focus & Seniority
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Target Role Title</label>
              <input
                type="text"
                value={formData.targetRole}
                onChange={(e) => handleInputChange('targetRole', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Experience Level</label>
              <select
                value={formData.experienceLevel}
                onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select experience level</option>
                <option value="Entry-Level (0-1 years)">Entry-Level (0-1 years)</option>
                <option value="Junior-to-Mid (1-2 years)">Junior-to-Mid (1-2 years)</option>
                <option value="Mid-Level (2-3 years)">Mid-Level (2-3 years)</option>
                <option value="Senior (4+ years)">Senior (4+ years)</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Professional Headline</label>
              <textarea
                rows={2}
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Skills Tag Management */}
        <div className="bg-white rounded-xl p-5 lg:p-6 border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Skills & Technologies Tag Inventory
              </h3>
              <p className="text-xs text-slate-500">
                Skills used to pre-populate candidate benchmarks during new ATS scans
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {(formData.skills || []).length} skills
            </span>
          </div>

          {/* Add skill input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add skill (e.g. Next.js, Redux, Docker)..."
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill(e);
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Skills badge list */}
          <div className="flex flex-wrap gap-2 pt-1">
            {(formData.skills || []).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-blue-500 hover:text-rose-600 transition-colors cursor-pointer"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-subtle flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Profile Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
