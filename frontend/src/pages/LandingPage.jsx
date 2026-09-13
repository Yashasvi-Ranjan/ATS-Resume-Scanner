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
  Target,
  ChevronRight,
  TrendingUp,
  Layers,
  FileText
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CircularScore from '../components/CircularScore';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileSearch,
      title: "Multi-Factor Resume Analysis",
      desc: "Deep parsing and structured multi-attribute comparison between your resume and target job descriptions."
    },
    {
      icon: Target,
      title: "Explainable Match Scoring",
      desc: "Transparent scoring across skills, experience, keyword alignment, and educational requirements — no black box."
    },
    {
      icon: GitPullRequest,
      title: "Intelligent Gap Analysis",
      desc: "Distinguishes between strong matches, weakly represented skills, and missing competencies with clear next steps."
    },
    {
      icon: Sparkles,
      title: "No-Fabrication Enhancement",
      desc: "Rewrites and quantifies your existing achievements into high-impact bullet points without fabricating false credentials."
    },
    {
      icon: Bot,
      title: "Role-Specific Mock Interview",
      desc: "Interactive technical and behavioral interview practice with structured, real-time evaluation tailored to the target role."
    },
    {
      icon: History,
      title: "Progress & History Tracking",
      desc: "Review past resume scans, score improvements, and interview evaluations across all your target job applications."
    }
  ];

  const steps = [
    {
      step: "01",
      title: "Upload Resume",
      desc: "Select or drag your PDF/DOCX resume file."
    },
    {
      step: "02",
      title: "Add Job Description",
      desc: "Paste target job posting requirements or pick a sample role."
    },
    {
      step: "03",
      title: "Analyze Match",
      desc: "Receive an explainable ATS match score with visual breakdowns."
    },
    {
      step: "04",
      title: "Enhance Content",
      desc: "Review side-by-side phrasing improvements with strict truthfulness."
    },
    {
      step: "05",
      title: "Practice Interview",
      desc: "Answer role-tailored interview questions and get actionable feedback."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 pb-16 lg:pt-36 lg:pb-24 bg-white border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Job Readiness & ATS Optimization Platform</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-slate-900 leading-[1.2]">
                Know how well your resume matches your <span className="text-blue-600">target job.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed mx-auto lg:mx-0">
                Upload your resume, compare it against real job descriptions, and unlock transparent match scores, actionable gap analysis, verified resume enhancement, and role-specific mock interviews.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={() => navigate('/analysis')}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-subtle flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Start Free Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>See How It Works</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>No data fabrication guarantee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Explainable ATS scoring</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-blue-600" />
                  <span>Role-specific interview prep</span>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Card Preview */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-card">
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                      Sample ATS Match Scan
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      Frontend Developer (React / TS)
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Apex Innovations
                  </span>
                </div>

                <div className="py-2">
                  <CircularScore score={78} size={135} label="Match Score" subtitle="Good Match" />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 font-medium">Core Skills Match</span>
                    <span className="text-emerald-600 font-bold">82%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 font-medium">Experience Relevance</span>
                    <span className="text-blue-600 font-bold">74%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 font-medium">ATS Keywords Alignment</span>
                    <span className="text-blue-600 font-bold">76%</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Candidate: Sarah Johnson</span>
                  <Link
                    to="/analysis/results"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View Report <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 lg:py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Structured Flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1.5">
              How CVATS Works
            </h2>
            <p className="mt-2 text-slate-600 text-xs sm:text-sm">
              A 5-step preparation pipeline designed to evaluate and improve your job application readiness.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {steps.map((item, idx) => (
              <div
                key={item.step}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-card flex flex-col justify-between"
              >
                <div>
                  <div className="text-2xl font-extrabold font-display text-blue-600/70">
                    {item.step}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                  Step {idx + 1} of 5
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1.5">
              Everything Needed for Job Readiness
            </h2>
            <p className="mt-2 text-slate-600 text-xs sm:text-sm">
              Designed with explainability, truthful enhancement, and role-specific practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="bg-white p-6 rounded-xl border border-slate-200 shadow-card hover:border-slate-300 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1.5 font-display">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
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
      <section className="py-14 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
            Ready to analyze your resume against your target role?
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto">
            Test the full ATS scan, gap analysis, grounded resume enhancement, and mock interview workflow in our interactive platform.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/analysis')}
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-subtle transition-colors inline-flex items-center gap-2"
            >
              <span>Start Free Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
