import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createAccessPlan } from "@/lib/planner";

const runLive =
  process.env.RUN_FEATHERLESS_LIVE === "1" ||
  process.env.npm_lifecycle_event === "test:featherless";

function loadLocalProviderConfig() {
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
  process.env.AI_PROVIDER = "featherless";
}

const baseRequest =
  "I'm a wheelchair user visiting London for 5 hours. I need step-free transport from Victoria, an accessible cafe, a museum, and an accessible restroom.";

describe.skipIf(!runLive)("Featherless live provider", () => {
  beforeAll(loadLocalProviderConfig);

  it(
    "structures the normal request before deterministic candidate selection",
    async () => {
      const plan = await createAccessPlan({
        request: baseRequest,
        needsChangingPlaces: true,
        avoidSteepRamps: false,
      });

      expect(plan.ai.mode).toBe("featherless");
      expect(plan.ai.model).toBe("Qwen/Qwen2.5-7B-Instruct");
      expect(plan.replan.outcome).toBe("replanned");
      expect(plan.revisedRoute.candidateId).toBe("central-entrance");
      expect(plan.revisedRoute.status).toBe("usable-with-caveats");
    },
    15_000,
  );

  it(
    "preserves a prose-only critical constraint and returns no-match",
    async () => {
      const plan = await createAccessPlan({
        request: `${baseRequest} I cannot use steep ramps.`,
        needsChangingPlaces: true,
        avoidSteepRamps: false,
      });

      expect(plan.ai.mode).toBe("featherless");
      expect(plan.needs.avoidSteepRamps).toBe(true);
      expect(plan.replan.outcome).toBe("no-match");
      expect(plan.revisedRoute.status).toBe("blocked");
      expect(plan.candidates.every((candidate) => !candidate.selected)).toBe(true);
    },
    15_000,
  );
});
