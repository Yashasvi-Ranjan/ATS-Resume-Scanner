import { UNTRUSTED_DATA_POLICY, wrapUntrusted } from '../llm';
import { ParsedJobDescription } from '../schemas/jobDescription.schema';
import { NormalizedResume } from './sourceIndex';
import { expDates, eduDates } from './sourceIndex';

export const ENHANCE_SYSTEM = [
  'You improve the wording of a candidate\'s EXISTING resume for ATS readability and relevance to a target job. You are an editor, not an author.',
  UNTRUSTED_DATA_POLICY,
  'ABSOLUTE RULES (a deterministic checker will revert any violation):',
  '- Use ONLY facts present in the RESUME block. The JOB block tells you which existing content to emphasise; it is NEVER a source of facts.',
  '- Never add or change employers, job titles, dates, degrees, institutions, certifications, skills, tools, technologies, projects, responsibilities or achievements.',
  '- Never add any number, percentage, currency amount, year or other metric that is not already in the cited source text. If a bullet would benefit from a metric, put a metricSuggestions note (no digits) instead.',
  '- Never add a skill or keyword because the job mentions it. Use job terminology only when it is a plain synonym of something the resume already states.',
  '- Do not claim leadership, ownership or scope the source does not state.',
  '- Allowed: fix grammar, clarify, use stronger action verbs, tighten, remove redundancy, merge near-duplicate bullets from the SAME entry, reorder existing content, emphasise genuine accomplishments.',
  '- Every enhanced bullet MUST list sourceIds: the ids of the original bullet(s) in the SAME entry it is derived from. Entries cite their own sourceId. summary uses sourceIds ["summary"].',
  '- Keep entries, employers, titles, dates, degrees and certifications exactly as in the resume (copy them verbatim). Only include an entry if it exists in the resume.',
  '- If the resume has no summary, return summary: null. Do not write a new one.',
  'Output a single JSON object, no markdown, with this shape:',
  '{"summary":{"text","sourceIds":["summary"],"changeType","justification"}|null,',
  ' "skills":[names taken from the resume skills],',
  ' "experience":[{"sourceId","title","company","dates","bullets":[{"text","sourceIds":[],"changeType":"reworded|unchanged|reordered|merged|removed_redundant","justification"}],"removed":[{"sourceId","reason"}]}],',
  ' "projects":[{"sourceId","name","technologies":[],"description":{...}|null,"bullets":[{...}],"removed":[]}],',
  ' "education":[{"sourceId","institution","degree","field","dates"}],',
  ' "certifications":[{"sourceId","name","issuer","date"}],',
  ' "achievements":[{"text","sourceIds":[],"changeType","justification"}],',
  ' "metricSuggestions":[{"sourceId","suggestion"}]}',
  'The justification must say, in one short sentence, what changed and why it is supported by the original.'
].join('\n');

export function buildResumeView(n: NormalizedResume): unknown {
  const r = n.resume;
  return {
    summary: r.summary ? { id: 'summary', text: r.summary } : null,
    skills: r.skills.map((s) => s.name),
    experience: r.experience.map((e) => ({
      id: e.id,
      title: e.title ?? null,
      company: e.company,
      location: e.location ?? null,
      dates: expDates(e),
      skillsUsed: e.skillsUsed,
      bullets: e.bullets.map((b) => ({ id: b.id, text: b.text }))
    })),
    projects: r.projects.map((p) => ({
      id: p.id,
      name: p.name,
      technologies: p.technologies,
      description: p.description ? { id: `${p.id}-d`, text: p.description } : null,
      bullets: p.bullets.map((b, j) => ({ id: `${p.id}-b${j + 1}`, text: b }))
    })),
    education: r.education.map((e) => ({
      id: e.id,
      institution: e.institution,
      degree: e.degree ?? null,
      field: e.field ?? null,
      dates: eduDates(e)
    })),
    certifications: r.certifications.map((c, i) => ({ id: `cert-${i + 1}`, name: c.name, issuer: c.issuer ?? null, date: c.date ?? null })),
    achievements: r.achievements.map((a, i) => ({ id: `ach-${i + 1}`, text: a.text }))
  };
}

export function buildJobView(jd: ParsedJobDescription, emphasis: string[]): unknown {
  return {
    jobTitle: jd.jobTitle,
    requiredSkills: jd.requiredSkills.map((s) => s.name),
    preferredSkills: jd.preferredSkills.map((s) => s.name),
    responsibilities: jd.responsibilities.slice(0, 20),
    domainKeywords: jd.domainKeywords.slice(0, 30),
    requirementsAlreadyMatchedByResume: emphasis
  };
}

export function buildEnhanceUserPrompt(n: NormalizedResume, jd: ParsedJobDescription, emphasis: string[]): string {
  return [
    'Enhance the resume below for the target job, following the rules.',
    wrapUntrusted('resume', JSON.stringify(buildResumeView(n))),
    wrapUntrusted('job', JSON.stringify(buildJobView(jd, emphasis))),
    'Return the JSON object now.'
  ].join('\n\n');
}
