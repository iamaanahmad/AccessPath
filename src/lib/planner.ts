import { assessRoute } from "@/lib/assessment";
import { interpretRequest } from "@/lib/ai/request-interpreter";
import {
  evidenceClaims,
  evidenceSources,
  getInitialSegments,
  getRevisedSegments,
  SNAPSHOT_EVALUATED_AT,
} from "@/lib/data/demo-evidence";
import { planRequestSchema, type PlanRequest, type PlanResult } from "@/lib/domain";

function markRouteChange(result: PlanResult["initialRoute"], segmentId: string, change: "removed" | "added") {
  return {
    ...result,
    segments: result.segments.map((segment) =>
      segment.id === segmentId ? { ...segment, changed: change } : segment,
    ),
  };
}

export async function createAccessPlan(
  rawInput: PlanRequest,
  options: { enableAi?: boolean } = {},
): Promise<PlanResult> {
  const input = planRequestSchema.parse(rawInput);
  const interpretation = await interpretRequest(input, options.enableAi ?? true);

  const initial = assessRoute(
    "initial",
    "Initial route",
    getInitialSegments(interpretation.needs.changingPlaces),
    evidenceClaims,
    evidenceSources,
    SNAPSHOT_EVALUATED_AT,
  );
  const revised = assessRoute(
    "revised",
    "Replanned route",
    getRevisedSegments(
      interpretation.needs.changingPlaces,
      interpretation.needs.avoidSteepRamps,
    ),
    evidenceClaims,
    evidenceSources,
    SNAPSHOT_EVALUATED_AT,
  );

  const steepRampBlocked = interpretation.needs.avoidSteepRamps;

  return {
    planId: `accesspath-${interpretation.needs.changingPlaces ? "cp" : "standard"}-${steepRampBlocked ? "no-ramp" : "ramp"}`,
    evaluatedAt: SNAPSHOT_EVALUATED_AT,
    dataMode: "Curated evidence snapshot",
    request: input.request,
    needs: interpretation.needs,
    ai: interpretation.trace,
    stages: [
      "Accessibility needs structured",
      `${evidenceClaims.length} claims linked to ${evidenceSources.length} official sources`,
      "Critical conflict detected at East Entrance",
      steepRampBlocked
        ? "Central Entrance checked; steep-ramp preference still needs resolution"
        : "Route replanned through the Central Entrance",
    ],
    initialRoute: markRouteChange(initial, "east-entrance", "removed"),
    revisedRoute: markRouteChange(revised, "central-entrance", "added"),
    replan: {
      triggered: true,
      title: steepRampBlocked
        ? "No verified entrance matches every preference"
        : "Entrance changed before arrival",
      explanation: steepRampBlocked
        ? "The East Entrance lift is reported out of service, while the verified Central Entrance uses a ramp the profile asks to avoid. Confirm an assisted option with the museum before travelling."
        : "The East Entrance relies on a lift that the museum currently reports out of service. AccessPath replaced it with the Central Entrance, supported by two official step-free access pages.",
      removedSegmentId: "east-entrance",
      addedSegmentId: "central-entrance",
    },
    sources: evidenceSources,
    disclaimer:
      "Accessibility conditions can change. This demo uses a curated evidence snapshot, not live operational status. Confirm critical details with TfL and the venue before travelling.",
  };
}
