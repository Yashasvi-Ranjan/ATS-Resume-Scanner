import { LlmService } from '../llm';
import { ParsedJobDescription } from '../schemas/jobDescription.schema';
import { MatchResult } from '../schemas/match.schema';
import { StructuredResume } from '../schemas/resume.schema';
import {
  ChangeMap,
  ENHANCEMENT_PROMPT_VERSION,
  EnhancementLlmOutputSchema,
  EnhancedResume,
  GroundingReport
} from '../schemas/enhancement.schema';
import { groundEnhancement } from './groundingValidator';
import { buildEnhanceUserPrompt, ENHANCE_SYSTEM } from './prompt';
import { normalizeResume } from './sourceIndex';

export const ENHANCE_TASK = 'resume_enhance';

export interface EnhancementGenerationInput {
  resume: StructuredResume;
  extractedText?: string | null;
  jd: ParsedJobDescription;
  match?: MatchResult | null;
  inputHash?: string | null;
}

export interface EnhancementGenerationResult {
  structured: EnhancedResume;
  changeMap: ChangeMap;
  report: GroundingReport;
  text: string;
  acceptedCount: number;
  modelInfo: string;
}

/** Names of JD requirements the resume already satisfies (emphasis hints only; never a fact source). */
export function emphasisFromMatch(match?: MatchResult | null): string[] {
  if (!match) return [];
  return [...match.requirements.matched, ...match.requirements.partial].map((r) => r.requirement).slice(0, 30);
}

export class EnhancementGenerator {
  constructor(private readonly llm: LlmService) {}

  /** ONE LLM call, then deterministic grounding. Throws AiError subclasses from the LLM layer unchanged. */
  async generate(input: EnhancementGenerationInput): Promise<EnhancementGenerationResult> {
    const norm = normalizeResume(input.resume, input.extractedText);
    const { data, meta } = await this.llm.generateJson({
      task: ENHANCE_TASK,
      promptVersion: ENHANCEMENT_PROMPT_VERSION,
      system: ENHANCE_SYSTEM,
      user: buildEnhanceUserPrompt(norm, input.jd, emphasisFromMatch(input.match)),
      schema: EnhancementLlmOutputSchema,
      maxOutputTokens: 6000,
      temperature: 0.2
    });
    const outcome = groundEnhancement(input.resume, data, {
      extractedText: input.extractedText,
      inputHash: input.inputHash ?? null
    });
    return { ...outcome, modelInfo: `${meta.provider}/${meta.model}/${meta.promptVersion}` };
  }
}
