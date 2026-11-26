# Work Journal: Yashasvi Ranjan

**Role:** Backend and database
**Project:** CVATS, the AI-powered resume matching and mock interview system

---

## What I worked on

I built the backend and the database, and I connected the frontend to it. I also did the early project setup: the proposal, Gantt chart, use case diagram and a first activity diagram.

First integration of the frontend and backend. Express + TypeScript, with Zod validation on requests and JWT auth with bcrypt for passwords.

I added the README, fixed a CORS problem that was blocking the frontend, and ran the first Prismamigration.

Reworked resume parsing and the interview module, and changed the database schema. I added `vercel.json` so the frontend could be deployed.


### Structure

The backend is split into routes, controllers, services and validators. Middleware covers auth, file uploads, rate limiting, validation and error handling. File uploads are checked before anything gets parsed.

### Database

PostgreSQL with Prisma. The models are User, Resume, JobDescription, JobAnalysis, AnalysisRecommendation, ResumeEnhancement and the interview tables (Session, Question, Answer, Evaluation). I used status enums such as analysis and parse status so a failed AI call is saved as FAILED instead of returning made-up results. That was a deliberate choice: the app should never fabricate a score.
