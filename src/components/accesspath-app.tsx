"use client";

import {
  ArrowRight,
  BadgeCheck,
  BusFront,
  Check,
  ChevronRight,
  CircleAlert,
  Coffee,
  ExternalLink,
  Info,
  Landmark,
  MapPin,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Toilet,
  TriangleAlert,
  Waypoints,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type {
  Assessment,
  EvidenceStatus,
  JourneyKind,
  PlanResult,
  RouteResult,
  SegmentResult,
} from "@/lib/domain";

const DEFAULT_REQUEST =
  "I'm a wheelchair user visiting London for 5 hours. I need step-free transport from Victoria, an accessible café, a museum, and an accessible restroom.";

type SelectedSegment = {
  route: "initial" | "revised";
  id: string;
};

const kindIcons: Record<JourneyKind, typeof MapPin> = {
  origin: MapPin,
  transport: BusFront,
  entrance: ArrowRight,
  museum: Landmark,
  cafe: Coffee,
  toilet: Toilet,
};

const statusIcons: Record<EvidenceStatus, typeof Check> = {
  Verified: Check,
  Likely: Info,
  Conflicting: TriangleAlert,
  Inaccessible: X,
  Unknown: CircleAlert,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function routeIsUsable(route: RouteResult) {
  return route.status === "verified" || route.status === "usable-with-caveats";
}

function routeStateLabel(route: RouteResult) {
  if (route.status === "verified") return "Meets every requirement";
  if (route.status === "usable-with-caveats") return "Usable with caveats";
  if (route.status === "blocked") return "Does not meet profile";
  return "Critical review needed";
}

function RouteSummary({
  route,
  active,
  locked = false,
  onSelect,
}: {
  route: RouteResult;
  active: boolean;
  locked?: boolean;
  onSelect: () => void;
}) {
  const isUsable = routeIsUsable(route);
  const hasCaveats = route.status === "usable-with-caveats";
  const isBlocked = route.status === "blocked";

  return (
    <button
      type="button"
      className={`route-summary ${active ? "is-active" : ""}`}
      data-route-status={route.status}
      data-locked={locked}
      onClick={onSelect}
      aria-pressed={active}
      disabled={locked}
      aria-label={locked ? `${route.label}: run verification to reveal this route` : undefined}
    >
      <span className="route-summary-topline">
        <span className="route-summary-label">{route.label}</span>
        <span className="route-summary-state">
          {locked ? (
            <><Sparkles size={15} /> Awaiting verification</>
          ) : (
            <>
              {isUsable ? (
                hasCaveats ? <Info size={15} /> : <Check size={15} />
              ) : isBlocked ? (
                <X size={15} />
              ) : (
                <TriangleAlert size={15} />
              )}
              {routeStateLabel(route)}
            </>
          )}
        </span>
      </span>
      <span className="route-summary-score">
        <strong>{locked ? "—" : `${route.confidence}%`}</strong>
        <span>
          {locked
            ? "Run verification to reveal"
            : `Route usability confidence · ${route.confidenceLabel}`}
        </span>
      </span>
    </button>
  );
}

function SegmentCard({
  segment,
  selected,
  onSelect,
  isLast,
}: {
  segment: SegmentResult;
  selected: boolean;
  onSelect: () => void;
  isLast: boolean;
}) {
  const KindIcon = kindIcons[segment.kind];
  const StatusIcon = statusIcons[segment.status];

  return (
    <li className="journey-item">
      <div className="journey-rail" aria-hidden="true">
        <span className="journey-node">
          <KindIcon size={17} strokeWidth={2.2} />
        </span>
        {!isLast && <span className="journey-line" />}
      </div>
      <button
        type="button"
        className={`segment-card ${selected ? "is-selected" : ""}`}
        data-segment-status={segment.status.toLowerCase()}
        onClick={onSelect}
        aria-label={`View evidence for ${segment.title}, ${segment.status}, ${segment.confidence}% confidence`}
      >
        <span className="segment-time">{segment.time}</span>
        <span className="segment-copy">
          <span className="segment-title-row">
            <strong>{segment.title}</strong>
            {segment.changed && (
              <span className={`change-label ${segment.changed}`}>
                {segment.changed === "added"
                  ? "Selected"
                  : segment.changed === "removed"
                    ? "Rejected"
                    : "Evaluated"}
              </span>
            )}
          </span>
          <span className="segment-detail">{segment.detail}</span>
          {segment.assessments.length > 0 && (
            <span className="segment-status">
              <span className="status-icon" aria-hidden="true">
                <StatusIcon size={14} strokeWidth={2.5} />
              </span>
              {segment.status}
              <span aria-hidden="true"> · </span>
              {segment.confidence}% confidence
            </span>
          )}
        </span>
        <ChevronRight className="segment-chevron" size={19} aria-hidden="true" />
      </button>
    </li>
  );
}

function AssessmentBlock({ assessment }: { assessment: Assessment }) {
  const StatusIcon = statusIcons[assessment.status];

  return (
    <section className="assessment-block" aria-labelledby={`assessment-${assessment.requirementId}`}>
      <div className="assessment-heading">
        <span className="assessment-status-icon" data-status={assessment.status.toLowerCase()} aria-hidden="true">
          <StatusIcon size={17} />
        </span>
        <div>
          <p className="eyebrow">Requirement</p>
          <h4 id={`assessment-${assessment.requirementId}`}>{assessment.label}</h4>
        </div>
        <span className="assessment-score">{assessment.confidence}%</span>
      </div>
      <p className="assessment-summary">{assessment.summary}</p>

      <div className="evidence-list">
        {assessment.evidence.map(({ claim, source, score, freshnessLabel }) => (
          <article className="evidence-card" key={claim.id} data-stance={claim.stance}>
            <div className="evidence-card-topline">
              <span className="evidence-stance">
                {claim.stance === "supports" ? <Check size={14} /> : claim.stance === "contradicts" ? <X size={14} /> : <Info size={14} />}
                {claim.stance === "supports" ? "Supports" : claim.stance === "contradicts" ? "Contradicts" : "Caveat"}
              </span>
              <span className="evidence-score">Evidence {score}/100</span>
            </div>
            <p>{claim.statement}</p>
            <div className="source-meta">
              <span>{source.publisher}</span>
              <span aria-hidden="true">·</span>
              <span>{freshnessLabel}</span>
            </div>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title}
              <ExternalLink size={13} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </article>
        ))}
      </div>

      <details className="score-details">
        <summary>How this score was calculated</summary>
        <ul>
          {assessment.rationale.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function EvidencePanel({ segment, evaluatedAt }: { segment: SegmentResult; evaluatedAt: string }) {
  return (
    <aside className="evidence-panel" aria-labelledby="evidence-panel-title">
      <div className="evidence-panel-header">
        <div>
          <p className="eyebrow">Why we believe this</p>
          <h3 id="evidence-panel-title">{segment.title}</h3>
        </div>
        <span className="large-confidence">{segment.confidence}%</span>
      </div>
      <p className="evidence-panel-detail">{segment.detail}</p>
      <div className="snapshot-note">
        <ShieldCheck size={16} aria-hidden="true" />
        Curated official-source snapshot checked {formatDate(evaluatedAt)}
      </div>
      {segment.assessments.length > 0 ? (
        segment.assessments.map((assessment) => (
          <AssessmentBlock assessment={assessment} key={assessment.requirementId} />
        ))
      ) : (
        <p className="empty-evidence">This is the journey starting point and has no accessibility claim to verify.</p>
      )}
    </aside>
  );
}

export function AccessPathApp({ initialPlan }: { initialPlan: PlanResult }) {
  const [plan, setPlan] = useState(initialPlan);
  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [needsChangingPlaces, setNeedsChangingPlaces] = useState(true);
  const [avoidSteepRamps, setAvoidSteepRamps] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [activeRoute, setActiveRoute] = useState<"initial" | "revised">("initial");
  const [selected, setSelected] = useState<SelectedSegment>({
    route: "initial",
    id: "east-entrance",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState(
    `Initial route loaded with ${initialPlan.initialRoute.confidence}% confidence. Verification is ready to run.`,
  );

  const displayedRoute = activeRoute === "initial" ? plan.initialRoute : plan.revisedRoute;
  const selectedSegment = useMemo(() => {
    const selectedRoute = selected.route === "initial" ? plan.initialRoute : plan.revisedRoute;
    return (
      selectedRoute.segments.find((segment) => segment.id === selected.id) ??
      displayedRoute.segments[0]
    );
  }, [displayedRoute.segments, plan.initialRoute, plan.revisedRoute, selected]);

  function invalidateVerification() {
    setHasVerified(false);
    setActiveRoute("initial");
    setSelected({ route: "initial", id: "east-entrance" });
    setError("");
    setAnnouncement("Journey requirements changed. Run verification again to evaluate the updated request.");
  }

  function selectRoute(route: "initial" | "revised") {
    const target = route === "initial" ? plan.initialRoute : plan.revisedRoute;
    setActiveRoute(route);
    setSelected({ route, id: target.candidateId });
    setAnnouncement(`${target.label} selected. ${routeStateLabel(target)}.`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setHasVerified(false);
    setActiveRoute("initial");
    setSelected({ route: "initial", id: "east-entrance" });
    setError("");
    setAnnouncement("Verifying accessibility requirements against the evidence graph.");

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, needsChangingPlaces, avoidSteepRamps }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.issues?.[0] ?? payload.error ?? "Unable to evaluate the journey.");
      }

      const nextPlan = payload as PlanResult;
      setPlan(nextPlan);
      setHasVerified(true);
      setActiveRoute("revised");
      setSelected({ route: "revised", id: nextPlan.revisedRoute.candidateId });
      setAnnouncement(
        `Verification complete. ${nextPlan.replan.title}. Route usability confidence is ${nextPlan.revisedRoute.confidence}%.`,
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to evaluate the journey.";
      setError(message);
      setAnnouncement(`Verification failed. ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to journey results</a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="AccessPath home">
          <span className="brand-mark" aria-hidden="true"><Waypoints size={20} /></span>
          <span>AccessPath</span>
        </a>
        <nav aria-label="Page sections">
          <a href="#planner">Planner</a>
          <a href="#journey">Journey</a>
          <a href="#method">Method</a>
        </nav>
        <span className="prototype-chip">London pilot</span>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-copy">
            <div className="hero-kicker"><Sparkles size={15} aria-hidden="true" /> AI accessibility verification</div>
            <h1>Know what works.<br /><span>Before you arrive.</span></h1>
            <p>
              AccessPath checks every critical part of a journey against attributable evidence,
              exposes uncertainty, and replans around barriers.
            </p>
          </div>
          <div className="hero-proof" aria-label="AccessPath process">
            <div><span>01</span><strong>Understand</strong><small>Your access needs</small></div>
            <ArrowRight size={18} aria-hidden="true" />
            <div><span>02</span><strong>Verify</strong><small>Official evidence</small></div>
            <ArrowRight size={18} aria-hidden="true" />
            <div><span>03</span><strong>Replan</strong><small>Around barriers</small></div>
          </div>
        </section>

        <section className="planner-card" id="planner" aria-labelledby="planner-title">
          <div className="planner-intro">
            <p className="eyebrow">Plan a verified journey</p>
            <h2 id="planner-title">What do you need?</h2>
            <p>This pilot evaluates one evidence-backed London journey and lets you change critical requirements.</p>
          </div>
          <form onSubmit={submit} className="planner-form">
            <label htmlFor="trip-request">Describe your visit and accessibility needs</label>
            <textarea
              id="trip-request"
              value={request}
              onChange={(event) => {
                setRequest(event.target.value);
                invalidateVerification();
              }}
              rows={3}
              maxLength={600}
              aria-describedby="trip-request-privacy"
              required
            />
            <p className="privacy-note" id="trip-request-privacy">
              Use demo details only—do not enter names, contact details, or medical records. Free-tier AI requests are processed under the provider&apos;s terms.
            </p>
            <fieldset>
              <legend>Critical facilities</legend>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={needsChangingPlaces}
                  onChange={(event) => {
                    setNeedsChangingPlaces(event.target.checked);
                    invalidateVerification();
                  }}
                />
                <span className="custom-check" aria-hidden="true"><Check size={13} /></span>
                Require a Changing Places toilet
              </label>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={avoidSteepRamps}
                  onChange={(event) => {
                    setAvoidSteepRamps(event.target.checked);
                    invalidateVerification();
                  }}
                />
                <span className="custom-check" aria-hidden="true"><Check size={13} /></span>
                Avoid steep ramps
              </label>
            </fieldset>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? <RefreshCw className="spin" size={18} /> : <Route size={18} />}
              {loading ? "Verifying journey…" : hasVerified ? "Verify journey again" : "Verify my journey"}
            </button>
            <div
              className="verification-indicator"
              data-state={loading ? "loading" : hasVerified ? "complete" : "ready"}
              role="status"
              aria-live="polite"
            >
              <span className="verification-indicator-icon" aria-hidden="true">
                {loading ? <RefreshCw className="spin" size={16} /> : hasVerified ? <BadgeCheck size={17} /> : <Info size={17} />}
              </span>
              <span>
                <strong>{loading ? "Verification in progress" : hasVerified ? "Verification complete" : "Ready to verify"}</strong>
                <small>
                  {loading
                    ? "Structuring your requirements and checking each critical segment."
                    : hasVerified
                      ? `${plan.ai.mode === "gemini" ? "Gemini" : plan.ai.mode === "featherless" ? "Featherless" : "Local fallback"} structured the request. Route usability confidence changed from ${plan.initialRoute.confidence}% to ${plan.revisedRoute.confidence}%.`
                      : `The unrepaired route is shown below at ${plan.initialRoute.confidence}% confidence.`}
                </small>
              </span>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
          </form>
        </section>

        <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>

        <section className="results-section" id="journey" aria-labelledby="results-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Accessibility assessment</p>
              <h2 id="results-title">
                {!hasVerified
                  ? "Initial route found. Verification pending."
                  : plan.replan.outcome === "replanned"
                    ? "One barrier found. Best usable route selected."
                    : plan.replan.outcome === "no-match"
                      ? "Every candidate checked. No usable route confirmed."
                      : "Preferred route verified. No replan needed."}
              </h2>
            </div>
            <div className="data-badge"><BadgeCheck size={16} /> {plan.dataMode}</div>
          </div>

          {hasVerified && (
            <section className="verification-receipt" aria-labelledby="verification-receipt-title">
              <div className="verification-receipt-heading">
                <span className="verification-receipt-icon" aria-hidden="true"><Sparkles size={19} /></span>
                <div>
                  <p className="eyebrow">Interpreted profile</p>
                  <h3 id="verification-receipt-title">
                    {plan.ai.mode === "gemini"
                      ? "Gemini structured the request"
                      : plan.ai.mode === "featherless"
                        ? "Featherless structured the request"
                        : "Validated local fallback structured the request"}
                  </h3>
                  <p>{plan.candidates.length} entrance candidates were then evaluated by deterministic evidence rules.</p>
                </div>
              </div>
              <ul className="constraint-list" aria-label="Required accessibility constraints">
                {plan.constraints
                  .filter((constraint) => constraint.required)
                  .map((constraint) => (
                    <li key={constraint.id}>
                      <Check size={14} aria-hidden="true" />
                      <span>{constraint.label}</span>
                      <small>
                        {constraint.source === "control"
                          ? "Explicit control"
                          : constraint.source === "request"
                            ? "Understood from request"
                            : "Supported pilot default"}
                      </small>
                    </li>
                  ))}
              </ul>
              <details className="decision-trace">
                <summary>See the four-stage verification trace</summary>
                <ol>
                  {plan.stages.map((stage) => <li key={stage}>{stage}</li>)}
                </ol>
              </details>
            </section>
          )}

          <div className="route-switcher" aria-label="Compare route assessments">
            <RouteSummary
              route={plan.initialRoute}
              active={activeRoute === "initial"}
              onSelect={() => selectRoute("initial")}
            />
            <span className="route-switch-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
            <RouteSummary
              route={plan.revisedRoute}
              active={activeRoute === "revised"}
              locked={!hasVerified}
              onSelect={() => selectRoute("revised")}
            />
          </div>

          {hasVerified ? (
            <div className="replan-callout" data-status={plan.revisedRoute.status}>
              <div className="replan-icon" aria-hidden="true">
                {routeIsUsable(plan.revisedRoute) ? <ShieldCheck size={22} /> : <TriangleAlert size={22} />}
              </div>
              <div>
                <p className="eyebrow">
                  {plan.replan.outcome === "replanned"
                    ? "Deterministic replan"
                    : plan.replan.outcome === "no-match"
                      ? "Candidate evaluation"
                      : "Route retained"}
                </p>
                <h3>{plan.replan.title}</h3>
                <p>{plan.replan.explanation}</p>
              </div>
            </div>
          ) : (
            <div className="replan-callout is-pending">
              <div className="replan-icon" aria-hidden="true"><CircleAlert size={22} /></div>
              <div>
                <p className="eyebrow">Pre-verification finding</p>
                <h3>The initial route contains conflicting entrance evidence</h3>
                <p>Run verification to apply your requirements, inspect the conflict, and reveal any usable alternative.</p>
              </div>
            </div>
          )}

          <div className="result-grid">
            <section className="journey-panel" aria-labelledby="journey-title">
              <div className="journey-header">
                <div>
                  <p className="eyebrow">{displayedRoute.label}</p>
                  <h3 id="journey-title">Victoria to the Natural History Museum</h3>
                </div>
                <span className="journey-duration">5-hour visit</span>
              </div>
              <ol className="journey-list">
                {displayedRoute.segments.map((segment, index) => (
                  <SegmentCard
                    segment={segment}
                    key={segment.id}
                    selected={selected.route === activeRoute && selected.id === segment.id}
                    onSelect={() => {
                      setSelected({ route: activeRoute, id: segment.id });
                      setAnnouncement(`Showing evidence for ${segment.title}.`);
                    }}
                    isLast={index === displayedRoute.segments.length - 1}
                  />
                ))}
              </ol>
              <div className="journey-footnote">
                <Info size={15} aria-hidden="true" />
                Select any step to inspect its claims, sources, freshness, and score.
              </div>
            </section>

            <EvidencePanel segment={selectedSegment} evaluatedAt={plan.evaluatedAt} />
          </div>
        </section>

        <section className="method-section" id="method" aria-labelledby="method-title">
          <div className="method-heading">
            <p className="eyebrow">Trust through transparency</p>
            <h2 id="method-title">AI reads meaning. Rules decide safety.</h2>
            <p>AccessPath separates semantic reasoning from deterministic accessibility decisions.</p>
          </div>
          <div className="method-grid">
            <article>
              <span className="method-number">01</span>
              <Sparkles size={21} aria-hidden="true" />
              <h3>Structure the request</h3>
              <p>A schema-constrained AI provider extracts needs such as step-free access and required facilities.</p>
            </article>
            <article>
              <span className="method-number">02</span>
              <Waypoints size={21} aria-hidden="true" />
              <h3>Connect the evidence</h3>
              <p>Claims are linked to the exact entrance, vehicle, venue, or facility they describe.</p>
            </article>
            <article>
              <span className="method-number">03</span>
              <ShieldCheck size={21} aria-hidden="true" />
              <h3>Score deterministically</h3>
              <p>Source authority, directness, freshness, corroboration, and conflicts determine confidence.</p>
            </article>
          </div>
          <div className="run-trace">
            <span className="run-trace-dot" data-mode={plan.ai.mode} aria-hidden="true" />
            <strong>
              {plan.ai.mode === "gemini"
                ? "Gemini reasoning active"
                : plan.ai.mode === "featherless"
                  ? "Featherless reasoning active"
                  : "Reliable fallback active"}
            </strong>
            <span>{plan.ai.note}</span>
          </div>
        </section>

        <section className="safety-note" aria-labelledby="before-travel-title">
          <TriangleAlert size={22} aria-hidden="true" />
          <div>
            <h2 id="before-travel-title">Before you travel</h2>
            <p>{plan.disclaimer}</p>
          </div>
        </section>
      </main>

      <footer>
        <div className="brand"><span className="brand-mark" aria-hidden="true"><Waypoints size={18} /></span><span>AccessPath</span></div>
        <p>Evidence-backed journeys, with uncertainty left visible.</p>
        <span>London pilot · Open-source hackathon project</span>
      </footer>
    </>
  );
}
