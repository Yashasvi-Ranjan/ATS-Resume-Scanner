export const mockInterviewQuestions = [
  {
    id: 1,
    type: "Behavioral",
    title: "Introduction & Background",
    question: "Tell us about yourself and your journey in frontend web development.",
    hint: "Focus on your technical foundation in React/JS, recent projects, and what drives you as a frontend engineer.",
    timeLimitSeconds: 120,
    sampleAnswer: "I'm a frontend developer with over 2 years of experience specializing in ReactJS, modern JavaScript, and building accessible web applications. I recently built several production-ready SPAs including an e-commerce platform and a kanban dashboard, where I focused on state management, responsive UI, and smooth REST API integrations."
  },
  {
    id: 2,
    type: "Technical",
    title: "React Fundamentals",
    question: "Explain the difference between state and props in React, and when you would use each.",
    hint: "Discuss data mutability, unidirectional data flow, component ownership, and re-rendering triggers.",
    timeLimitSeconds: 150,
    sampleAnswer: "Props (short for properties) are read-only inputs passed from a parent component down to a child component to configure it. State is an internal, mutable data store managed within the component itself using useState or useReducer. When state changes, React triggers a re-render of that component and its children."
  },
  {
    id: 3,
    type: "Technical",
    title: "React Hooks Architecture",
    question: "What are React hooks? Why were they introduced, and what are the rules of hooks?",
    hint: "Mention useState, useEffect, functional components vs class components, and top-level execution rules.",
    timeLimitSeconds: 150,
    sampleAnswer: "React hooks allow functional components to use state and lifecycle features without writing ES6 classes. They were introduced in React 16.8 to make stateful logic reusable and avoid complex wrapper hell. The two main rules are: only call hooks at the top level (never in loops or conditions) and only call hooks from React function components or custom hooks."
  },
  {
    id: 4,
    type: "Technical & Performance",
    title: "Performance Optimization",
    question: "How would you optimize the performance of a slow or laggy React application?",
    hint: "Think about React.memo, useCallback/useMemo, code splitting with React.lazy, virtualization, and bundle analysis.",
    timeLimitSeconds: 180,
    sampleAnswer: "I would start by identifying rendering bottlenecks using Chrome DevTools Performance tab and React Profiler. Solutions include: memoizing expensive calculations with useMemo, preventing unnecessary re-renders with React.memo and useCallback, code-splitting routes with React.lazy and Suspense, virtualizing long lists with react-window, and optimizing asset bundles with tree shaking."
  },
  {
    id: 5,
    type: "Technical & Networking",
    title: "REST APIs & Asynchronous Flow",
    question: "Explain how REST APIs work and how you manage asynchronous data fetching, errors, and loading states in React.",
    hint: "Discuss HTTP verbs, status codes, useEffect/custom hooks or React Query, and error boundaries.",
    timeLimitSeconds: 150,
    sampleAnswer: "REST APIs communicate over HTTP using standard methods like GET, POST, PUT, DELETE to perform CRUD operations on resources. In React, I manage asynchronous requests using custom hooks or libraries like TanStack Query/Axios, maintaining explicit state variables for data, isLoading, and error to provide immediate visual feedback to the user."
  },
  {
    id: 6,
    type: "Behavioral & Project Experience",
    title: "Technical Challenges & Problem Solving",
    question: "Describe a challenging technical bug or architecture problem you worked on and how you resolved it.",
    hint: "Use the STAR method: Situation, Task, Action, Result. Highlight debugging techniques and measurable outcomes.",
    timeLimitSeconds: 180,
    sampleAnswer: "In our e-commerce project, we experienced state synchronization bugs between multiple open tabs during cart checkout. I diagnosed the race condition, re-architected the state layer with Redux Toolkit and broadcast-channel synchronization, and added automated error fallbacks, eliminating cart sync failures entirely."
  },
  {
    id: 7,
    type: "Practical Engineering",
    title: "Frontend Debugging Strategies",
    question: "How do you systematically debug unexpected frontend issues such as UI layout breaks or hydration/render loops?",
    hint: "Mention browser dev tools, break points, network inspect, React component tree inspection, and console logging.",
    timeLimitSeconds: 150,
    sampleAnswer: "I use a structured hypothesis-driven approach. For UI bugs, I use Chrome DevTools Elements and computed styles to isolate CSS box model or specificity conflicts. For logic bugs, I use breakpoints, the React DevTools component tree inspector, and network waterfalls to verify API payload contracts."
  },
  {
    id: 8,
    type: "Behavioral & Alignment",
    title: "Role Fit & Continuous Learning",
    question: "Why are you a good fit for this Frontend Developer role at Apex Innovations, and how do you approach learning new technologies like TypeScript?",
    hint: "Connect your core strengths (React, UI/UX, APIs) to their stack and demonstrate a proactive growth mindset.",
    timeLimitSeconds: 120,
    sampleAnswer: "I bring a solid 2+ years of hands-on React development, clean component architecture, and a passion for creating polished user experiences that directly match Apex's SaaS goals. To master TypeScript and testing, I actively build type-safe side projects, study official documentation, and love pair programming with senior engineers."
  }
];

