export const mockGapAnalysisData = {
  jobTitle: "Frontend Developer (React / TypeScript)",
  company: "Apex Innovations Inc.",
  overallScore: 78,
  
  strongMatches: [
    {
      id: "sm-1",
      skill: "ReactJS",
      status: "Present & Strong",
      importance: "High",
      reason: "Resume demonstrates 2+ years building single-page apps, reusable components, and stateful UIs.",
      recommendation: "Keep prominently featured at the top of your technical skills section."
    },
    {
      id: "sm-2",
      skill: "JavaScript (ES6+)",
      status: "Present & Strong",
      importance: "High",
      reason: "Strong foundation in async/await, closures, promises, and array methods reflected in project work.",
      recommendation: "Highlight any ESNext features or modular patterns you leveraged."
    },
    {
      id: "sm-3",
      skill: "REST API Integration",
      status: "Present & Strong",
      importance: "High",
      reason: "Experience consuming backend APIs and handling response life-cycles in React.",
      recommendation: "Mention specific handling of error boundaries and loading states."
    },
    {
      id: "sm-4",
      skill: "Git & Version Control",
      status: "Present & Strong",
      importance: "Medium",
      reason: "Candidate uses Git for branch workflows and project code repositories.",
      recommendation: "Emphasize collaboration, PR reviews, and merge conflict resolution."
    },
    {
      id: "sm-5",
      skill: "Responsive Design (CSS/Tailwind)",
      status: "Present & Strong",
      importance: "Medium",
      reason: "Solid expertise with Flexbox, CSS Grid, mobile-first design, and utility-first styling.",
      recommendation: "Showcase responsive mobile usability scores or accessibility achievements."
    }
  ],

  improve: [
    {
      id: "imp-1",
      skill: "Quantified Impact & Project Metrics",
      status: "Weakly Represented",
      importance: "High",
      reason: "Current resume describes daily activities rather than business or performance results achieved.",
      recommendation: "Rephrase bullet points using Google's X-Y-Z formula: 'Accomplished [X] as measured by [Y], by doing [Z]'."
    },
    {
      id: "imp-2",
      skill: "State Management & Complex State Patterns",
      status: "Weakly Represented",
      importance: "Medium",
      reason: "Resume mentions standard React state, but JD seeks scalable state architecture.",
      recommendation: "Specify use of Redux Toolkit, Context API, or React Query for caching server state."
    },
    {
      id: "imp-3",
      skill: "ATS Keyword Alignment",
      status: "Partially Present",
      importance: "High",
      reason: "Several key phrases from the JD ('Component Architecture', 'Cross-Browser Testing', 'Agile Sprints') are absent.",
      recommendation: "Incorporate natural variations of these JD keywords throughout your experience bullets."
    },
    {
      id: "imp-4",
      skill: "Technical Contribution Ownership",
      status: "Needs Clarification",
      importance: "Medium",
      reason: "Statements like 'Helped fix bugs' minimize your actual engineering ownership.",
      recommendation: "Use strong active action verbs: 'Engineered', 'Architected', 'Diagnosed and resolved'."
    }
  ],

  learnAndAdd: [
    {
      id: "la-1",
      skill: "TypeScript",
      status: "Missing from Resume",
      importance: "High",
      reason: "The job description lists TypeScript as a required core technology for new frontend modules.",
      recommendation: "Learn TypeScript fundamentals (types, interfaces, generics) and convert or demonstrate a small React + TypeScript repository."
    },
    {
      id: "la-2",
      skill: "Unit Testing (Jest & React Testing Library)",
      status: "Missing from Resume",
      importance: "High",
      reason: "JD specifies writing automated unit and integration tests for React components.",
      recommendation: "Practice writing basic unit tests with Jest/RTL for form validations and interactive UI flows."
    },
    {
      id: "la-3",
      skill: "Docker Basics",
      status: "Missing from Resume",
      importance: "Medium",
      reason: "The engineering team uses containerized dev environments to maintain parity across machines.",
      recommendation: "Learn to containerize a React + Vite app with a multi-stage Dockerfile and add 'Docker (Dev Workflow)' to your skills."
    },
    {
      id: "la-4",
      skill: "CI/CD & Automated Pipelines",
      status: "Missing from Resume",
      importance: "Low",
      reason: "Preferred skill for continuous delivery of frontend assets.",
      recommendation: "Familiarize yourself with GitHub Actions for linting and automated test runs on pull requests."
    }
  ]
};
