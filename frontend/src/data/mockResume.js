export const mockCandidateProfile = {
  name: "Sarah Johnson",
  email: "sarah.johnson@email.com",
  phone: "+1 (555) 234-5678",
  location: "San Francisco, CA",
  targetRole: "Frontend Developer",
  experienceLevel: "Mid-Level (2-3 years)",
  headline: "Frontend Developer passionate about building high-performance React applications with intuitive UI/UX.",
  skills: [
    "JavaScript (ES6+)",
    "ReactJS",
    "HTML5",
    "CSS3 / Sass",
    "Git / GitHub",
    "REST APIs",
    "SQL",
    "Responsive Design",
    "Redux Toolkit",
    "Tailwind CSS"
  ]
};

export const mockDefaultResumeFile = {
  name: "resume_sarah_johnson.pdf",
  size: "245 KB",
  lastModified: "2026-08-25",
  type: "application/pdf"
};

export const mockResumeSections = {
  summary: {
    title: "Professional Summary",
    original: "Frontend developer with 2+ years of experience building web applications using React and JavaScript. Worked on multiple responsive websites and integrated backend REST APIs.",
    enhanced: "Performance-driven Frontend Developer with 2.5+ years of experience building responsive, user-centric web applications using ReactJS and modern JavaScript (ES6+). Proven track record of optimizing component rendering times by 25% and delivering seamless REST API integrations across 4 production applications."
  },
  experience: [
    {
      id: "exp-1",
      role: "Junior Frontend Developer",
      company: "Nexus Web Studio",
      period: "2024 - Present",
      bullets: [
        {
          id: "exp-1-1",
          original: "Worked on a website using React.",
          enhanced: "Developed responsive single-page web applications using ReactJS and React Router, creating reusable component libraries that reduced UI development time by 30%."
        },
        {
          id: "exp-1-2",
          original: "Connected frontend forms to backend APIs for user authentication and data submission.",
          enhanced: "Architected asynchronous REST API integration layer using Axios and custom React hooks with comprehensive error handling and optimistic UI updates."
        },
        {
          id: "exp-1-3",
          original: "Helped fix bugs and improved CSS styling across mobile screens.",
          enhanced: "Resolved 40+ cross-browser and mobile responsiveness defects using modern CSS Grid/Flexbox, elevating mobile usability scores from 68% to 94%."
        }
      ]
    }
  ],
  projects: [
    {
      id: "proj-1",
      name: "E-Commerce Storefront Platform",
      bullets: [
        {
          id: "proj-1-1",
          original: "Created an online store with product search and shopping cart.",
          enhanced: "Engineered high-performance e-commerce storefront with client-side fuzzy search, shopping cart persistence with LocalStorage, and dynamic checkout flow."
        },
        {
          id: "proj-1-2",
          original: "Used React hooks and state to manage items in the cart.",
          enhanced: "Implemented centralized state management utilizing Redux Toolkit, ensuring zero race conditions across multi-tab cart synchronizations."
        }
      ]
    },
    {
      id: "proj-2",
      name: "Task & Project Tracker Dashboard",
      bullets: [
        {
          id: "proj-2-1",
          original: "Built a kanban style task manager using HTML, CSS, and React.",
          enhanced: "Built an interactive Kanban-style project management dashboard featuring drag-and-drop task workflows, tag filtering, and real-time status indicators."
        }
      ]
    }
  ],
  skills: {
    technical: ["ReactJS", "JavaScript (ES6+)", "HTML5", "CSS3 / Tailwind", "Git", "REST APIs", "SQL", "Webpack / Vite"],
    tools: ["GitHub", "VS Code", "Postman", "Figma", "npm / yarn"]
  },
  education: {
    degree: "B.S. in Computer Science",
    institution: "California State University",
    year: "2020 - 2024",
    gpa: "3.7 / 4.0"
  },
  certifications: [
    {
      name: "Meta Front-End Developer Professional Certificate",
      issuer: "Coursera / Meta",
      year: "2024"
    },
    {
      name: "Modern React with Redux",
      issuer: "Udemy",
      year: "2023"
    }
  ]
};
