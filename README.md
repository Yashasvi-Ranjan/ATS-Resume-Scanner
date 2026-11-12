# CVATS

**AI-powered, Job-Description-based Resume Matching, Gap Analysis, Resume Enhancement and Mock Interview System for job seekers.**

Upload a resume, paste a job description, and CVATS walks you through:

**Resume parsing → JD parsing → explainable match score → gap analysis → grounded resume enhancement → role-specific mock interview → feedback and history.**

This is a tool for job seekers, not a recruiter or HR screening platform. The match score is an *estimate* and is not an official score from any employer's ATS.

---

## Features

| Stage | What it does |
|---|---|
| Resume parsing | Extracts text from PDF/DOCX and builds a structured resume (skills, experience, projects, education, certifications). Every item must trace back to the original text. You can correct parsed fields. Image-only PDFs are not supported (no OCR). |
| JD parsing | Extracts required vs. preferred skills, experience and education from the pasted job description. No hardcoded default requirements. You can correct the result. |
| Match score | Deterministic, reproducible weighted score across skills, experience, keywords, education and projects, with evidence, deductions and confidence per category. The LLM can only help classify uncertain matches, and only when it cites a real resume snippet. |
| Gap analysis | **Things to Improve** (present but weakly presented) vs. **Things to Learn/Add** (genuinely missing). Priorities, evidence, suggested actions and learning topics. Progress is saved. |
| Resume enhancement | AI rewording grounded in your original resume. A validator reverts invented skills, numbers, employers, titles, dates and credentials. Side-by-side comparison, editing, versioning, approval, TXT/DOCX download. The original upload is never modified. |
| Mock interview | Questions generated from your resume, the JD and your gaps. Answers are evaluated as coaching feedback (not hiring decisions). Sessions can be resumed, and a final report is stored. |
| History | Past analyses, enhancement versions and interview reports are restorable. |

When the AI provider is unavailable, the app reports it clearly and records a FAILED state. It never returns fabricated scores or evaluations. Browsing history and editing still work.

## Tech stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express, TypeScript, Zod
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT with bcrypt password hashing
- **Documents:** `pdf-parse` (PDF), `mammoth` (DOCX)
- **LLM:** [Groq](https://console.groq.com) (default model `openai/gpt-oss-120b`) behind a provider abstraction; OpenAI and OpenAI-compatible servers (e.g. Ollama) are also supported

## Project structure

```
backend/
  prisma/            Schema and migrations (additive)
  src/
    ai/
      llm/           Provider abstraction, retries, JSON validation, safety helpers
      skills/        Skill taxonomy and normalizer
      resume/ jd/    Parsers
      matching/      Scoring engine and analysis runner
      gap/           Gap analysis and recommendations
      enhancement/   Generation and grounding validator
      interview/     Question generation, evaluation, reports
      schemas/       Zod schemas for every AI output
    controllers/ routes/ services/ validators/ middleware/ utils/ config/
frontend/
  src/               Pages, components, context, API client
```

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally
- A Groq API key (only needed for AI features)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # then edit .env
```

Set at least these values in `backend/.env`:

```
DATABASE_URL="postgresql://<user>@localhost:5432/cvats_dev?schema=public"
JWT_SECRET="<a random string of 32+ characters>"
CORS_ORIGIN="http://localhost:5173"

LLM_PROVIDER=groq
LLM_API_KEY=<your Groq API key>
# LLM_MODEL defaults to openai/gpt-oss-120b (alternative: llama-3.3-70b-versatile)
```

Create the database, apply migrations and start the server:

```bash
createdb cvats_dev
npx prisma migrate deploy
npm run dev                    # http://localhost:5001
```

API documentation (Swagger UI) is served at `http://localhost:5001/api/v1/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

The frontend talks to `http://localhost:5001/api/v1` by default. Override it with `VITE_API_BASE_URL` in `frontend/.env`. Set `VITE_DEMO_MODE=true` to load sample data for demos. It is off by default and isolated from real workflows.

### Production build

```bash
cd backend && npm run build && npm start
cd frontend && npm run build
```

## Configuration

All variables are documented in `backend/.env.example`. The main groups:

- **Server and database:** `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`
- **Uploads:** `UPLOAD_DIR`, `MAX_FILE_SIZE_MB`
- **Rate limits:** `RATE_LIMIT_*` (per IP) and `AI_RATE_LIMIT_*` (per user, on expensive AI endpoints)
- **LLM:** `LLM_PROVIDER` (`groq | openai | openai-compatible | none`), `LLM_MODEL`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_TIMEOUT_MS`, `LLM_MAX_RETRIES` (max 3), `LLM_MAX_OUTPUT_TOKENS`, `LLM_MAX_INPUT_CHARS`, `LLM_MAX_CONCURRENT`, `LLM_MAX_QUEUE`
- **Scoring weights:** `MATCH_WEIGHT_SKILLS` / `EXPERIENCE` / `KEYWORDS` / `EDUCATION` / `PROJECTS` (defaults 0.35 / 0.25 / 0.15 / 0.10 / 0.15, normalised automatically)

With `LLM_PROVIDER=none` or no key, the app still runs and AI endpoints return `503 AI service not configured`.

## API overview

Base path `/api/v1`. Responses use `{ success, message, data, meta? }`. All routes except health and auth require `Authorization: Bearer <token>`, and every resource is scoped to its owner.

| Area | Key endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Resumes | `POST /resumes`, `POST /resumes/:id/parse`, `GET/PATCH /resumes/:id/parsed` |
| Job descriptions | `POST /job-descriptions`, `POST /job-descriptions/:id/parse`, `GET/PATCH /job-descriptions/:id/parsed` |
| Analyses | `POST /analyses` (starts a background run), `GET /analyses/:id` (poll the status), `GET /analyses/:id/result`, `POST /analyses/:id/retry` |
| Gap analysis | `GET /analyses/:id/gap-analysis`, `POST /analyses/:id/recommendations/generate`, `PATCH /recommendations/:id` |
| Enhancements | `POST /enhancements/generate`, `GET /enhancements/:id/compare`, `PATCH /enhancements/:id`, `POST /enhancements/:id/approve`, `GET /enhancements/:id/download?format=txt\|docx` |
| Interviews | `POST /interviews`, `POST /interviews/:id/generate-questions`, `POST /interviews/:id/answers`, `POST /interviews/:id/complete`, `GET /interviews/:id/report` |

Analysis status flows `PENDING → PROCESSING → COMPLETED | FAILED`.

## Trust and safety design

- LLM calls happen only on the backend, and API keys never reach the browser.
- Resumes, job descriptions and interview answers are treated as untrusted data and wrapped so that instructions inside them are not followed.
- Scores and evaluations are written only by trusted server code. The browser cannot submit them.
- LLM output is validated against schemas. Malformed responses are rejected after at most one repair attempt, and retries are bounded.
- Resume text, answers and keys are never logged.

