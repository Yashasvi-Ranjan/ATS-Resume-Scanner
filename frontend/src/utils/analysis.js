export const MATCH_LABEL = 'Estimated ATS/Job Match Score';
export const MATCH_DISCLAIMER = 'Estimated score; not an official score from any employer ATS.';

export const CATEGORY_LABELS = {
  skills: 'Skills Match',
  experience: 'Experience Match',
  keywords: 'Keywords Alignment',
  education: 'Education Relevance',
  projects: 'Project Relevance'
};

export const toScore = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function getVerdict(score) {
  if (score == null) return null;
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'Low';
}

export const toIsoDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

/**
 * Compact summary of an analysis record, used by the dashboard/context.
 * Only real values from the backend record are used; nothing is invented.
 */
export function buildAnalysisSummary(rec) {
  if (!rec) return null;
  const result = rec.resultData && typeof rec.resultData === 'object' ? rec.resultData : null;
  const overallScore = toScore(result?.overallScore ?? rec.overallScore);
  const breakdown = result?.categories
    ? Object.entries(CATEGORY_LABELS).map(([key, label]) => {
        const c = result.categories[key];
        return {
          category: label,
          score: c && !c.notAssessable ? toScore(c.score) : null,
          weight: c && typeof c.weight === 'number' ? `${Math.round(c.weight * 100)}%` : undefined,
          summary: c?.explanation
        };
      })
    : [];
  return {
    id: rec.id,
    status: rec.status,
    errorMessage: rec.errorMessage || null,
    jobTitle: rec.jobDescription?.title || 'Untitled role',
    company: rec.jobDescription?.companyName || '',
    fileName: rec.resume?.originalFilename || '',
    scanDate: toIsoDate(rec.createdAt),
    overallScore,
    verdict: getVerdict(overallScore),
    explanation: null,
    breakdown
  };
}
