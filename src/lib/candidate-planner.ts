import type { ReplanOutcome, RouteResult, RouteStatus } from "@/lib/domain";

export interface EvaluatedRouteCandidate {
  id: string;
  label: string;
  preference: number;
  route: RouteResult;
}

export interface CandidateSelection {
  outcome: ReplanOutcome;
  initial: EvaluatedRouteCandidate;
  displayedAlternative: EvaluatedRouteCandidate;
  selected: EvaluatedRouteCandidate | null;
}

export function routeIsUsable(status: RouteStatus): boolean {
  return status === "verified" || status === "usable-with-caveats";
}

const statusRank: Record<RouteStatus, number> = {
  verified: 4,
  "usable-with-caveats": 3,
  "needs-review": 2,
  blocked: 1,
};

function rankCandidates(
  left: EvaluatedRouteCandidate,
  right: EvaluatedRouteCandidate,
): number {
  return (
    statusRank[right.route.status] - statusRank[left.route.status] ||
    right.route.confidence - left.route.confidence ||
    left.preference - right.preference
  );
}

export function selectRouteCandidate(
  candidates: EvaluatedRouteCandidate[],
): CandidateSelection {
  if (candidates.length === 0) {
    throw new Error("At least one route candidate is required.");
  }

  const ordered = [...candidates].sort(
    (left, right) => left.preference - right.preference,
  );
  const initial = ordered[0];
  const alternatives = ordered.slice(1).sort(rankCandidates);

  if (routeIsUsable(initial.route.status)) {
    return {
      outcome: "unchanged",
      initial,
      displayedAlternative: initial,
      selected: initial,
    };
  }

  const usableAlternative = alternatives.find((candidate) =>
    routeIsUsable(candidate.route.status),
  );
  if (usableAlternative) {
    return {
      outcome: "replanned",
      initial,
      displayedAlternative: usableAlternative,
      selected: usableAlternative,
    };
  }

  return {
    outcome: "no-match",
    initial,
    displayedAlternative: alternatives[0] ?? initial,
    selected: null,
  };
}
