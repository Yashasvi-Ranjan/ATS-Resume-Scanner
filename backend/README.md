# CVATS Backend API (Conventional Infrastructure)

Backend service for **CVATS** — A Job-Description-Based Resume Matching, Gap Analysis, Resume Enhancement, and Mock-Interview System for Job Seekers.

> [!IMPORTANT]
> **Strict Conventional Backend Implementation (No AI/ML):**
> This backend contains **no** machine learning models, vector embeddings, NLP algorithms, or AI API dependencies. All operations manage relational data, file storage, authentication, and workflow records. Analysis and mock interview evaluation components utilize clearly structured service interfaces and placeholder states so a trusted server-side evaluation service can be plugged in modularly in the future.

---

## 1. Technology Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js (v4.21)
- **Language:** TypeScript (v5.7) with strict type-safety
- **Database:** PostgreSQL
- **ORM:** Prisma ORM (v5.22)
- **Authentication:** JWT (JSON Web Tokens) with `bcryptjs` password hashing
- **File Uploads:** Multer with modular storage abstraction (`LocalDiskStorageService` ready for S3)
- **Validation:** Zod schema validation middleware
- **API Documentation:** Swagger / OpenAPI 3.0 via `swagger-ui-express`
- **Testing:** Jest, `ts-jest`, and Supertest
- **Security:** Helmet, CORS, Express-Rate-Limit

---

## 2. Architecture & Layering

The codebase strictly adheres to a layered separation of concerns:

```
backend/
├── src/
│   ├── config/          # Environment configuration, Prisma client, Swagger spec
│   ├── controllers/     # HTTP request handlers and response dispatchers
│   ├── middleware/      # Auth (JWT), Validation (Zod), Error handling, File upload, Rate limit
│   ├── routes/          # RESTful routes mounted under /api/v1
│   ├── services/        # Business logic, ownership validation, transactions, storage
│   ├── types/           # TypeScript interfaces, Express Request augmentation
│   ├── utils/           # Standard ApiResponse, ApiError, pagination, file validators
│   ├── validators/      # Zod validation schemas for request bodies/params
│   ├── app.ts           # Express application initialization & middleware stack
│   └── server.ts        # Server bootstrap and graceful shutdown handler
├── prisma/
│   ├── schema.prisma    # Relational database schema & indexes
│   └── migrations/      # Automated SQL migrations
├── uploads/             # Local file storage (resumes/ & enhancements/)
├── tests/
│   ├── unit/            # Unit tests (validators, utilities, errors, pagination)
│   ├── integration/     # End-to-end integration tests with isolated test DB
│   └── setup.ts         # Test environment initialization and teardown
├── .env.example         # Template for environment variables
├── .env                 # Local development environment configuration
├── .env.test            # Automated test suite configuration
├── package.json         # Scripts and dependencies
└── tsconfig.json        # TypeScript configuration
```

---

## 3. Database Schema

Managed via Prisma and PostgreSQL:

- **`User`**: Account credentials (email, hashed password, name, timestamps).
- **`Resume`**: User-uploaded resumes with original & unique stored filenames, MIME types, file sizes, and storage paths.
- **`JobDescription`**: Structured job postings (title, company, description, required/preferred skills, experience, education).
- **`JobAnalysis`**: Analysis records linking resumes and job descriptions. Stores match status (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`), category scores, strengths, weaknesses, suggestions, and missing skills.
- **`AnalysisRecommendation`**: Categorized action items (`IMPROVE` or `LEARN_ADD`) with priorities (`LOW`, `MEDIUM`, `HIGH`) and tracking status (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`).
- **`ResumeEnhancement`**: Version-tracked enhanced resumes (`version`, `status`, `enhancedContent`, document reference).
- **`InterviewSession`**: Mock interview sessions (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `ABANDONED`) linked to resume and job description.
- **`InterviewQuestion`**: Questions in a session with sequence order and categories.
- **`InterviewAnswer`**: Candidate response linked uniquely per question.
- **`InterviewEvaluation`**: Score and feedback records (marked with `isMock: true`).

---

## 4. API Endpoints (`/api/v1`)

Interactive OpenAPI / Swagger documentation is available at **`http://localhost:5001/api/v1/docs`**.

### Standard Response Format

**Success (200, 201):**
```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Error (400, 401, 403, 404, 409, 413, 415, 500):**
```json
{
  "success": false,
  "message": "A descriptive error message",
  "errors": [
    { "field": "email", "message": "Invalid email address format" }
  ]
}
```

### Endpoint Reference

#### Authentication
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user | No |
| `POST` | `/api/v1/auth/login` | Login with email and password | No |
| `POST` | `/api/v1/auth/logout` | Invalidate token session | Yes |
| `GET` | `/api/v1/auth/me` | Current user profile & statistics | Yes |
| `PATCH` | `/api/v1/auth/profile` | Update profile (name, email) | Yes |
| `PATCH` | `/api/v1/auth/change-password` | Change password with current password verification | Yes |

#### Resumes
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/resumes` | Upload resume (PDF or DOCX, multipart/form-data) | Yes |
| `GET` | `/api/v1/resumes` | List uploaded resumes (paginated) | Yes |
| `GET` | `/api/v1/resumes/:id` | Get resume metadata by ID | Yes |
| `GET` | `/api/v1/resumes/:id/download` | Download resume binary file | Yes |
| `DELETE` | `/api/v1/resumes/:id` | Delete resume and file from disk | Yes |

