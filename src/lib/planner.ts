import { assessRoute } from "@/lib/assessment";
import {
  selectRouteCandidate,
  type EvaluatedRouteCandidate,
} from "@/lib/candidate-planner";
import { interpretRequest } from "@/lib/ai/request-interpreter";
import {
  entranceCandidates,
  evidenceClaims,
  evidenceSources,
  getSegmentsForEntrance,
  SNAPSHOT_EVALUATED_AT,
} from "@/lib/data/demo-evidence";
import {
  planRequestSchema,
  type CandidateEvaluation,
  type InterpretedConstraint,
  type PlanRequest,
  type PlanResult,
  type RouteResult,
  type UserNeeds,
} from "@/lib/domain";

function presentRoute(
  candidate: EvaluatedRouteCandidate,
  id: RouteResult["id"],
  label: string,
  changedSegmentId?: string,
  change?: "removed" | "added" | "considered",
): RouteResult {
  return {
    ...candidate.route,
    id,
    label,
    segments: candidate.route.segments.map((segment) =>
      segment.id === changedSegmentId ? { ...segment, changed: change } : segment,
    ),
  };
}

function constraintSource(
  selectedControl: boolean,
  interpretedValue: boolean,
): InterpretedConstraint["source"] {
  if (selectedControl) return "control";
  if (interpretedValue) return "request";
  return "pilot-default";
}

function interpretedConstraints(
  input: PlanRequest,
  needs: UserNeeds,
): InterpretedConstraint[] {
  return [
    {
      id: "wheelchair-user",
      label: "Wheelchair-accessible journey",
      required: needs.wheelchairUser,
      source: needs.wheelchairUser ? "request" : "pilot-default",
    },
    {
      id: "step-free-transport",
      label: "Step-free transport",
      required: needs.stepFreeTransport,
      source: needs.stepFreeTransport ? "request" : "pilot-default",
    },
    {
      id: "step-free-entrance",
      label: "Step-free museum entrance",
      required: needs.stepFreeEntrance,
      source: needs.stepFreeEntrance ? "request" : "pilot-default",
    },
    {
      id: "accessible-cafe",
      label: "Accessible café",
      required: needs.accessibleCafe,
      source: needs.accessibleCafe ? "request" : "pilot-default",
    },
    {
      id: "accessible-toilet",
      label: "Accessible toilet",
      required: needs.accessibleToilet,
      source: needs.accessibleToilet ? "request" : "pilot-default",
    },
    {
      id: "changing-places",
      label: "Changing Places toilet",
      required: needs.changingPlaces,
      source: constraintSource(input.needsChangingPlaces, needs.changingPlaces),
    },
    {
      id: "avoid-steep-ramps",
      label: "Avoid steep ramps",
      required: needs.avoidSteepRamps,
      source: constraintSource(input.avoidSteepRamps, needs.avoidSteepRamps),
    },
  ];
}

function candidateSummary(
  candidate: EvaluatedRouteCandidate,
  selectedId: string | null,
): string {
  if (candidate.id === selectedId) {
    return candidate.route.status === "usable-with-caveats"
      ? "Selected: critical requirements are met, with evidence caveats kept visible."
      : "Selected: every critical requirement is supported by current evidence.";
  }
  if (candidate.route.status === "blocked") {
    return "Rejected: current evidence directly contradicts a critical requirement.";
  }
  if (candidate.route.status === "needs-review") {
    return "Rejected: an unresolved critical conflict prevents route acceptance.";
  }
  return "Usable candidate, but a higher-priority route was retained.";
}

function candidateEvaluations(
  candidates: EvaluatedRouteCandidate[],
  selectedId: string | null,
): CandidateEvaluation[] {
  return candidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    status: candidate.route.status,
    confidence: candidate.route.confidence,
    selected: candidate.id === selectedId,
    summary: candidateSummary(candidate, selectedId),
  }));
}

