import { describe, expect, it, vi } from "vitest";
import {
  interpretRequest,
  validatedNeeds,
} from "@/lib/ai/request-interpreter";
import type { PlanRequest } from "@/lib/domain";

const input: PlanRequest = {
  request:
    "I'm a wheelchair user visiting a museum for 5 hours with an accessible café and toilet.",
  needsChangingPlaces: false,
  avoidSteepRamps: false,
};

describe("request interpretation failure behavior", () => {
  it("falls back locally when model output fails validation", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await interpretRequest(input, true, async () => {
      throw new Error("Simulated invalid model output");
    });

    expect(result.trace.mode).toBe("deterministic-fallback");
    expect(result.needs.wheelchairUser).toBe(true);
    expect(result.needs.museumVisit).toBe(true);
    expect(result.trace.note).toContain("parsed locally");
    expect(consoleError).toHaveBeenCalledWith(
      "[AccessPath AI] Simulated invalid model output",
    );
    consoleError.mockRestore();
  });

  it("understands a supported steep-ramp constraint without a checkbox", async () => {
    const result = await interpretRequest(
      { ...input, request: `${input.request} I cannot use steep ramps.` },
      false,
    );

    expect(result.needs.avoidSteepRamps).toBe(true);
  });

  it("does not let a model miss erase an explicit supported critical phrase", () => {
    const content = JSON.stringify({
      wheelchairUser: true,
      stepFreeTransport: true,
      stepFreeEntrance: true,
      accessibleCafe: true,
      museumVisit: true,
      accessibleToilet: true,
      changingPlaces: false,
      avoidSteepRamps: false,
      origin: "Victoria Station",
      destination: "Natural History Museum",
      durationHours: 5,
    });

    const needs = validatedNeeds(content, {
      ...input,
      request: `${input.request} I cannot use steep ramps.`,
    });

    expect(needs.avoidSteepRamps).toBe(true);
  });
});
