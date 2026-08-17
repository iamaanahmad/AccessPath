import type {
  Assessment,
  EvidenceClaim,
  EvidenceSource,
  EvidenceStatus,
  RequirementDefinition,
  RouteResult,
  RouteStatus,
  ScoredEvidence,
  SegmentDefinition,
  SegmentResult,
} from "@/lib/domain";

const authorityScores: Record<EvidenceSource["type"], number> = {
  "official-transit": 96,
  "official-venue": 94,
  "official-status": 100,
};

function daysBetween(earlier: string, later: string): number {
  return Math.max(
    0,
    Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / 86_400_000),
  );
}

function freshness(source: EvidenceSource, evaluatedAt: string) {
  if (!source.publishedAt) {
    return { score: 62, label: "Publication date unavailable; retrieved for this snapshot" };
  }

  const age = daysBetween(source.publishedAt, evaluatedAt);
  if (age <= 30) return { score: 100, label: `${age} days old` };
  if (age <= 90) return { score: 86, label: `${age} days old` };
  if (age <= 365) return { score: 66, label: `${age} days old` };
  return { score: 38, label: `Over one year old` };
}

function scoreEvidence(
  claim: EvidenceClaim,
  source: EvidenceSource,
  evaluatedAt: string,
): ScoredEvidence {
  const sourceFreshness = freshness(source, evaluatedAt);
  const score = Math.round(
    authorityScores[source.type] * 0.55 +
      claim.directness * 100 * 0.25 +
      sourceFreshness.score * 0.2,
  );

  return {
    claim,
    source,
    score,
    freshnessLabel: sourceFreshness.label,
  };
}

function statusSummary(status: EvidenceStatus, label: string): string {
  switch (status) {
    case "Verified":
      return `${label} is supported by strong official evidence.`;
    case "Likely":
      return `${label} is supported, but the evidence has a limitation.`;
    case "Conflicting":
      return `Official evidence for ${label.toLowerCase()} conflicts and needs a safer alternative.`;
    case "Inaccessible":
      return `Current evidence indicates that ${label.toLowerCase()} is not met.`;
    case "Unknown":
      return `${label} could not be verified from the available evidence.`;
  }
}

export function assessRequirement(
  requirement: RequirementDefinition,
  claims: EvidenceClaim[],
  sources: EvidenceSource[],
  evaluatedAt: string,
): Assessment {
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const evidence = requirement.claimIds.flatMap((claimId) => {
    const claim = claims.find((item) => item.id === claimId);
    if (!claim) return [];
    const source = sourceMap.get(claim.sourceId);
    return source ? [scoreEvidence(claim, source, evaluatedAt)] : [];
  });

  const supporting = evidence.filter((item) => item.claim.stance === "supports");
  const contradicting = evidence.filter((item) => item.claim.stance === "contradicts");
  const uncertain = evidence.filter((item) => item.claim.stance === "uncertain");
  const rationale: string[] = [];

  let status: EvidenceStatus;
  let confidence: number;
  let meetsRequirement: boolean | null;

  if (supporting.length > 0 && contradicting.length > 0) {
    status = "Conflicting";
    confidence = Math.min(
      79,
      Math.round(
        (Math.max(...supporting.map((item) => item.score)) +
          Math.max(...contradicting.map((item) => item.score))) /
          2 -
          8,
      ),
    );
    meetsRequirement = false;
    rationale.push("One official source describes an accessible path, while a newer status source reports its required feature unavailable.");
    rationale.push("AccessPath treats unresolved critical conflicts as barriers rather than averaging them away.");
  } else if (contradicting.length > 0) {
    status = "Inaccessible";
    confidence = Math.max(...contradicting.map((item) => item.score));
    meetsRequirement = false;
    rationale.push("The strongest available evidence directly contradicts this requirement.");
  } else if (supporting.length > 0) {
    const distinctSources = new Set(supporting.map((item) => item.source.url)).size;
    const baseScore = Math.max(...supporting.map((item) => item.score));
    confidence = Math.min(98, baseScore + (distinctSources > 1 ? 4 : 0));
    status = confidence >= 82 ? "Verified" : "Likely";
    meetsRequirement = true;
    rationale.push(
      distinctSources > 1
        ? "Two independent official pages support this requirement."
        : "An official source directly supports this requirement.",
    );
    if (uncertain.length > 0) {
      status = "Likely";
      confidence = Math.min(confidence, 79);
      rationale.push("A current caveat limits certainty for part of the experience.");
    }
  } else {
    status = "Unknown";
    confidence = uncertain.length > 0 ? Math.min(55, Math.max(...uncertain.map((item) => item.score))) : 20;
    meetsRequirement = null;
    rationale.push("No supporting evidence was available for this critical requirement.");
  }

  rationale.push(
    "Score inputs: source authority (55%), claim directness (25%), freshness (20%), plus corroboration where available.",
  );

  return {
    requirementId: requirement.id,
    label: requirement.label,
    status,
    confidence,
    meetsRequirement,
    summary: statusSummary(status, requirement.label),
    rationale,
    evidence,
  };
}

