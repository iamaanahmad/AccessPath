import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import {
  userNeedsSchema,
  type AiTrace,
  type PlanRequest,
  type UserNeeds,
} from "@/lib/domain";

export interface InterpretationResult {
  needs: UserNeeds;
  trace: AiTrace;
}

type InterpretationProvider = (
  input: PlanRequest,
) => Promise<InterpretationResult>;

interface ProviderResponse {
  status: number;
  body: string;
}

type ProviderName = "gemini" | "featherless";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM_PROMPT =
  "Extract accessibility constraints from the user's trip request. Do not invent accessibility or venue facts. Return only data that matches the provided schema.";

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    wheelchairUser: { type: "boolean" },
    stepFreeTransport: { type: "boolean" },
    stepFreeEntrance: { type: "boolean" },
    accessibleCafe: { type: "boolean" },
    museumVisit: { type: "boolean" },
    accessibleToilet: { type: "boolean" },
    changingPlaces: { type: "boolean" },
    avoidSteepRamps: { type: "boolean" },
    origin: { type: "string" },
    destination: { type: "string" },
    durationHours: { type: "number", minimum: 1, maximum: 12 },
  },
  required: [
    "wheelchairUser",
    "stepFreeTransport",
    "stepFreeEntrance",
    "accessibleCafe",
    "museumVisit",
    "accessibleToilet",
    "changingPlaces",
    "avoidSteepRamps",
    "origin",
    "destination",
    "durationHours",
  ],
  additionalProperties: false,
} as const;

function postJson(
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  timeoutMs = 9_000,
): Promise<ProviderResponse> {
  const target = new URL(url);
  const body = JSON.stringify(payload);
  const options = {
    method: "POST",
    headers: {
      ...headers,
      "Content-Length": Buffer.byteLength(body).toString(),
    },
  };

  return new Promise((resolve, reject) => {
    const handleResponse = (response: IncomingMessage) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      response.on("end", () => {
        resolve({
          status: response.statusCode ?? 0,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
      response.on("error", reject);
    };

    const request =
      target.protocol === "https:"
        ? httpsRequest(target, options, handleResponse)
        : httpRequest(target, options, handleResponse);

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Provider request timed out after ${timeoutMs}ms.`));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function providerHttpError(provider: string, response: ProviderResponse): Error {
  let detail = "";
  try {
    const payload = JSON.parse(response.body) as { error?: { message?: string } };
    detail = payload.error?.message?.replace(/\s+/g, " ").trim() ?? "";
  } catch {
    // Keep malformed provider error bodies out of user-facing diagnostics.
  }

  const safeDetail = detail ? `: ${detail.slice(0, 300)}` : ".";
  return new Error(`${provider} returned ${response.status}${safeDetail}`);
}

function deterministicInterpretation(input: PlanRequest): UserNeeds {
  const text = input.request.toLowerCase();
  const durationMatch = text.match(/(\d+)\s*(?:hour|hours|hr|hrs)/);
  const changingPlacesFromRequest = /\bchanging places\b/.test(text);
  const avoidSteepRampsFromRequest =
    /(?:avoid|cannot use|can't use|unable to use|no)\s+(?:a\s+)?steep ramps?/.test(text);

  return userNeedsSchema.parse({
    wheelchairUser: /wheelchair|mobility|step[- ]free/.test(text),
    stepFreeTransport: /step[- ]free|wheelchair|accessible transport/.test(text),
    stepFreeEntrance: /step[- ]free|wheelchair|accessible/.test(text),
    accessibleCafe: /caf[eé]|coffee|food/.test(text),
    museumVisit: /museum|gallery/.test(text),
    accessibleToilet: /toilet|restroom|bathroom/.test(text),
    changingPlaces: input.needsChangingPlaces || changingPlacesFromRequest,
    avoidSteepRamps: input.avoidSteepRamps || avoidSteepRampsFromRequest,
    origin: "Victoria Station",
    destination: "Natural History Museum",
    durationHours: durationMatch ? Number(durationMatch[1]) : 5,
  });
}

function userPrompt(input: PlanRequest): string {
  return `${input.request}\nExplicit controls: changingPlaces=${input.needsChangingPlaces}; avoidSteepRamps=${input.avoidSteepRamps}. The supported pilot origin is Victoria Station and destination is the Natural History Museum.`;
}

function extractJson(content: string): unknown {
  const cleaned = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain a JSON object.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function validatedNeeds(content: string, input: PlanRequest): UserNeeds {
  const parsed = userNeedsSchema.parse(extractJson(content));
  const deterministic = deterministicInterpretation(input);
  return userNeedsSchema.parse({
    ...parsed,
    changingPlaces:
      input.needsChangingPlaces ||
      parsed.changingPlaces ||
      deterministic.changingPlaces,
    avoidSteepRamps:
      input.avoidSteepRamps ||
      parsed.avoidSteepRamps ||
      deterministic.avoidSteepRamps,
    origin: "Victoria Station",
    destination: "Natural History Museum",
  });
}

async function geminiInterpretation(input: PlanRequest): Promise<InterpretationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

  if (!apiKey) {
    throw new Error("Gemini is not configured.");
  }

  const response = await postJson(
    `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
    {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt(input) }],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 450,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
      },
    },
  );

  if (response.status < 200 || response.status >= 300) {
    throw providerHttpError("Gemini", response);
  }

  const payload = JSON.parse(response.body) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const content = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("");
  if (!content) throw new Error("Gemini returned an empty response.");

  return {
    needs: validatedNeeds(content, input),
    trace: {
      mode: "gemini",
      model,
      note: "Gemini extracted the trip constraints into a validated schema; deterministic code verified evidence, scored confidence, and replanned the route.",
    },
  };
}

async function featherlessInterpretation(input: PlanRequest): Promise<InterpretationResult> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  const model = process.env.FEATHERLESS_MODEL;
  const baseUrl = (process.env.FEATHERLESS_BASE_URL ?? "https://api.featherless.ai/v1").replace(
    /\/$/,
    "",
  );

  if (!apiKey || !model) {
    throw new Error("Featherless is not configured.");
  }

  const response = await postJson(
    `${baseUrl}/chat/completions`,
    {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    {
      model,
      temperature: 0,
      max_tokens: 450,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(input) },
      ],
    },
  );

  if (response.status < 200 || response.status >= 300) {
    throw providerHttpError("Featherless", response);
  }

  const payload = JSON.parse(response.body) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Featherless returned an empty response.");

  return {
    needs: validatedNeeds(content, input),
    trace: {
      mode: "featherless",
      model,
      note: "Featherless extracted the trip constraints into a validated schema; deterministic code verified evidence, scored confidence, and replanned the route.",
    },
  };
}

