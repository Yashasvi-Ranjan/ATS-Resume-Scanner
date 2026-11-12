import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { getLlmService, hashInput, safeErrorMessage, toApiError } from '../llm';
import { ParsedJobDescription, parsedJobDescriptionSchema } from '../schemas/jobDescription.schema';
import { normalizeSkill } from '../skills';
import { getEffectiveJdData } from './effective';
import { JD_PARSER_VERSION, parseJdText } from './jdParser';

type JdRecord = NonNullable<Awaited<ReturnType<typeof prisma.jobDescription.findUnique>>>;

/** A PROCESSING row untouched for this long is treated as a crashed run. */
const STALE_PROCESSING_MS = 5 * 60 * 1000;

export function computeDescriptionHash(description: string): string {
  return hashInput(description, JD_PARSER_VERSION);
}

export function isParseCurrent(jd: Pick<JdRecord, 'parseStatus' | 'parsedData' | 'descriptionHash' | 'description' | 'parserVersion'>): boolean {
  return (
    jd.parseStatus === 'PARSED' &&
    !!jd.parsedData &&
    jd.parserVersion === JD_PARSER_VERSION &&
    jd.descriptionHash === computeDescriptionHash(jd.description)
  );
}

/** Legacy flat values derived from parsed data. */
export function deriveLegacy(d: ParsedJobDescription) {
  const exp = d.experienceRequirements
    .map((e) => e.evidence)
    .filter(Boolean)
    .join('; ');
  const edu = d.educationRequirements
    .map((e) => e.evidence)
    .filter(Boolean)
    .join('; ');
  return {
    requiredSkills: d.requiredSkills.map((s) => s.canonical || s.name),
    preferredSkills: d.preferredSkills.map((s) => s.canonical || s.name),
    experienceRequirements: exp ? exp.slice(0, 1000) : null,
    educationRequirements: edu ? edu.slice(0, 1000) : null
  };
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** True when the legacy columns were never set by the user (empty, or equal to what an earlier parse derived). */
export function legacyIsAutomatic(jd: JdRecord): boolean {
  const empty =
    jd.requiredSkills.length === 0 && jd.preferredSkills.length === 0 && !jd.experienceRequirements && !jd.educationRequirements;
  if (empty) return true;
  const prev = jd.parsedData ? parsedShape(jd.parsedData) : null;
  if (!prev) return false;
  const d = deriveLegacy(prev);
  return (
    same(jd.requiredSkills, d.requiredSkills) &&
    same(jd.preferredSkills, d.preferredSkills) &&
    (jd.experienceRequirements ?? null) === d.experienceRequirements &&
    (jd.educationRequirements ?? null) === d.educationRequirements
  );
}

function parsedShape(v: unknown): ParsedJobDescription | null {
  const r = parsedJobDescriptionSchema.safeParse(v);
  return r.success ? r.data : null;
}

async function loadOwned(userId: string, id: string): Promise<JdRecord> {
  const jd = await prisma.jobDescription.findUnique({ where: { id } });
  if (!jd) throw ApiError.notFound('Job description not found');
  if (jd.userId !== userId) throw ApiError.forbidden('You do not have permission to access this job description');
  return jd;
}

export class JdParserService {
  static async parseJobDescription(
    userId: string,
    jdId: string,
    opts: { force?: boolean; resetEdits?: boolean } = {}
  ): Promise<JdRecord> {
    const jd = await loadOwned(userId, jdId);

    if (!opts.force && isParseCurrent(jd)) {
      if (opts.resetEdits && jd.userEditedData) {
        return prisma.jobDescription.update({ where: { id: jdId }, data: { userEditedData: Prisma.DbNull } });
      }
      return jd; // cache hit: no LLM call
    }

    // Atomic claim guards against duplicate concurrent parses.
    const claimed = await prisma.jobDescription.updateMany({
      where: {
        id: jdId,
        OR: [{ parseStatus: { not: 'PROCESSING' } }, { updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) } }]
      },
      data: { parseStatus: 'PROCESSING', parseError: null }
    });
    if (claimed.count === 0) throw ApiError.conflict('This job description is already being parsed');

    try {
      const llm = getLlmService();
      const { data, meta } = await parseJdText(llm, { title: jd.title, description: jd.description });

      // Never overwrite user-supplied legacy values.
      const legacy = legacyIsAutomatic(jd) ? deriveLegacy(data) : {};
      const clearEdits = opts.resetEdits ? { userEditedData: Prisma.DbNull } : {};

      return await prisma.jobDescription.update({
        where: { id: jdId },
        data: {
          parseStatus: 'PARSED',
          parseError: null,
          parsedData: data as unknown as Prisma.InputJsonValue,
          parsedAt: new Date(),
          parserVersion: JD_PARSER_VERSION,
          descriptionHash: computeDescriptionHash(jd.description),
          ...clearEdits,
          ...legacy
        }
      });
    } catch (err) {
      await prisma.jobDescription
        .update({ where: { id: jdId }, data: { parseStatus: 'FAILED', parseError: safeErrorMessage(err) } })
        .catch(() => undefined);
      throw toApiError(err);
    }
  }

  /** Return the JD with a current parse, parsing it first if needed. Throws mapped ApiError when parsing fails. */
  static async ensureJdParsed(userId: string, jdId: string): Promise<JdRecord> {
    const jd = await loadOwned(userId, jdId);
    if (isParseCurrent(jd)) return jd;
    return JdParserService.parseJobDescription(userId, jdId);
  }

  static async getParsed(userId: string, jdId: string) {
    const jd = await loadOwned(userId, jdId);
    return {
      parseStatus: jd.parseStatus,
      parseError: jd.parseError,
      parsedData: jd.parsedData ?? null,
      userEditedData: jd.userEditedData ?? null,
      effective: getEffectiveJdData(jd),
      parsedAt: jd.parsedAt,
      parserVersion: jd.parserVersion
    };
  }

  static async saveEdits(userId: string, jdId: string, edits: ParsedJobDescription) {
    await loadOwned(userId, jdId);
    const normalized: ParsedJobDescription = {
      ...edits,
      requiredSkills: edits.requiredSkills.map((s) => ({ ...s, canonical: normalizeSkill(s.canonical || s.name) })),
      preferredSkills: edits.preferredSkills.map((s) => ({ ...s, canonical: normalizeSkill(s.canonical || s.name) }))
    };
    await prisma.jobDescription.update({
      where: { id: jdId },
      data: { userEditedData: normalized as unknown as Prisma.InputJsonValue }
    });
    return JdParserService.getParsed(userId, jdId);
  }
}

export const parseJobDescription = JdParserService.parseJobDescription;
export const ensureJdParsed = JdParserService.ensureJdParsed;
