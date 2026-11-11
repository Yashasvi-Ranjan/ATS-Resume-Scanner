import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  UserPlus,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) }
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useApp();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Full name is required.';
    if (!form.email.trim()) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Please enter a valid email address.';
    if (!form.password) errors.password = 'Password is required.';
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await register({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(form.password)).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][passwordStrength];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-400', 'bg-emerald-500'][passwordStrength];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel – Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">CVATS</span>
          <span className="text-[10px] font-semibold text-blue-400 bg-blue-900/60 border border-blue-700/60 px-1.5 py-0.5 rounded">
            ATS Match
          </span>
        </Link>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Get started for free
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Land your dream job with data-driven preparation.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Join thousands of job seekers using CVATS to optimize their resumes, close skill gaps, and practice role-specific interviews.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-4">
            {[
              { label: 'Resume Scans', value: '50K+' },
              { label: 'Skills Mapped', value: '200K+' },
              { label: 'Interviews Practiced', value: '30K+' },
              { label: 'Match Accuracy', value: '94%' }
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs relative z-10">
          © 2025 CVATS · Secure · Private · No data fabrication
        </p>
      </div>

      {/* Right Panel – Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">CVATS</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create your account</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Start your free journey — no credit card required.
            </p>
          </div>

          {/* Global error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label htmlFor="register-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Alex Johnson"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                  fieldErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
                }`}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                  fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                    fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {form.password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          i <= passwordStrength ? strengthColor : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  {strengthLabel && (
                    <p className={`text-xs font-medium ${
                      passwordStrength === 3 ? 'text-emerald-600' : passwordStrength === 2 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {strengthLabel} password
                    </p>
                  )}
                  <ul className="space-y-0.5 mt-1">
                    {PASSWORD_RULES.map((rule) => (
                      <li
                        key={rule.label}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                          rule.test(form.password) ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="register-confirm" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="register-confirm"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                    fieldErrors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
              )}
              {form.confirmPassword && form.password === form.confirmPassword && !fieldErrors.confirmPassword && (
                <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            {/* Terms note */}
            <p className="text-xs text-slate-500 leading-relaxed">
              By creating an account you agree to our{' '}
              <span className="text-blue-600 hover:underline cursor-pointer">Terms of Service</span>{' '}
              and{' '}
              <span className="text-blue-600 hover:underline cursor-pointer">Privacy Policy</span>.
            </p>

            {/* Submit */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">Already have an account?</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            <span>Sign in instead</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Security note */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Your data is encrypted and never shared</span>
          </div>
        </div>
      </div>
    </div>
  );
}
