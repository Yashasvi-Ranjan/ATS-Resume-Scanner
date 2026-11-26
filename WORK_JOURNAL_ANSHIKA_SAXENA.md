# Work Journal: Anshika Saxena

**Role:** Frontend and diagrams  
**Project:** CVATS, the AI-powered resume matching and mock interview system

---

## What I worked on

Most of my time went into the diagrams for the project. I also helped on the frontend, mainly the screens that needed to match what the diagrams described.

- **Activity diagram:** I started with this one. I deleted my first version and redid it after realising I'd left out the failure path, where the AI provider is down and the analysis is marked FAILED.
- **DFD:** I went through three versions (v2 and a messy "(1) (1)" copy before it). Level 0, 1 and 2 are now exported as PNGs. Level 2 took the longest because I had to decide how much detail was too much.
- **Class diagram:** Built from the database models: User, Resume, JobDescription, JobAnalysis, the enhancement and the interview classes. I checked it against Yashasvi's Prisma schema so the names matched.
- **Component diagram:** Shows how the frontend, backend, database and LLM provider connect.
- **Swimlane, sequence/collaboration and deployment diagrams:** Added later, once the deployment setup was clear.

## Frontend

I worked with Taniksha on the page layouts and components, mostly spacing and the upload and score screens. I wasn't the main person on this. I was the second pair of eyes who said "this doesn't look like the wireframe."
