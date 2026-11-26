# Work Journal: Kamesh

**Role:** AI/ML  
**Project:** CVATS, the AI-powered resume matching and mock interview system

---

## What I worked on

I worked on the AI and ML side: everything that reads resumes and job descriptions, scores them, and generates feedback. The code is in `backend/src/ai`.

## How the AI part is organised

I split it by task, so each stage can be changed or tested on its own:

- **Resume parsing:** Extracts text from PDF and DOCX, then builds a structured resume (skills, experience, projects, education, certifications). Each item has to trace back to the original text.
- **JD parsing:** Pulls out required vs. preferred skills, experience and education. A deterministic pass runs first, and the LLM helps after that.
- **Matching and scoring:** A weighted score across skills, experience, keywords, education and projects. I made it deterministic on purpose, so the same inputs always give the same score. The LLM only helps classify uncertain matches, and only if it can point to a real snippet from the resume.
- **Skills taxonomy:** A list of skills and their aliases so "JS" and "JavaScript" count as the same thing.
- **Gap analysis:** Separates "Things to Improve" (the skill is there but weakly presented) from "Things to Learn/Add" (it's actually missing).
- **Resume enhancement:** Rewords bullets using the original resume only. A grounding validator reverts anything invented, such as new skills, numbers, employers, dates or credentials.
- **Mock interview:** Generates questions from the resume, the JD and the gaps, then gives coaching-style feedback on answers and a final report.
- **LLM layer:** A provider abstraction (Groq by default, with OpenAI and Ollama-style servers supported), JSON output handling, error types, and a semaphore to limit concurrent calls.
