import { describe, expect, it } from "vitest";
import {
  entranceCandidates,
  evidenceClaims,
  evidenceSources,
  getSegmentsForEntrance,
} from "@/lib/data/demo-evidence";

describe("curated evidence graph integrity", () => {
  it("links every claim to an existing source", () => {
    const sourceIds = new Set(evidenceSources.map((source) => source.id));

    for (const claim of evidenceClaims) {
      expect(sourceIds.has(claim.sourceId), `${claim.id} source`).toBe(true);
    }
  });

  it("links every candidate requirement to an existing, matching claim", () => {
    const claimMap = new Map(evidenceClaims.map((claim) => [claim.id, claim]));

    for (const candidate of entranceCandidates) {
      for (const changingPlaces of [false, true]) {
        for (const avoidSteepRamps of [false, true]) {
          const segments = getSegmentsForEntrance(
            candidate.id,
            changingPlaces,
            avoidSteepRamps,
          );
          for (const segment of segments) {
            for (const requirement of segment.requirements) {
              for (const claimId of requirement.claimIds) {
                const linkedClaim = claimMap.get(claimId);
                expect(linkedClaim, `${segment.id} -> ${claimId}`).toBeDefined();
                expect(linkedClaim?.subjectId).toBe(segment.id);
                expect(linkedClaim?.requirementId).toBe(requirement.id);
              }
            }
          }
        }
      }
    }
  });

  it("uses unique source identifiers and URLs", () => {
    expect(new Set(evidenceSources.map((source) => source.id)).size).toBe(
      evidenceSources.length,
    );
    expect(new Set(evidenceSources.map((source) => source.url)).size).toBe(
      evidenceSources.length,
    );
  });
});
