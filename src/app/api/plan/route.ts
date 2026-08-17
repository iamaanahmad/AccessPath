import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAccessPlan } from "@/lib/planner";
import { planRequestSchema } from "@/lib/domain";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = planRequestSchema.parse(body);
    const result = await createAccessPlan(input);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Please check the journey request.",
          issues: error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "AccessPath could not evaluate this journey. Please try again." },
      { status: 500 },
    );
  }
}