function configuredProvider(): ProviderName | null {
  const preferred = process.env.AI_PROVIDER?.toLowerCase();
  if (preferred === "gemini" || preferred === "featherless") return preferred;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.FEATHERLESS_API_KEY && process.env.FEATHERLESS_MODEL) {
    return "featherless";
  }
  return null;
}

async function configuredAiInterpretation(input: PlanRequest): Promise<InterpretationResult> {
  const provider = configuredProvider();
  if (provider === "gemini") return geminiInterpretation(input);
  if (provider === "featherless") return featherlessInterpretation(input);
  throw new Error("No AI provider is configured.");
}

export async function interpretRequest(
  input: PlanRequest,
  enableAi = true,
  provider: InterpretationProvider = configuredAiInterpretation,
): Promise<InterpretationResult> {
  if (!enableAi) {
    return {
      needs: deterministicInterpretation(input),
      trace: {
        mode: "deterministic-fallback",
        note: "The initial demonstration uses validated default constraints. Submit the form to run the configured AI provider.",
      },
    };
  }

  try {
    return await provider(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    const isDevelopment = process.env.NODE_ENV !== "production";

    if (isDevelopment) {
      console.error(`[AccessPath AI] ${message}`);
    }

    return {
      needs: deterministicInterpretation(input),
      trace: {
        mode: "deterministic-fallback",
        note: isDevelopment
          ? `AI provider fallback: ${message} The request was parsed locally.`
          : "No configured AI provider returned valid output. The request was parsed locally; no live-AI claim is made for this run.",
      },
    };
  }
}
