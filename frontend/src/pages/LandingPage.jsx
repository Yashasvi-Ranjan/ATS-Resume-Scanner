import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileSearch,
  Sparkles,
  GitPullRequest,
  Bot,
  History,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Cpu,
  Layers,
  Award,
  ChevronRight,
  Target
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CircularScore from '../components/CircularScore';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileSearch,
      title: "Resume Analysis",
      desc: "Deep parsing and structured multi-attribute comparison between your resume and target job descriptions."
    },
    {
      icon: Target,
      title: "Explainable Match Score",
      desc: "Transparent breakdown across skills, experience, keyword alignment, and educational requirements — no black box."
    },
    {
      icon: GitPullRequest,
      title: "Intelligent Gap Analysis",
      desc: "Categorizes strong matches, weakly represented skills, and missing competencies with actionable recommendations."
    },
    {
      icon: Sparkles,
      title: "No-Fabrication Enhancement",
      desc: "Rewrites and quantifies your existing achievements into high-impact bullet points without fabricating false data."
    },
    {
      icon: Bot,
      title: "Role-Specific Mock Interview",
      desc: "Interactive technical and behavioral interview practice with real-time feedback tailored to the target role."
    },
    {
      icon: History,
      title: "Progress & History Tracking",
      desc: "Track your score improvements, interview evaluations, and application readiness across target companies."
    }
  ];

  const steps = [
    {
      step: "01",
      title: "Upload Resume",
      desc: "Upload your existing PDF or DOCX resume in seconds."
    },
    {
      step: "02",
      title: "Add Job Description",
      desc: "Paste your target company's job posting or choose a preset."
    },
    {
      step: "03",
      title: "Analyze Match",
      desc: "Get an instant, explainable ATS match score with visual category breakdowns."
    },
    {
      step: "04",
      title: "Improve Resume",
      desc: "Review side-by-side AI enhancements and accept tailored bullet suggestions."
    },
    {
      step: "05",
      title: "Practice Interview",
      desc: "Answer job-specific technical questions and receive structured performance feedback."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Gradients & Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-brand-600/20 to-indigo-600/20 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Generation Career Readiness Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-white leading-[1.15]">
                Know How Well Your Resume Matches Your{' '}
                <span className="gradient-text">Dream Job.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Upload your resume, compare it against real job descriptions, and unlock explainable match scores, actionable gap analysis, verified resume enhancement, and role-specific mock interviews.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <button
                  onClick={() => navigate('/analysis')}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-base shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Zap className="w-5 h-5" />
                  <span>Analyze My Resume</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-7 py-4 rounded-xl glass-card hover:bg-slate-800/80 text-slate-200 font-semibold text-base border border-slate-700/80 flex items-center justify-center gap-2 transition-all"
                >
                  <span>See How It Works</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-slate-800/60 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>No data fabrication guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-400" />
                  <span>Explainable ATS algorithm</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span>Instant mock interview prep</span>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Card Preview */}
            <div className="lg:col-span-5">
              <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl relative">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                      Live Demonstration Sample
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      Frontend Developer (React / TS)
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Apex Innovations
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center py-2">
                  <CircularScore score={78} size={150} label="Match Score" subtitle="Good Match" />
                </div>

                <div className="mt-6 space-y-2.5">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-300">Skills Match</span>
                    <span className="text-emerald-400 font-bold">82%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-300">Experience Alignment</span>
                    <span className="text-blue-400 font-bold">74%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-300">ATS Keywords</span>
                    <span className="text-indigo-400 font-bold">76%</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Candidate: Sarah Johnson</span>
                  <Link
                    to="/analysis/results"
                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    View Full Analysis <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-slate-900/40 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
              Step-by-Step Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white mt-2">
              How CVATS Works
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              A complete, transparent 5-step career readiness pipeline designed to turn candidate resumes into high-converting job applications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-6">
            {steps.map((item, idx) => (
              <div
                key={item.step}
                className="glass-card p-6 rounded-2xl border border-slate-800 relative flex flex-col justify-between group hover:border-brand-500/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div>
                  <div className="text-3xl font-extrabold font-display text-slate-700 group-hover:text-brand-500/60 transition-colors">
                    {item.step}
                  </div>
                  <h3 className="text-base font-bold text-white mt-3 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-brand-400 font-semibold">
                  <span>Phase {idx + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white mt-2">
              Everything You Need to Land the Offer
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Engineered to provide comprehensive explainability, genuine resume improvement, and role-tailored interview practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="glass-card p-7 rounded-2xl border border-slate-800 hover:border-slate-700 glass-card-hover flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-5">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 font-display">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 bg-gradient-to-r from-brand-900/60 via-indigo-950 to-slate-950 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display">
            Ready to Optimize Your Resume for Your Next Role?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
            Test the full ATS scan, gap analysis, resume enhancement, and mock interview workflow in our interactive prototype.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/analysis')}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-brand-500/30 transition-all active:scale-95 inline-flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              <span>Start Free Analysis</span>
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
