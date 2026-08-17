import { describe, expect, it } from "vitest";
import { createAccessPlan } from "@/lib/planner";

const defaultRequest =
  "I'm a wheelchair user visiting London for 5 hours. I need step-free transport from Victoria, an accessible café, a museum, and an accessible restroom.";

describe("AccessPath planning scenarios", () => {
  it("rejects the conflicted entrance and selects the best usable candidate", async () => {
    const plan = await createAccessPlan(
      {
        request: defaultRequest,
        needsChangingPlaces: true,
        avoidSteepRamps: false,
      },
      { enableAi: false },
    );

    expect(plan.replan.outcome).toBe("replanned");
    expect(plan.initialRoute.candidateId).toBe("east-entrance");
    expect(plan.initialRoute.status).toBe("needs-review");
    expect(plan.initialRoute.confidence).toBe(25);
    expect(plan.revisedRoute.candidateId).toBe("central-entrance");
    expect(plan.revisedRoute.status).toBe("usable-with-caveats");
    expect(plan.revisedRoute.confidence).toBe(79);
    expect(plan.candidates.find((candidate) => candidate.selected)?.id).toBe(
      "central-entrance",
    );
  });

  it("lets a prose-only steep-ramp requirement produce an honest no-match result", async () => {
    const plan = await createAccessPlan(
      {
        request: `${defaultRequest} I cannot use steep ramps.`,
        needsChangingPlaces: true,
        avoidSteepRamps: false,
      },
      { enableAi: false },
    );

    expect(plan.needs.avoidSteepRamps).toBe(true);
    expect(
      plan.constraints.find((constraint) => constraint.id === "avoid-steep-ramps"),
    ).toMatchObject({ required: true, source: "request" });
    expect(plan.replan.outcome).toBe("no-match");
    expect(plan.revisedRoute.candidateId).toBe("central-entrance");
    expect(plan.revisedRoute.status).toBe("blocked");
    expect(plan.revisedRoute.confidence).toBe(11);
    expect(plan.candidates.every((candidate) => !candidate.selected)).toBe(true);
  });

  it("removes the Changing Places requirement when neither prose nor control requests it", async () => {
    const plan = await createAccessPlan(
      {
        request: defaultRequest,
        needsChangingPlaces: false,
        avoidSteepRamps: false,
      },
      { enableAi: false },
    );

    expect(plan.needs.changingPlaces).toBe(false);
    expect(plan.planId).toContain("standard");
    const toilet = plan.revisedRoute.segments.find(
      (segment) => segment.id === "accessible-toilet",
    );
    expect(toilet?.title).toBe("Accessible toilet");
    expect(
      toilet?.assessments.some(
        (assessment) => assessment.requirementId === "changing-places",
      ),
    ).toBe(false);
  });
});
