export const mockEnhancementData = {
  candidateName: "Sarah Johnson",
  targetRole: "Frontend Developer",
  noticeText: "Enhanced content is generated only from information already present in your resume. Always review changes before using them.",
  
  sections: [
    {
      id: "summary",
      name: "Professional Summary",
      status: "pending", // 'pending', 'accepted', 'rejected'
      original: "Frontend developer with 2+ years of experience building web applications using React and JavaScript. Worked on multiple responsive websites and integrated backend REST APIs.",
      enhanced: "Performance-driven Frontend Developer with 2.5+ years of experience building responsive, user-centric web applications using ReactJS and modern JavaScript (ES6+). Proven track record of optimizing component rendering times by 25% and delivering seamless REST API integrations across 4 production applications.",
      improvements: [
        "Replaced generic phrasing with specific years of experience (2.5+ yrs)",
        "Added measurable impact (25% render time optimization)",
        "Aligned terminology with target job description (user-centric, seamless REST API)"
      ]
    },
    {
      id: "skills",
      name: "Technical Skills",
      status: "pending",
      original: "Skills: JavaScript, React, HTML, CSS, Git, REST APIs, SQL",
      enhanced: "• Core Frontend: ReactJS, JavaScript (ES6+), HTML5, CSS3/Tailwind CSS, Responsive Web Design\n• State & APIs: Custom React Hooks, Redux Toolkit, RESTful API Integration, Axios, JSON\n• Tools & Workflows: Git/GitHub, Vite, Postman, Chrome DevTools, Agile/Scrum Methodologies\n• Foundations: SQL, Data Structures, Cross-Browser Compatibility",
      improvements: [
        "Organized raw skills list into 4 clear functional categories",
        "Highlighted high-demand keywords (Custom Hooks, Vite, Agile, Cross-Browser)",
        "Significantly improved ATS parser scannability"
      ]
    },
    {
      id: "exp_1",
      name: "Experience — Nexus Web Studio",
      status: "pending",
      items: [
        {
          id: "exp_1_item_1",
          original: "Worked on a website using React.",
          enhanced: "Developed and maintained responsive single-page web applications using ReactJS, building a modular component hierarchy that accelerated feature delivery by 30%.",
          status: "pending"
        },
        {
          id: "exp_1_item_2",
          original: "Connected frontend forms to backend APIs for user authentication and data submission.",
          enhanced: "Engineered secure REST API integrations with JWT authentication, custom hooks, and centralized error handling, reducing API round-trip latency and UI flicker.",
          status: "pending"
        },
        {
          id: "exp_1_item_3",
          original: "Helped fix bugs and improved CSS styling across mobile screens.",
          enhanced: "Diagnosed and resolved 40+ cross-browser and mobile responsive UI defects using CSS Grid and Flexbox, increasing mobile user satisfaction score to 94%.",
          status: "pending"
        }
      ]
    },
    {
      id: "projects",
      name: "Featured Projects",
      status: "pending",
      items: [
        {
          id: "proj_item_1",
          original: "Created an online store with product search and shopping cart using React hooks.",
          enhanced: "Architected modern E-Commerce web app featuring debounced product search, dynamic filtering, and client-side cart state management using React Context and LocalStorage.",
          status: "pending"
        },
        {
          id: "proj_item_2",
          original: "Built a kanban style task manager using HTML, CSS, and React.",
          enhanced: "Engineered interactive Kanban workflow manager with drag-and-drop mechanics, real-time board state persistence, and customized Tailwind UI components.",
          status: "pending"
        }
      ]
    },
    {
      id: "education",
      name: "Education",
      status: "pending",
      original: "B.S. in Computer Science - California State University (2020 - 2024)",
      enhanced: "Bachelor of Science in Computer Science | California State University (2020 – 2024) • GPA: 3.7/4.0 • Relevant Coursework: Web Engineering, Data Structures & Algorithms, Database Systems, Software Design Patterns.",
      improvements: [
        "Added academic excellence indicator (GPA 3.7)",
        "Included relevant CS coursework tailored to software engineering requirements"
      ]
    },
    {
      id: "certifications",
      name: "Certifications",
      status: "pending",
      original: "Meta Frontend Certificate, React Udemy course",
      enhanced: "• Meta Front-End Developer Professional Certificate (Meta / Coursera, 2024)\n• Modern React with Redux & Hooks Certification (Udemy, 2023)",
      improvements: [
        "Formatted credentials into standardized industry naming conventions",
        "Included credential issuing organizations and completion dates"
      ]
    }
  ]
};
