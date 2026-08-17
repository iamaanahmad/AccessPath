# AccessPath

**Don't just find a route. Find a route you can actually use.**

AccessPath is an AI-assisted accessibility verification and replanning experience built for the Pixel Forge AI Hackathon. Instead of generating another travel itinerary, it checks each critical journey segment against attributable accessibility evidence, exposes uncertainty, and changes the route when a barrier is found.

The current London pilot evaluates a five-hour wheelchair-accessible journey from Victoria Station to the Natural History Museum. It detects that the preferred East Entrance depends on a lift the museum currently reports out of service, evaluates the supported entrance candidates, and selects the documented step-free Central Entrance while keeping its ramp caveat visible.

**Public repository:** [github.com/iamaanahmad/AccessPath](https://github.com/iamaanahmad/AccessPath)

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
7. Let the judge add “I cannot use steep ramps” in prose—or enable **Avoid steep ramps**—to see candidate selection return an honest no-match result.

## How AI is used

The server uses the [Gemini Developer API free tier](https://ai.google.dev/gemini-api/docs/pricing) by default, with the stable [`gemini-3.1-flash-lite`](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) model. Gemini converts the natural-language trip request into structured accessibility constraints such as wheelchair use, step-free transport, required facilities, origin, destination, and visit duration. The request uses structured JSON Schema output, and the response must also pass a Zod schema before it can enter the planning pipeline.

Explicit controls and interpreted prose are combined conservatively: either can add a supported critical requirement. The resulting profile is shown in the UI with request/control provenance before deterministic code evaluates route candidates. This makes model inference visible and consequential without allowing the model to decide accessibility status or confidence.

Featherless remains supported as an optional provider if credits become available. Set `AI_PROVIDER` to `gemini` or `featherless`; when it is unset, AccessPath selects the configured provider without exposing credentials to the browser.

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
   │      ├── Gemini free-tier interpreter (server-only)
   │      ├── Optional Featherless provider
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
- `tests/` — scenario, candidate, fallback, evidence-integrity, and route-gating checks
- `src/app/api/plan/route.ts` — validated planning API
- `src/app/api/health/route.ts` — deployment health endpoint

## Local setup

Requirements: Node.js 20.9 or newer and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey), then set `GEMINI_API_KEY` in `.env.local` to enable live request interpretation. `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`; `AI_PROVIDER=gemini` makes the selection explicit.

Featherless remains optional. If credits become available later, set `AI_PROVIDER=featherless`, `FEATHERLESS_API_KEY`, and `FEATHERLESS_MODEL` instead.

Do not commit `.env.local`. Model credentials are read only in the server runtime and are never included in client props or browser code. The Gemini free tier may use submitted content to improve Google products, so the demo warns users not to enter names, contact details, or medical records.

## Quality commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

`npm test` runs 15 deterministic checks across five suites without provider credentials or network access. The suite proves the normal replan, prose-driven no-match behavior, requirement removal, all candidate outcomes, missing-evidence and conflict gating, `Likely` caveat semantics, source/claim integrity, provider-failure fallback, and protection against a model dropping an explicit supported critical phrase.

Dependency versions are exact-pinned, and `package-lock.json` is committed for reproducible installation.

## Deploy

The application is designed for Vercel's Next.js runtime:

1. Import the public [`iamaanahmad/AccessPath`](https://github.com/iamaanahmad/AccessPath) repository into Vercel.
2. Add `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL` as encrypted environment variables.
3. Deploy and verify `/api/health` returns `{"status":"ok","service":"accesspath"}`.
4. Submit the default journey and confirm the UI reports **Gemini reasoning active**.
5. Test both the explicit controls and the prose-only “I cannot use steep ramps” scenario against the production URL.

The core demo remains functional without model credentials and accurately labels that state, but the hackathon deployment should configure Gemini so judges can verify meaningful AI usage.

## Responsible limitations

- This is a focused London pilot, not a general route planner.
- Evidence is curated and dated, not fetched live during each request.
- Transport disruptions, lift status, entrances, and facilities can change after retrieval.
- Café accessibility is inferred from two official museum pages and is intentionally scored lower than direct facility evidence.
- The Central Entrance is step-free but described by the museum as having a steep ramp; requiring no steep ramps correctly produces a `no-match` result.
- AccessPath does not guarantee that a route is safe or accessible. Users must confirm critical details with the operator and venue before travelling.
- Gemini free-tier requests may be used to improve Google products. Use synthetic demo details and never submit names, contact information, or medical records.

## Three-minute demo outline

- **0:00–0:20:** Explain why a route can exist on a map but remain unusable.
- **0:20–0:45:** Show the wheelchair, step-free, café, museum, and Changing Places request.
- **0:45–1:15:** Run verification, show **Gemini reasoning active**, and point out the interpreted-profile provenance and candidate count.
- **1:15–1:55:** Compare the rejected 25% East Entrance with the selected Central Entrance; open the conflict and current maintenance evidence.
- **1:55–2:25:** Explain the deterministic 55/25/20 scoring model, `Usable with caveats` status, and four-stage trace.
- **2:25–2:42:** Add “I cannot use steep ramps” in prose and rerun to prove model interpretation can produce a genuine `no-match` decision.
- **2:42–3:00:** Show the architecture briefly and close on the evidence-first impact.

## Hackathon submission checklist

Application work:

- [x] Functional evidence-backed London workflow
- [x] Meaningful Gemini free-tier integration with JSON Schema and Zod validation
- [x] Optional Featherless provider retained for future credits
- [x] Honest deterministic fallback
- [x] Official-source evidence graph and visible provenance
- [x] Real conflict detection and candidate-based `unchanged` / `replanned` / `no-match` decisions
- [x] Dynamic control and natural-language requirement reevaluation
- [x] Explainable deterministic route usability confidence with visible caveats
- [x] Fifteen automated scenario, fallback, evidence-integrity, and gating checks
- [x] Accessible responsive primary flow
- [x] Failure, loading, and safety states
- [x] Open-source MIT license

External shipping work:

- [x] Create and push the [public repository](https://github.com/iamaanahmad/AccessPath)
- [ ] Create a Gemini API key in Google AI Studio and configure it in Vercel
- [ ] Confirm the production UI reports **Gemini reasoning active**
- [ ] Run Prelint and retain the report for the submission
- [ ] Add Hawkeye scenario evaluation if it can be completed without risking the core
- [ ] Deploy to Vercel and verify the production URL
- [ ] Record and upload the approximately three-minute video
- [ ] Complete the Devpost project before **22 August 2026 at 9:30 PM GMT+5:30**
- [ ] Optionally claim the limited `.xyz` participant domain through the hackathon Discord

## License

[MIT](LICENSE)
