import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Layers,
  Save,
  Check,
  Plus,
  X,
  FileCheck2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ProfilePage() {
  const { userProfile, setUserProfile, showToast } = useApp();
  const [formData, setFormData] = useState({ ...userProfile });
  const [newSkill, setNewSkill] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    if (formData.skills.includes(newSkill.trim())) {
      showToast('Skill already added.', 'warning');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkill.trim()]
    }));
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove)
    }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setUserProfile(formData);
    setIsSaved(true);
    showToast('Profile changes saved successfully!', 'success');
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <User className="w-4 h-4" />
            <span>Candidate Preferences & Profile</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-white font-display">
            Candidate Profile
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your personal details, target career role, and primary skills inventory
          </p>
        </div>

        <button
          onClick={handleSaveProfile}
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95"
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Saved!' : 'Save Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Basic Information */}
        <div className="glass-card rounded-2xl p-6 lg:p-7 border border-slate-800 space-y-5">
          <h3 className="text-base font-bold text-white font-display border-b border-slate-800 pb-3">
            Personal & Contact Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Target Role & Experience */}
        <div className="glass-card rounded-2xl p-6 lg:p-7 border border-slate-800 space-y-5">
          <h3 className="text-base font-bold text-white font-display border-b border-slate-800 pb-3">
            Career Focus & Seniority
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Target Role Title</label>
              <input
                type="text"
                value={formData.targetRole}
                onChange={(e) => handleInputChange('targetRole', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Experience Level</label>
              <select
                value={formData.experienceLevel}
                onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                <option value="Entry-Level (0-1 years)">Entry-Level (0-1 years)</option>
                <option value="Junior-to-Mid (1-2 years)">Junior-to-Mid (1-2 years)</option>
                <option value="Mid-Level (2-3 years)">Mid-Level (2-3 years)</option>
                <option value="Senior (4+ years)">Senior (4+ years)</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Professional Headline</label>
              <textarea
                rows={2}
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Skills Tag Management */}
        <div className="glass-card rounded-2xl p-6 lg:p-7 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Skills & Technologies Tag Inventory
              </h3>
              <p className="text-xs text-slate-400">
                These skills are used to pre-populate candidate benchmarks during new ATS scans
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {formData.skills.length} skills
            </span>
          </div>

          {/* Add skill input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add skill (e.g. Next.js, Redux, Docker)..."
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
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
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Skill</span>
            </button>
          </div>

          {/* Skills badge list */}
          <div className="flex flex-wrap gap-2 pt-2">
            {formData.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-300 border border-brand-500/30 group"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-brand-400 hover:text-rose-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all active:scale-95"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>Save Profile Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
