import { describe, expect, it } from "vitest";
import { assessRoute } from "@/lib/assessment";
import type {
  EvidenceClaim,
  EvidenceSource,
  SegmentDefinition,
} from "@/lib/domain";

const evaluatedAt = "2026-08-17T12:00:00.000Z";
const source: EvidenceSource = {
  id: "official-source",
  title: "Official accessibility page",
  url: "https://example.org/access",
  publisher: "Example venue",
  type: "official-venue",
  retrievedAt: evaluatedAt,
  provenance: "curated-snapshot",
};

function segment(claimIds: string[]): SegmentDefinition {
  return {
    id: "critical-segment",
    title: "Critical segment",
    detail: "Test segment",
    time: "10:00",
    kind: "entrance",
    critical: true,
    requirements: [
      {
        id: "step-free-entrance",
        label: "Step-free entrance",
        claimIds,
      },
    ],
  };
}

function claim(
  id: string,
  stance: EvidenceClaim["stance"],
  directness = 1,
): EvidenceClaim {
  return {
    id,
    subjectId: "critical-segment",
    requirementId: "step-free-entrance",
    sourceId: source.id,
    statement: `${stance} statement`,
    stance,
    directness,
  };
}

describe("critical route gating", () => {
  it("keeps missing critical evidence Unknown and prevents route acceptance", () => {
    const route = assessRoute(
      "initial",
      "missing-evidence",
      "Missing evidence route",
      [segment(["absent-claim"])],
      [],
      [],
      evaluatedAt,
    );

    expect(route.segments[0].status).toBe("Unknown");
    expect(route.status).toBe("needs-review");
    expect(route.confidence).toBeLessThanOrEqual(59);
  });

  it("labels a route with a critical Likely segment as usable with caveats", () => {
    const supportingClaim = claim("indirect-support", "supports", 0.5);
    const route = assessRoute(
      "initial",
      "caveated-route",
      "Caveated route",
      [segment([supportingClaim.id])],
      [supportingClaim],
      [source],
      evaluatedAt,
    );

    expect(route.segments[0].status).toBe("Likely");
    expect(route.status).toBe("usable-with-caveats");
  });

  it("never averages a critical contradiction into an accepted route", () => {
    const supportingClaim = claim("support", "supports");
    const contradictingClaim = claim("contradiction", "contradicts");
    const route = assessRoute(
      "initial",
      "conflicted-route",
      "Conflicted route",
      [segment([supportingClaim.id, contradictingClaim.id])],
      [supportingClaim, contradictingClaim],
      [source],
      evaluatedAt,
    );

    expect(route.segments[0].status).toBe("Conflicting");
    expect(route.status).toBe("needs-review");
  });
});
