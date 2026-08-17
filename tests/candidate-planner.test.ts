import { describe, expect, it } from "vitest";
import { selectRouteCandidate } from "@/lib/candidate-planner";
import type { RouteResult, RouteStatus } from "@/lib/domain";

function candidate(
  id: string,
  preference: number,
  status: RouteStatus,
  confidence: number,
) {
  const route: RouteResult = {
    id: "initial",
    candidateId: id,
    label: id,
    status,
    confidence,
    confidenceLabel: "Route usability confidence",
    segments: [],
  };
  return { id, label: id, preference, route };
}

describe("candidate selection", () => {
  it("retains a usable preferred route without manufacturing a replan", () => {
    const decision = selectRouteCandidate([
      candidate("preferred", 0, "verified", 90),
      candidate("alternative", 1, "verified", 98),
    ]);

    expect(decision.outcome).toBe("unchanged");
    expect(decision.selected?.id).toBe("preferred");
  });

  it("selects a usable alternative after rejecting the preferred candidate", () => {
    const decision = selectRouteCandidate([
      candidate("preferred", 0, "needs-review", 25),
      candidate("alternative", 1, "usable-with-caveats", 79),
    ]);

    expect(decision.outcome).toBe("replanned");
    expect(decision.selected?.id).toBe("alternative");
  });

  it("returns no-match instead of selecting a blocked alternative", () => {
    const decision = selectRouteCandidate([
      candidate("preferred", 0, "needs-review", 25),
      candidate("alternative", 1, "blocked", 11),
    ]);

    expect(decision.outcome).toBe("no-match");
    expect(decision.selected).toBeNull();
    expect(decision.displayedAlternative.id).toBe("alternative");
  });
});
