# AccessPath

[![Live demo](https://img.shields.io/badge/live-accesspaths.xyz-0f766e?style=flat-square)](https://www.accesspaths.xyz/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.1-black?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-17%20passing-16a34a?style=flat-square)](tests/)
[![License: MIT](https://img.shields.io/badge/license-MIT-f59e0b?style=flat-square)](LICENSE)

**Don't just find a route. Find a route you can actually use.**

AccessPath is an AI-assisted accessibility verification and replanning experience built for the Pixel Forge AI Hackathon. Instead of generating another travel itinerary, it checks each critical journey segment against attributable accessibility evidence, exposes uncertainty, and changes the route when a barrier is found.

The current London pilot evaluates a five-hour wheelchair-accessible journey from Victoria Station to the Natural History Museum. It detects that the preferred East Entrance depends on a lift the museum currently reports out of service, evaluates the supported entrance candidates, and selects the documented step-free Central Entrance while keeping its ramp caveat visible.

- **Live project:** [www.accesspaths.xyz](https://www.accesspaths.xyz/)
- **Public repository:** [github.com/iamaanahmad/AccessPath](https://github.com/iamaanahmad/AccessPath)

## Why this is different

- **Evidence before assertion:** Every supported accessibility claim links to its source, publisher, freshness, and relevance.
- **Uncertainty remains visible:** Claims can be `Verified`, `Likely`, `Conflicting`, `Unknown`, or `Inaccessible`.
- **Confidence is deterministic:** The model never invents a confidence percentage.
- **Critical barriers cannot be averaged away:** Route usability confidence is limited by the weakest critical segment.
- **Replanning is candidate-based:** Deterministic code evaluates every supported entrance, retains a usable preferred candidate, selects an acceptable alternative, or returns an honest no-match result.
- **Natural language changes decisions:** A phrase such as “I cannot use steep ramps” becomes a visible interpreted requirement and can block every candidate without touching a checkbox.
- **AI and rules are inspectable:** The UI shows interpreted constraints, their request/control provenance, candidate count, and the four-stage decision trace.
- **The product is accessible:** The primary flow supports keyboard use, visible focus, screen-reader announcements, reduced motion, semantic structure, and status cues beyond color.

## Demo journey

1. Start at Victoria Station.
2. Take TfL's C1 low-floor bus toward South Kensington.
3. Evaluate the Natural History Museum's East Entrance.
4. Detect a conflict: the entrance uses a lift, while a current official maintenance notice reports that lift out of service.
5. Evaluate both supported entrance candidates and reject the conflicted East Entrance.
6. Select the Central Entrance as usable with caveats, then verify the museum visit, café, wheelchair-accessible toilet, and optional Changing Places facility.
7. Add “I cannot use steep ramps” in prose—or enable **Avoid steep ramps**—to see candidate selection return an honest no-match result.

## How AI is used

AccessPath supports two server-side inference providers. The production deployment uses the [Featherless OpenAI-compatible API](https://featherless.ai/docs/quickstart-guide) with the pinned open-weight `Qwen/Qwen2.5-7B-Instruct` model. Featherless converts the natural-language trip request into structured accessibility constraints such as wheelchair use, step-free transport, required facilities, origin, destination, and visit duration. Its JSON response must pass a Zod schema before entering the planning pipeline.

Gemini remains a validated alternative using the [Gemini Developer API](https://ai.google.dev/gemini-api/docs/pricing) and [`gemini-3.1-flash-lite`](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite). The Gemini branch additionally requests structured JSON Schema output before applying the same Zod boundary.

Explicit controls and interpreted prose are combined conservatively: either can add a supported critical requirement. The resulting profile is shown in the UI with request/control provenance before deterministic code evaluates route candidates. This makes model inference visible and consequential without allowing the model to decide accessibility status or confidence.

The configured provider is selected with `AI_PROVIDER=featherless` or `AI_PROVIDER=gemini`; credentials remain server-side and are never exposed to the browser. Both branches are live-validated, while the hosted experience uses Featherless to demonstrate meaningful sponsor inference.

If the selected provider is unconfigured, times out, errors, or returns invalid output, AccessPath falls back to a local parser and labels the run **Reliable fallback active**. It never presents fallback processing as live AI.

AI does **not** decide confidence, source attribution, route acceptance, or safety-critical state. TypeScript application code owns those decisions.

Provider capability and pricing descriptions are paraphrased from the linked official Google documentation for licensing compliance.

## Deterministic scoring and replanning

Each evidence item receives a score based on:

- Source authority: **55%**
- Claim directness: **25%**
- Evidence freshness: **20%**
- Independent official corroboration: a small capped increase
- Contradiction: a critical conflict state instead of an average

Current official status notices outrank broad venue guidance for the affected feature. A route is blocked or marked for review when a critical requirement is inaccessible, contradictory, or unknown. A route with a critical `Likely` segment is labeled **Usable with caveats**, not fully verified. Route usability confidence uses the weakest critical segment rather than an arithmetic mean.

The candidate selector has three explicit outcomes: `unchanged` when the preferred route is usable, `replanned` when an acceptable alternative is selected, and `no-match` when every evaluated candidate fails a critical requirement. It never selects a blocked candidate merely to produce a successful-looking result.

The scoring implementation lives in [`src/lib/assessment.ts`](src/lib/assessment.ts), candidate selection in [`src/lib/candidate-planner.ts`](src/lib/candidate-planner.ts), and the evidence graph in [`src/lib/data/demo-evidence.ts`](src/lib/data/demo-evidence.ts).

## Evidence provenance

This pilot uses a versioned **curated evidence snapshot**, retrieved on 17 August 2026. It does not claim live operational status. Claims in the application are paraphrased from these linked public pages:

- [TfL — Wheelchair access and avoiding stairs](https://tfl.gov.uk/transport-accessibility/wheelchair-access-and-avoiding-stairs)
- [TfL — C1 bus timetable](https://tfl.gov.uk/bus/timetable/C1/)
- [Natural History Museum — Getting here](https://www.nhm.ac.uk/visit/getting-here.html)
- [Natural History Museum — Accessibility at South Kensington](https://www.nhm.ac.uk/visit/access-at-south-kensington.html)
- [Natural History Museum — Facilities and maintenance works](https://www.nhm.ac.uk/visit/facilities.html)
- [Natural History Museum — Eat, drink and shop](https://www.nhm.ac.uk/visit/eat-drink-and-shop.html/)

Content from these sources is rephrased for compliance with licensing restrictions. AccessPath preserves source attribution and links but does not reproduce source pages.

## Architecture

```text
Next.js UI
   │
   ├── POST /api/plan
   │      ├── Featherless production interpreter (server-only)
   │      ├── Gemini alternative provider
   │      ├── Zod schema validation
   │      ├── Accessibility evidence graph
   │      ├── Deterministic assessment engine
   │      ├── Candidate evaluator (unchanged / replanned / no-match)
   │      └── Constraint-based route decision
   │
   └── Accessible journey + evidence inspector
```

Key locations:

- `src/components/accesspath-app.tsx` — interactive planner, route comparison, timeline, and evidence inspector
- `src/lib/domain.ts` — validated domain schemas and types
- `src/lib/data/demo-evidence.ts` — attributed evidence snapshot and journey graph
- `src/lib/assessment.ts` — scoring, statuses, route usability confidence, and critical gating
- `src/lib/candidate-planner.ts` — pure deterministic candidate ranking and outcome selection
- `src/lib/ai/request-interpreter.ts` — server-only Gemini/Featherless provider boundary and explicit fallback
- `src/lib/planner.ts` — interpreted-profile, candidate-assessment, and decision orchestration
- `tests/` — 15 offline scenario/integrity checks plus two opt-in live Featherless checks
- `src/app/api/plan/route.ts` — validated planning API
- `src/app/api/health/route.ts` — deployment health endpoint

## Local setup

Requirements: Node.js 20.9 or newer and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. For parity with production, set `AI_PROVIDER=featherless`, add `FEATHERLESS_API_KEY`, and retain the pinned `FEATHERLESS_MODEL=Qwen/Qwen2.5-7B-Instruct`. Run `npm run test:featherless` to exercise both live provider scenarios through the real planning pipeline.

Gemini remains available as an alternative: set `AI_PROVIDER=gemini`, add `GEMINI_API_KEY`, and optionally override the default `GEMINI_MODEL=gemini-3.1-flash-lite`. The normal offline suite never reads a provider key.

Do not commit `.env.local`. Model credentials are read only in the server runtime and are never included in client props or browser code. Provider requests may be subject to the selected provider's data terms, so the demo warns users not to enter names, contact details, or medical records.

## Quality commands

```powershell
npm run typecheck
npm run lint
npm test
npm run test:featherless # opt-in live provider check; requires .env.local
npm run build
```

`npm test` runs 15 deterministic checks across five active suites without provider credentials or network access; the separate Featherless file remains skipped during this command. The offline suite proves the normal replan, prose-driven no-match behavior, requirement removal, all candidate outcomes, missing-evidence and conflict gating, `Likely` caveat semantics, source/claim integrity, provider-failure fallback, and protection against a model dropping an explicit supported critical phrase.

`npm run test:featherless` runs two opt-in live checks through the complete AccessPath pipeline: normal candidate selection and the prose-only no-match scenario. It is evidence for the sponsor integration, not a CI dependency.

Dependency versions are exact-pinned, and `package-lock.json` is committed for reproducible installation.

## Sponsor-backed validation

Sponsor tools are used only where they strengthen the product or its quality evidence:

- **Featherless:** Production uses the pinned `Qwen/Qwen2.5-7B-Instruct` model. Two opt-in live tests pass through the real provider boundary, Zod validation, evidence assessment, and candidate selector: the normal request selects the Central Entrance, while the prose-only steep-ramp requirement returns `no-match`. The same two outcomes were verified against the public `.xyz` deployment.
- **Hawkeye:** Hawkeye 1.0.2 and the local AI Bridge 1.0.1 indexed the project and returned a healthy status. Sanitized exact searches traced `selectRouteCandidate` across 7 hits in 3 engine/test files, `deterministic-fallback` across 4 hits in 3 files, claim/source linkage across assessment and integrity tests, provider environment access only in the server-side provider file, and the non-live-status disclaimer in both code and documentation. Hawkeye runs locally; no source was uploaded. These are architecture and traceability checks, not an accessibility-conformance audit.
- **Prelint:** The public repository is connected for automatic pull-request checks. A completed report will be cited only after a check finishes; no passing Prelint result is currently claimed.
- **.XYZ:** The sponsor domain [accesspaths.xyz](https://www.accesspaths.xyz/) serves the hosted application over HTTPS.

Only exact project-specific Hawkeye queries are reported. Broad local searches currently include dependency files, so their hit totals are deliberately excluded from public claims.

## Live deployment

AccessPath is live at **[https://www.accesspaths.xyz/](https://www.accesspaths.xyz/)**. The health endpoint returns `{"status":"ok","service":"accesspath"}`, and the public planning API reports Featherless inference for both the normal replan and prose-driven no-match scenarios.

The core demo remains functional without model credentials and accurately labels deterministic fallback.

## Responsible limitations

- This is a focused London pilot, not a general route planner.
- Evidence is curated and dated, not fetched live during each request.
- Transport disruptions, lift status, entrances, and facilities can change after retrieval.
- Café accessibility is inferred from two official museum pages and is intentionally scored lower than direct facility evidence.
- The Central Entrance is step-free but described by the museum as having a steep ramp; requiring no steep ramps correctly produces a `no-match` result.
- AccessPath does not guarantee that a route is safe or accessible. Users must confirm critical details with the operator and venue before travelling.
- Provider requests are governed by the selected provider's data terms. Use synthetic demo details and never submit names, contact information, or medical records.

## License

[MIT](LICENSE)
