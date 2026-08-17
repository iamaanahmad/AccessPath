# AccessPath Project and Shipping Guide

This steering document is the source of truth for building and shipping AccessPath for the Pixel Forge AI Hackathon. Follow it when making product, design, architecture, implementation, testing, demo, and submission decisions.

## Product Direction

**Project:** AccessPath  
**Tagline:** Don't just find a route. Find a route you can actually use.  
**Core innovation:** Accessibility verification, evidence-backed confidence, conflict detection, and automatic replanning.  
**Primary target user:** A wheelchair user who requires step-free transport and accessible venues.  
**MVP setting:** One polished London journey.

AccessPath is not a generic AI travel planner. It converts a travel request and accessibility needs into a journey whose critical segments are checked against attributable evidence. It exposes uncertainty rather than hiding it and replans when a barrier or evidence conflict is found.

The intended user outcome is: **understand whether a proposed journey is usable, why AccessPath believes that, what remains uncertain, and which alternative is recommended.**

## Hackathon Objective

Optimize first for a credible, polished First Place submission and second for Best Use of Prelint. The judging criteria are:

1. **Originality:** Make verification and replanning—not itinerary generation—the unmistakable product story.
2. **Design:** Make the journey, status, evidence, conflict, and alternative understandable within seconds.
3. **Potential Impact:** Demonstrate a serious accessibility problem without exaggerating reliability or coverage.
4. **Technological Implementation:** Show functional AI, deterministic validation, quality software engineering, and graceful failure behavior.

Sponsor integrations must support the product rather than dictate its architecture. Do not add technology only to display a sponsor logo.

## Non-Negotiable MVP Scope

Build one extraordinary end-to-end workflow:

1. Capture a wheelchair user's requirements.
2. Accept a London visit request containing transport, a café, a museum, and an accessible restroom.
3. Produce an initial journey from supported places and segments.
4. Research or retrieve accessibility evidence for each critical claim.
5. Extract structured claims with source attribution and dates.
6. Identify missing, stale, or contradictory evidence.
7. Calculate explainable confidence using deterministic rules.
8. Detect at least one meaningful accessibility problem.
9. Automatically produce a better route or entrance recommendation.
10. Present the revised journey, uncertainty, and evidence in an accessible UI.

Judges must be able to change at least one supported requirement or choice and trigger a genuine reevaluation. The demo must not be only a fixed animation or a hard-coded transcript.

### Explicitly Out of Scope

Do not build global coverage, reservations, payments, hotel booking, transport ticketing, a social network, crowdsourcing, voice control, native mobile applications, or a general-purpose travel assistant. Do not build a replacement for Google Maps.

Prefer a small, honest supported dataset and a complete workflow over broad claims with unreliable behavior.

## Winning Demonstration Moment

The defining interaction is:

1. AccessPath proposes or evaluates an initial route.
2. It discovers that a critical segment—such as a museum's main entrance or required elevator—is inaccessible, uncertain, or contradicted by evidence.
3. It displays the exact claim and supporting/conflicting sources.
4. It replans to a usable alternative, such as the North Entrance.
5. It explains why the alternative is preferred and how confidence changed.

If this interaction is not functional, prioritize it over secondary features.

## Evidence and Data Integrity

Every accessibility assertion shown as supported must be connected to evidence. Preserve:

- Source title and URL
- Source type
- Extracted claim
- Relevant place, entrance, facility, or route segment
- Publication or observation date when available
- Retrieval date
- Whether the source supports, contradicts, or is neutral toward the claim
- Freshness status

Use explicit claim states:

- **Verified:** Strong, current evidence supports the claim and no unresolved critical conflict exists.
- **Likely:** Evidence supports the claim but is incomplete, indirect, or less authoritative.
- **Conflicting:** Credible sources disagree.
- **Unknown:** There is insufficient evidence.
- **Inaccessible:** Evidence indicates the requirement is not met.

Never fabricate a source, date, accessibility fact, or confidence rationale. Failed research must become `Unknown`, not a model-generated assumption. Clearly label curated/demo data and live-retrieved data. Do not imply live elevator status unless a real status source is being queried.

Accessibility information can become stale. Display a visible last-checked or evidence date and advise users to confirm critical details with the relevant operator or venue. Do not claim that a route is guaranteed safe or accessible.

## Explainable Confidence

Confidence must not be an arbitrary LLM-generated percentage. AI may extract and classify evidence, but application code must calculate status and confidence from visible rules.

The scoring implementation must account for:

- Source authority
- Evidence freshness
- Directness and specificity of the claim
- Independent corroboration
- Contradictions
- Missing evidence for a critical requirement

Route confidence must not hide a dangerous segment behind an average. Base the route-level result on the weakest critical requirement or otherwise ensure one critical unknown/conflict visibly limits the overall result.

Use human-readable status labels alongside any percentage. The evidence panel must make the score rationale inspectable. Critical unknown evidence must not receive a high-confidence label. Keep scoring rules centralized, deterministic, and easy to explain in the demo and repository.

## AI Responsibilities

Use AI where semantic reasoning is necessary:

- Convert natural-language user needs into structured accessibility constraints.
- Extract structured accessibility claims from source text.
- Determine whether evidence supports or contradicts a claim.
- Compare candidate plans against user constraints.
- Generate a concise explanation of why replanning occurred.

Use deterministic application code for:

- Schema validation
- Source attribution and deduplication
- Confidence calculation
- Critical-constraint enforcement
- Route acceptance or rejection rules
- State transitions and error handling

Prefer a small number of reliable, structured AI operations over several nominal agents. Every model response used by the application must conform to a validated schema. Invalid or incomplete output must fail safely and remain uncertain.