export const mockInterviewResultsData = {
  overallScore: 76,
  totalQuestions: 8,
  completedQuestions: 8,
  role: "Frontend Developer",
  company: "Apex Innovations Inc.",
  interviewDate: "2026-09-08",
  durationMinutes: 18,
  
  categories: [
    { name: "Technical Knowledge", score: 78, color: "text-blue-400", bg: "bg-blue-500" },
    { name: "Communication & Clarity", score: 82, color: "text-emerald-400", bg: "bg-emerald-500" },
    { name: "Problem Solving", score: 72, color: "text-amber-400", bg: "bg-amber-500" },
    { name: "Role & Stack Relevance", score: 75, color: "text-indigo-400", bg: "bg-indigo-500" }
  ],

  summary: "Sarah demonstrated strong core competencies in React fundamentals, component design, and professional communication. Her explanations of props vs state and REST API handling were clear and well-structured. To reach senior candidate parity, she should deepen her knowledge of advanced React performance profiling and TypeScript type systems.",

  strongAreas: [
    {
      title: "React Fundamentals & Hooks Lifecycle",
      detail: "Clear explanation of state immutability, unidirectional data flow, and hook rules."
    },
    {
      title: "Structured Communication",
      detail: "Concise responses with good technical terminology and logical structuring."
    },
    {
      title: "Practical Project Application",
      detail: "Solid demonstration of real-world REST API consumption and error handling."
    }
  ],

  weakAreas: [
    {
      title: "Advanced Performance Profiling",
      detail: "Needs deeper familiarity with React Profiler flamegraphs, render batches, and Web Vitals."
    },
    {
      title: "TypeScript & Static Type Systems",
      detail: "Candidate is transitioning to TypeScript and needs more confidence explaining generics & union types."
    },
    {
      title: "Automated Testing Methodologies",
      detail: "Could expand on mocking API calls in Jest/React Testing Library and integration test suites."
    }
  ],

  questionsReview: [
    {
      questionId: 1,
      question: "Tell us about yourself and your journey in frontend web development.",
      score: 85,
      verdict: "Strong",
      feedback: "Great enthusiasm and clear trajectory highlighting React projects and frontend passion.",
      revisionTopic: "Refine elevator pitch to include 1 measurable career milestone."
    },
    {
      questionId: 2,
      question: "Explain the difference between state and props in React.",
      score: 88,
      verdict: "Excellent",
      feedback: "Accurate distinction between mutable internal state and immutable external props.",
      revisionTopic: "Props drilling alternatives (Context / Redux)."
    },
    {
      questionId: 3,
      question: "What are React hooks? Why were they introduced?",
      score: 80,
      verdict: "Strong",
      feedback: "Accurately recited hook rules and reasons behind functional component adoption.",
      revisionTopic: "Deep dive into custom hook abstraction patterns."
    },
    {
      questionId: 4,
      question: "How would you optimize the performance of a slow React application?",
      score: 68,
      verdict: "Needs Revision",
      feedback: "Mentioned memoization and lazy loading, but lacked detail on profiling tools and re-render triggers.",
      revisionTopic: "React 18 concurrent features, useMemo vs useCallback benchmarks, and virtual list rendering."
    },
    {
      questionId: 5,
      question: "Explain REST APIs and asynchronous data management in React.",
      score: 78,
      verdict: "Good",
      feedback: "Well-explained loading and error states. Could mention HTTP caching headers.",
      revisionTopic: "Optimistic UI updates and cache invalidation strategies."
    },
    {
      questionId: 6,
      question: "Describe a challenging technical bug and how you resolved it.",
      score: 74,
      verdict: "Good",
      feedback: "Good project context. Make sure to emphasize the root-cause diagnosis step more clearly.",
      revisionTopic: "Structuring behavioral stories using the STAR methodology."
    },
    {
      questionId: 7,
      question: "How do you systematically debug unexpected frontend issues?",
      score: 72,
      verdict: "Good",
      feedback: "Solid use of DevTools. Could incorporate network throttling and memory leak debugging.",
      revisionTopic: "Chrome Performance Profiler & Memory snapshot analysis."
    },
    {
      questionId: 8,
      question: "Why are you a good fit for this role and how do you learn new tech like TypeScript?",
      score: 76,
      verdict: "Good",
      feedback: "Shows positive learning attitude and alignment with frontend tech stack.",
      revisionTopic: "Showcasing active learning through GitHub open-source contributions."
    }
  ]
};