#### Job Descriptions
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/job-descriptions` | Create structured job description | Yes |
| `GET` | `/api/v1/job-descriptions` | List user job descriptions (paginated) | Yes |
| `GET` | `/api/v1/job-descriptions/:id` | Get job description by ID | Yes |
| `PATCH` | `/api/v1/job-descriptions/:id` | Update job description fields | Yes |
| `DELETE` | `/api/v1/job-descriptions/:id` | Delete job description | Yes |

#### Job Match Analyses & Recommendations
> Evaluation results (status, scores, strengths, etc.) can only be written by a future trusted internal service (`AnalysisService.recordAnalysisEvaluation`); there is no public endpoint for it.

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/analyses` | Create a `PENDING` analysis for your own resume & job. Body is exactly `{ resumeId, jobDescriptionId }`; status is assigned server-side, scores are `null`, evaluation arrays are empty; any other field returns 400 | Yes |
| `GET` | `/api/v1/analyses` | List user analyses (paginated & filterable by status) | Yes |
| `GET` | `/api/v1/analyses/:id` | Get analysis with linked resources | Yes |
| `DELETE` | `/api/v1/analyses/:id` | Delete analysis record | Yes |
| `GET` | `/api/v1/analyses/:id/recommendations` | Get categorized recommendations | Yes |
| `POST` | `/api/v1/analyses/:id/recommendations` | Add explicit recommendation record | Yes |
| `PATCH` | `/api/v1/recommendations/:id` | Update recommendation progress status | Yes |

#### Resume Enhancements
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/enhancements` | Create enhancement (auto-increments version) | Yes |
| `GET` | `/api/v1/enhancements` | List enhancements (paginated) | Yes |
| `GET` | `/api/v1/enhancements/:id` | Get enhancement record by ID | Yes |
| `GET` | `/api/v1/enhancements/:id/versions` | List all versions for resume + job pair | Yes |
| `GET` | `/api/v1/enhancements/:id/download` | Download enhanced resume text document | Yes |

#### Mock Interview Sessions
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/interviews` | Create mock interview session | Yes |
| `GET` | `/api/v1/interviews` | List interview sessions (paginated) | Yes |
| `GET` | `/api/v1/interviews/:id` | Get interview session with questions & answers | Yes |
| `POST` | `/api/v1/interviews/:id/questions` | Add interview question | Yes |
| `POST` | `/api/v1/interviews/:id/answers` | Submit candidate answer | Yes |
| `PATCH` | `/api/v1/interviews/:id/answers/:answerId` | Update submitted answer | Yes |
| `PATCH` | `/api/v1/interviews/:id/status` | Complete or abandon interview session | Yes |
| `POST` | `/api/v1/interviews/:id/evaluations` | Record mock question evaluation | Yes |
| `GET` | `/api/v1/interviews/:id/report` | Retrieve final report with metrics & Q&A breakdown | Yes |

#### System
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | Check service health & PostgreSQL connectivity | No |

---

## 5. Getting Started & Installation

### Prerequisites
- Node.js (>= 18.x)
- PostgreSQL (>= 14.x) running locally or remotely

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` matches your PostgreSQL connection:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/cvats_dev?schema=public"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate Prisma Client & Run Migrations
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:5001`.
Swagger documentation will be available at `http://localhost:5001/api/v1/docs`.

---

## 6. Testing

The test suite runs against an isolated test database configured in `.env.test`.

```bash
# Run all tests (unit and integration)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

All 75 tests cover:
- User registration, login, token generation, and password hashing
- Validation failures, malformed input, and duplicate email prevention (409)
- Resource ownership isolation (User B cannot access or modify User A's data)
- PDF/DOCX file upload, file type/size validation, and safe downloads
- Job description CRUD operations and pagination
- Analysis record management without AI/ML calculation
- Recommendations category and status updates (`NOT_STARTED` -> `IN_PROGRESS` -> `COMPLETED`)
- Resume enhancement automated version increments (`v1`, `v2`...)
- Complete interview session lifecycle (questions, answer submissions, duplicate answer checks, evaluations, and final reports)
- System health checks and database connectivity

---

## 7. Production Build & Deployment

```bash
# Compile TypeScript to dist/
npm run build

# Start production server
npm start
```