export async function createAccessPlan(
  rawInput: PlanRequest,
  options: { enableAi?: boolean } = {},
): Promise<PlanResult> {
  const input = planRequestSchema.parse(rawInput);
  const interpretation = await interpretRequest(input, options.enableAi ?? true);

  const evaluatedCandidates: EvaluatedRouteCandidate[] = entranceCandidates.map(
    (candidate) => ({
      ...candidate,
      route: assessRoute(
        "initial",
        candidate.id,
        candidate.label,
        getSegmentsForEntrance(
          candidate.id,
          interpretation.needs.changingPlaces,
          interpretation.needs.avoidSteepRamps,
        ),
        evidenceClaims,
        evidenceSources,
        SNAPSHOT_EVALUATED_AT,
      ),
    }),
  );

  const decision = selectRouteCandidate(evaluatedCandidates);
  const selectedId = decision.selected?.id ?? null;
  const initialChange = decision.outcome === "unchanged" ? undefined : "removed";
  const alternativeChange =
    decision.outcome === "replanned"
      ? "added"
      : decision.outcome === "no-match"
        ? "considered"
        : undefined;

  const initialRoute = presentRoute(
    decision.initial,
    "initial",
    "Initial route",
    decision.initial.id,
    initialChange,
  );
  const revisedRoute = presentRoute(
    decision.displayedAlternative,
    "revised",
    decision.outcome === "unchanged"
      ? "Retained route"
      : decision.outcome === "replanned"
        ? "Recommended route"
        : "Best evaluated alternative",
    decision.displayedAlternative.id,
    alternativeChange,
  );

  const constraints = interpretedConstraints(input, interpretation.needs);
  const candidates = candidateEvaluations(evaluatedCandidates, selectedId);
  const evaluatedCount = evaluatedCandidates.length;

  const replan =
    decision.outcome === "replanned"
      ? {
          triggered: true,
          outcome: decision.outcome,
          title: `${decision.displayedAlternative.label} selected from ${evaluatedCount} candidates`,
          explanation:
            "The preferred East Entrance depends on a lift that the museum reports out of service. Deterministic candidate evaluation rejected it and selected the Central Entrance, which meets the critical profile while retaining its ramp caveat.",
          removedSegmentId: decision.initial.id,
          addedSegmentId: decision.displayedAlternative.id,
        }
      : decision.outcome === "no-match"
        ? {
            triggered: true,
            outcome: decision.outcome,
            title: "No evaluated entrance matches every requirement",
            explanation:
              "The East Entrance is rejected because its lift is reported out of service. The Central Entrance was also evaluated, but its steep ramp conflicts with the interpreted requirement. Confirm an assisted option with the museum before travelling.",
            removedSegmentId: decision.initial.id,
            addedSegmentId: null,
          }
        : {
            triggered: false,
            outcome: decision.outcome,
            title: `${decision.initial.label} retained after candidate evaluation`,
            explanation:
              "The preferred entrance meets the interpreted requirements, so AccessPath retained it rather than manufacturing a route change.",
            removedSegmentId: null,
            addedSegmentId: null,
          };

  return {
    planId: `accesspath-${interpretation.needs.changingPlaces ? "cp" : "standard"}-${interpretation.needs.avoidSteepRamps ? "no-ramp" : "ramp"}`,
    evaluatedAt: SNAPSHOT_EVALUATED_AT,
    dataMode: "Curated evidence snapshot",
    request: input.request,
    needs: interpretation.needs,
    constraints,
    candidates,
    ai: interpretation.trace,
    stages: [
      `${constraints.filter((constraint) => constraint.required).length} accessibility requirements structured`,
      `${evidenceClaims.length} claims linked to ${evidenceSources.length} official sources`,
      `${evaluatedCount} entrance candidates evaluated with deterministic rules`,
      decision.outcome === "replanned"
        ? `${decision.initial.label} rejected; ${decision.displayedAlternative.label} selected`
        : decision.outcome === "no-match"
          ? "No candidate accepted; unresolved requirements kept visible"
          : `${decision.initial.label} retained; no unnecessary replan`,
    ],
    initialRoute,
    revisedRoute,
    replan,
    sources: evidenceSources,
    disclaimer:
      "Accessibility conditions can change. This demo uses a curated evidence snapshot, not live operational status. Confirm critical details with TfL and the venue before travelling.",
  };
}
