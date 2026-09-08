export const mockAnalysisResult = {
  overallScore: 78,
  verdict: "Good Match",
  explanation: "You meet most of the core requirements, but there are several high-impact areas you can improve to significantly increase your interview callback rate.",
  jobTitle: "Frontend Developer (React / TypeScript)",
  company: "Apex Innovations Inc.",
  scanDate: "2026-09-08",
  fileName: "resume_sarah_johnson.pdf",
  
  breakdown: [
    {
      category: "Skills Match",
      score: 82,
      weight: "35%",
      status: "high",
      summary: "Strong overlap in React, JavaScript, HTML5/CSS3, and RESTful API integration."
    },
    {
      category: "Experience Match",
      score: 74,
      weight: "25%",
      status: "medium",
      summary: "Candidate has 2+ years relevant experience, but JD asks for TypeScript & testing depth."
    },
    {
      category: "Keywords Alignment",
      score: 76,
      weight: "15%",
      status: "medium",
      summary: "Found 19 of 25 priority ATS keywords; missing TypeScript, Docker, and Jest."
    },
    {
      category: "Education Relevance",
      score: 90,
      weight: "10%",
      status: "high",
      summary: "B.S. in Computer Science (GPA 3.7) directly satisfies qualification requirements."
    },
    {
      category: "Project Relevance",
      score: 72,
      weight: "15%",
      status: "medium",
      summary: "E-Commerce and dashboard projects are highly relevant but lack quantified metric outcomes."
    }
  ],

  strengths: [
    {
      title: "Core ReactJS & JavaScript Proficiency",
      description: "Demonstrated production experience with React component lifecycles, custom hooks, and modern ES6+ features.",
      tag: "Core Skill"
    },
    {
      title: "REST API & Asynchronous Data Flow",
      description: "Proven capability to connect UI views to remote APIs with error handling and loading indicators.",
      tag: "API Integration"
    },
    {
      title: "Responsive & Modern UI Construction",
      description: "Extensive background building responsive layouts with CSS3, Flexbox/Grid, and Tailwind CSS.",
      tag: "Design / CSS"
    },
    {
      title: "Relevant Academic Background & Projects",
      description: "Solid Computer Science degree with practical full-lifecycle web applications.",
      tag: "Foundation"
    },
    {
      title: "Problem Solving & Version Control",
      description: "Active use of Git version control, branch management, and collaborative code reviews.",
      tag: "Workflow"
    }
  ],

  improvements: [
    {
      title: "Quantify Measurable Project Impact",
      description: "Replace generic activity phrasing (e.g., 'Worked on a website') with specific metrics (e.g., 'Reduced initial load time by 25%').",
      impact: "High Impact",
      section: "Experience"
    },
    {
      title: "Elevate State Management & Architectural Scope",
      description: "Explicitly highlight architectural patterns used, such as Redux Toolkit slices, Context API, or React Query caching.",
      impact: "Medium Impact",
      section: "Projects"
    },
    {
      title: "Enhance ATS Keyword Density",
      description: "Incorporate critical keywords from the JD such as 'Component Lifecycle', 'Cross-Browser Compatibility', and 'Code Review'.",
      impact: "High Impact",
      section: "Summary & Skills"
    },
    {
      title: "Clarify Individual Engineering Contributions",
      description: "State clearly what parts you engineered from scratch versus maintained or refactored.",
      impact: "Medium Impact",
      section: "Experience"
    }
  ],

  learnAndAdd: [
    {
      skill: "TypeScript",
      importance: "Critical (Required in JD)",
      reason: "Apex Innovations specifically requires TypeScript for scalable frontend development.",
      action: "Add TypeScript types/interfaces to one of your React portfolio projects and mention TS in your skills list."
    },
    {
      skill: "Unit & Component Testing (Jest / RTL)",
      importance: "High (Required in JD)",
      reason: "JD emphasizes writing unit tests with React Testing Library to ensure high component reliability.",
      action: "Learn basic Jest tests for React components and document test coverage on your projects."
    },
    {
      skill: "Docker Containerization",
      importance: "Medium (Bonus in JD)",
      reason: "JD lists Docker exposure as a valuable bonus for local development and CI/CD parity.",
      action: "Create a basic Dockerfile for a React project and note familiarity with containerized dev environments."
    },
    {
      skill: "CI/CD Deployment Concepts",
      importance: "Medium (Preferred in JD)",
      reason: "Understanding GitHub Actions or automated deployment pipelines strengthens mid-level candidacy.",
      action: "Set up automated GitHub Action build & test workflows on your repository."
    }
  ]
};