Gemini's free-tier Developer API is the default model provider for the hackathon MVP. Featherless remains an optional provider if separate credits become available. Keep integrations behind the provider boundary, keep secrets server-side, disclose provider data handling, and show meaningful model usage rather than merely rewriting text.

## Recommended Technical Shape

Use the smallest architecture that supports the workflow:

- Next.js and TypeScript web application
- Server-side API or server actions for secret-bearing operations
- Structured user accessibility profile
- Trip planner and constraint evaluator
- Evidence store with a small accessibility evidence graph
- Model provider abstraction for Gemini, with optional Featherless support
- Deterministic confidence and replanning rules
- Curated fallback dataset for a reliable demo

The evidence graph should connect places and journey segments to accessibility claims and their sources. A useful minimum shape is:

- `Place`
- `JourneySegment`
- `AccessibilityRequirement`
- `AccessibilityClaim`
- `EvidenceSource`
- `Assessment`
- `Alternative`

Do not add infrastructure that does not improve the judged experience. Reliability during the hosted demo is more important than architectural scale.

## Core UI

The primary result should contain:

- Overall accessibility status and confidence
- Journey timeline
- Per-stop and per-segment status
- Clear warnings for conflicts and unknowns
- Visible revised segment or entrance
- Evidence drill-down explaining each assessment
- Source links and evidence dates
- A clear distinction between the initial and revised route

Never communicate status through color alone. Use labels, icons, and text. Avoid fake agent activity; progress indicators must correspond to real work or clearly represent application stages.

## Accessibility Requirements for the Product

Because AccessPath serves disabled users, its own accessibility is a judging-critical feature. Include:

- Semantic HTML and logical heading structure
- Keyboard access to all interactive controls
- Visible focus indicators
- Descriptive labels and accessible names
- Screen-reader announcements for asynchronous plan and status changes where appropriate
- Sufficient color contrast
- Text or icons in addition to color for statuses
- Reduced-motion support
- Useful errors and loading states
- Responsive layout and readable text sizing

Treat major accessibility defects as release blockers.

## Reliability and Quality

Demonstrate at least these scenarios before shipping:

1. Supported request produces a complete evidence-backed journey.
2. Conflicting entrance evidence is surfaced and causes replanning.
3. Missing critical evidence remains `Unknown` and limits confidence.
4. Changing a supported requirement causes reevaluation.
5. Invalid model output is rejected without inventing a result.
6. Model or research failure falls back gracefully or shows a useful error.
7. Every displayed source link corresponds to the displayed claim.

Use Hawkeye for repeatable evaluation of the important accessibility scenarios if it can be integrated reliably. Use Prelint as a genuine quality/security workflow and retain useful evidence of its findings or checks for the submission. Do not let either integration delay the functional core.

## Demo Video Plan (~3 Minutes)

- **0:00–0:20 — Problem:** Conventional routing can suggest a journey that a wheelchair user cannot complete.
- **0:20–0:45 — Request:** Enter the five-hour London request and accessibility requirements.
- **0:45–1:20 — Verification:** Show real stages—constraint extraction, evidence retrieval, assessment, and conflict detection.
- **1:20–2:10 — Result and replan:** Reveal the problematic segment, inspect its evidence, and show the revised entrance or route.
- **2:10–2:35 — Trust:** Open the score rationale, source dates, and unresolved uncertainty.
- **2:35–2:50 — Implementation:** Briefly show Gemini structured inference, validated output, the evidence graph, and deterministic scoring/replanning. Mention optional Featherless support only if credits become available.
- **2:50–3:00 — Impact:** Close with the tagline and responsible limitation statement.

Prioritize the working product over slides. The value and replan should be understandable even with the sound off.

## Build Priority

When time is constrained, work in this order:

1. End-to-end happy path with a supported London journey
2. Evidence model and visible source attribution
3. Real conflict detection and automatic replan
4. Deterministic, explainable confidence
5. Polished and accessible primary UI
6. Failure states and dynamic reevaluation
7. Hosted deployment reliability
8. Prelint and Hawkeye evidence
9. Submission materials and video polish

Cut secondary features instead of weakening items 1–7.

## Definition of Done

AccessPath is ready to submit only when:

- A judge can open the hosted URL without local setup or credentials.
- The core journey completes reliably in the deployed environment.
- A real evidence conflict causes a visible, explainable replan.
- At least one supported input change triggers reevaluation.
- Sources, dates, uncertainty, and curated/live data distinctions are honest.
- Confidence is deterministic and explainable.
- The primary flow is keyboard usable and does not depend on color alone.
- Secrets and private credentials are absent from client code and the repository.
- The public repository contains setup instructions and a complete open-source license.
- The repository explains AI responsibilities, deterministic responsibilities, scoring, data provenance, limitations, and sponsor-tool usage.
- The approximately three-minute video shows the functioning hosted product.
- The Devpost project is fully completed before **22 August 2026 at 9:30 PM GMT+5:30**.

## Required Submission Artifacts

Do not consider the hackathon task complete until all are available:

- Hosted project URL
- Public open-source repository URL
- Complete, clearly visible open-source license
- Approximately three-minute demo video URL
- Completed Devpost submission

The `.xyz` participant domain is optional and must not block deployment. Claim it early through the hackathon's stated process if still available.

## Product Decision Rule

For every proposed feature, ask:

1. Does it make accessibility verification more credible?
2. Does it make the conflict and replan easier to understand?
3. Does it directly improve a published judging criterion?
4. Can it be finished and demonstrated reliably before submission?

If the answer is no, defer it. Ship one credible, accessible verification workflow—not a broad travel platform.