const statusPriority: EvidenceStatus[] = [
  "Inaccessible",
  "Conflicting",
  "Unknown",
  "Likely",
  "Verified",
];

function evaluateSegment(
  segment: SegmentDefinition,
  claims: EvidenceClaim[],
  sources: EvidenceSource[],
  evaluatedAt: string,
): SegmentResult {
  const assessments = segment.requirements.map((requirement) =>
    assessRequirement(requirement, claims, sources, evaluatedAt),
  );

  if (assessments.length === 0) {
    return {
      ...segment,
      status: "Verified",
      confidence: 100,
      meetsRequirement: true,
      assessments,
    };
  }

  const status = statusPriority.find((candidate) =>
    assessments.some((assessment) => assessment.status === candidate),
  ) ?? "Unknown";
  const hasFailure = assessments.some((assessment) => assessment.meetsRequirement === false);
  const hasUnknown = assessments.some((assessment) => assessment.meetsRequirement === null);

  return {
    ...segment,
    status,
    confidence: Math.min(...assessments.map((assessment) => assessment.confidence)),
    meetsRequirement: hasFailure ? false : hasUnknown ? null : true,
    assessments,
  };
}

function routeStatus(segments: SegmentResult[]): RouteStatus {
  const critical = segments.filter((segment) => segment.critical);
  if (critical.some((segment) => segment.status === "Inaccessible")) return "blocked";
  if (
    critical.some(
      (segment) =>
        segment.status === "Conflicting" || segment.status === "Unknown",
    )
  ) {
    return "needs-review";
  }
  if (critical.some((segment) => segment.status === "Likely")) {
    return "usable-with-caveats";
  }
  return "verified";
}

function routeConfidence(status: RouteStatus, segments: SegmentResult[]): number {
  const critical = segments.filter((segment) => segment.critical);
  if (critical.length === 0) return 0;

  if (status === "blocked") {
    const strongestBarrier = Math.max(
      ...critical
        .filter((segment) => segment.meetsRequirement === false)
        .map((segment) => segment.confidence),
    );
    return Math.max(5, 100 - strongestBarrier);
  }

  if (status === "needs-review") {
    const uncertainConfidence = Math.min(
      ...critical
        .filter(
          (segment) =>
            segment.status === "Conflicting" || segment.status === "Unknown",
        )
        .map((segment) => segment.confidence),
    );
    return Math.min(59, Math.max(25, 100 - uncertainConfidence));
  }

  return Math.min(...critical.map((segment) => segment.confidence));
}

function confidenceLabel(status: RouteStatus): string {
  if (status === "verified") return "Confidence this route meets every requirement";
  if (status === "usable-with-caveats") return "Usable route with evidence caveats";
  if (status === "needs-review") return "Usability limited by a critical conflict";
  return "Requirement not met; route is blocked";
}

export function assessRoute(
  id: RouteResult["id"],
  candidateId: string,
  label: string,
  definitions: SegmentDefinition[],
  claims: EvidenceClaim[],
  sources: EvidenceSource[],
  evaluatedAt: string,
): RouteResult {
  const segments = definitions.map((segment) =>
    evaluateSegment(segment, claims, sources, evaluatedAt),
  );
  const status = routeStatus(segments);

  return {
    id,
    candidateId,
    label,
    status,
    confidence: routeConfidence(status, segments),
    confidenceLabel: confidenceLabel(status),
    segments,
  };
}
