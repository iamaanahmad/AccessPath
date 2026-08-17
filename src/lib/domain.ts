import { z } from "zod";

export const planRequestSchema = z.object({
  request: z
    .string()
    .trim()
    .min(20, "Describe the journey and accessibility support you need.")
    .max(600, "Keep the request under 600 characters."),
  needsChangingPlaces: z.boolean().default(true),
  avoidSteepRamps: z.boolean().default(false),
});

export const userNeedsSchema = z.object({
  wheelchairUser: z.boolean(),
  stepFreeTransport: z.boolean(),
  stepFreeEntrance: z.boolean(),
  accessibleCafe: z.boolean(),
  museumVisit: z.boolean(),
  accessibleToilet: z.boolean(),
  changingPlaces: z.boolean(),
  avoidSteepRamps: z.boolean(),
  origin: z.string(),
  destination: z.string(),
  durationHours: z.number().min(1).max(12),
});

export const evidenceSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.url(),
  publisher: z.string(),
  type: z.enum(["official-transit", "official-venue", "official-status"]),
  retrievedAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().optional(),
  provenance: z.literal("curated-snapshot"),
});

export const evidenceClaimSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  requirementId: z.string(),
  sourceId: z.string(),
  statement: z.string(),
  stance: z.enum(["supports", "contradicts", "uncertain"]),
  directness: z.number().min(0).max(1),
});

export type PlanRequest = z.infer<typeof planRequestSchema>;
export type UserNeeds = z.infer<typeof userNeedsSchema>;
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type EvidenceClaim = z.infer<typeof evidenceClaimSchema>;

export type EvidenceStatus =
  | "Verified"
  | "Likely"
  | "Conflicting"
  | "Unknown"
  | "Inaccessible";

export type JourneyKind =
  | "origin"
  | "transport"
  | "entrance"
  | "museum"
  | "cafe"
  | "toilet";

export interface RequirementDefinition {
  id: string;
  label: string;
  claimIds: string[];
}

export interface SegmentDefinition {
  id: string;
  title: string;
  detail: string;
  time: string;
  kind: JourneyKind;
  critical: boolean;
  requirements: RequirementDefinition[];
}

export interface ScoredEvidence {
  claim: EvidenceClaim;
  source: EvidenceSource;
  score: number;
  freshnessLabel: string;
}

export interface Assessment {
  requirementId: string;
  label: string;
  status: EvidenceStatus;
  confidence: number;
  meetsRequirement: boolean | null;
  summary: string;
  rationale: string[];
  evidence: ScoredEvidence[];
}

export interface SegmentResult extends Omit<SegmentDefinition, "requirements"> {
  status: EvidenceStatus;
  confidence: number;
  meetsRequirement: boolean | null;
  assessments: Assessment[];
  changed?: "removed" | "added" | "considered";
}

export type RouteStatus =
  | "verified"
  | "usable-with-caveats"
  | "needs-review"
  | "blocked";

export interface RouteResult {
  id: "initial" | "revised";
  candidateId: string;
  label: string;
  status: RouteStatus;
  confidence: number;
  confidenceLabel: string;
  segments: SegmentResult[];
}

export type ConstraintSource = "request" | "control" | "pilot-default";

export interface InterpretedConstraint {
  id: string;
  label: string;
  required: boolean;
  source: ConstraintSource;
}

export interface CandidateEvaluation {
  id: string;
  label: string;
  status: RouteStatus;
  confidence: number;
  selected: boolean;
  summary: string;
}

export type ReplanOutcome = "unchanged" | "replanned" | "no-match";

export interface AiTrace {
  mode: "gemini" | "featherless" | "deterministic-fallback";
  model?: string;
  note: string;
}

export interface PlanResult {
  planId: string;
  evaluatedAt: string;
  dataMode: "Curated evidence snapshot";
  request: string;
  needs: UserNeeds;
  constraints: InterpretedConstraint[];
  candidates: CandidateEvaluation[];
  ai: AiTrace;
  stages: string[];
  initialRoute: RouteResult;
  revisedRoute: RouteResult;
  replan: {
    triggered: boolean;
    outcome: ReplanOutcome;
    title: string;
    explanation: string;
    removedSegmentId: string | null;
    addedSegmentId: string | null;
  };
  sources: EvidenceSource[];
  disclaimer: string;
}
