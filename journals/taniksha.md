# Work Journal: Taniksha

**Role:** Frontend and documentation
**Project:** CVATS, the AI-powered resume matching and mock interview system

---

## What I worked on

I built a good part of the frontend and wrote most of the documentation, including the project report.

I added the first version of the frontend in early September. It was a React + Vite + Tailwind setup with the basic structure: routing, a header and footer, and a dashboard layout. Nothing was connected to a real backend yet, so I used demo data to make the screens look real.

The components I built early on:

- File uploader for the resume (PDF/DOCX)
- Circular score component for the match score
- Panel for showing the parsed job description
- Loading modal, because AI calls take a few seconds and a blank screen looked broken


## Documentation

- Wrote and organised the project report in LaTeX (`docs/Project_Report`) using the college template, with the bibliography in `references.bib`.
- Pulled in Anshika's diagrams and wrote the text that explains them.
- Described each stage of the system in plain language: resume parsing, JD parsing, scoring, gap analysis, enhancement, mock interview.
- Helped keep the README in step with what the app really does, including the limits (no OCR for image-only PDFs, and the score is an estimate and not a real ATS score).
