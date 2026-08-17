import {
  evidenceClaimSchema,
  evidenceSourceSchema,
  type EvidenceClaim,
  type EvidenceSource,
  type SegmentDefinition,
} from "@/lib/domain";

export const SNAPSHOT_EVALUATED_AT = "2026-08-17T12:00:00.000Z";

const sourceRecords = [
  {
    id: "tfl-wheelchair-access",
    title: "Wheelchair access and avoiding stairs",
    url: "https://tfl.gov.uk/transport-accessibility/wheelchair-access-and-avoiding-stairs",
    publisher: "Transport for London",
    type: "official-transit",
    retrievedAt: SNAPSHOT_EVALUATED_AT,
    provenance: "curated-snapshot",
  },
  {
    id: "tfl-c1-timetable",
    title: "C1 bus timetable",
    url: "https://tfl.gov.uk/bus/timetable/C1/",
    publisher: "Transport for London",
    type: "official-transit",
    retrievedAt: SNAPSHOT_EVALUATED_AT,
    provenance: "curated-snapshot",
  },
  {
    id: "nhm-getting-here",
    title: "Getting here",
    url: "https://www.nhm.ac.uk/visit/getting-here.html",
    publisher: "Natural History Museum",
    type: "official-venue",
    retrievedAt: SNAPSHOT_EVALUATED_AT,
    provenance: "curated-snapshot",
  },
  {
    id: "nhm-access",
    title: "Accessibility at South Kensington",
    url: "https://www.nhm.ac.uk/visit/access-at-south-kensington.html",
    publisher: "Natural History Museum",
    type: "official-venue",
    retrievedAt: SNAPSHOT_EVALUATED_AT,
    provenance: "curated-snapshot",
  },
  {
    id: "nhm-facilities",
    title: "Facilities and maintenance works",
    url: "https://www.nhm.ac.uk/visit/facilities.html",
    publisher: "Natural History Museum",
    type: "official-status",
    retrievedAt: SNAPSHOT_EVALUATED_AT,
    publishedAt: "2026-07-31T12:00:00.000Z",
    provenance: "curated-snapshot",
  },
  {
    id: "nhm-food",
    title: "Eat, drink and shop",
    url: "https://www.nhm.ac.uk/visit/eat-drink-and-shop.html/",
    publisher: "Natural History Museum",
    type: "official-venue",
    retrievedAt: SNAPSHOT_EVALUATED_AT,
    provenance: "curated-snapshot",
  },
] as const;

export const evidenceSources: EvidenceSource[] = sourceRecords.map((source) =>
  evidenceSourceSchema.parse(source),
);

const claimRecords = [
  {
    id: "c1-connects-victoria-south-kensington",
    subjectId: "c1-bus",
    requirementId: "step-free-transport",
    sourceId: "tfl-c1-timetable",
    statement:
      "TfL's C1 timetable lists Victoria Station and South Kensington Station on the same route.",
    stance: "supports",
    directness: 0.96,
  },
  {
    id: "tfl-low-floor-bus",
    subjectId: "c1-bus",
    requirementId: "step-free-transport",
    sourceId: "tfl-wheelchair-access",
    statement:
      "TfL says every bus route uses low-floor vehicles with a wheelchair space and access ramp.",
    stance: "supports",
    directness: 1,
  },
  {
    id: "east-entrance-lift",
    subjectId: "east-entrance",
    requirementId: "step-free-entrance",
    sourceId: "nhm-getting-here",
    statement:
      "The East Entrance is not level, but the museum describes lift access from its lobby to the galleries.",
    stance: "supports",
    directness: 1,
  },
  {
    id: "east-entrance-lift-outage",
    subjectId: "east-entrance",
    requirementId: "step-free-entrance",
    sourceId: "nhm-facilities",
    statement:
      "The museum's current maintenance notice reports the Exhibition Road entrance lift out of order.",
    stance: "contradicts",
    directness: 1,
  },
  {
    id: "central-entrance-step-free",
    subjectId: "central-entrance",
    requirementId: "step-free-entrance",
    sourceId: "nhm-getting-here",
    statement:
      "The Central Entrance, reached through the East Gate, is documented as step-free with a ramp.",
    stance: "supports",
    directness: 1,
  },
  {
    id: "central-entrance-access-page",
    subjectId: "central-entrance",
    requirementId: "step-free-entrance",
    sourceId: "nhm-access",
    statement:
      "The museum accessibility page also identifies the Central Entrance as step-free via a ramp.",
    stance: "supports",
    directness: 1,
  },
  {
    id: "central-entrance-steep-ramp",
    subjectId: "central-entrance",
    requirementId: "avoid-steep-ramps",
    sourceId: "nhm-access",
    statement:
      "The museum's accessibility page describes the Central Entrance ramp as steep.",
    stance: "contradicts",
    directness: 1,
  },
  {
    id: "museum-wheelchair-access",
    subjectId: "museum-galleries",
    requirementId: "museum-access",
    sourceId: "nhm-access",
    statement:
      "The museum describes the building as wheelchair accessible, with step-free access to most areas.",
    stance: "supports",
    directness: 0.94,
  },
  {
    id: "museum-lift-caveat",
    subjectId: "museum-galleries",
    requirementId: "museum-access",
    sourceId: "nhm-facilities",
    statement:
      "Several named lifts are unavailable, so affected galleries should be checked on arrival.",
    stance: "uncertain",
    directness: 0.8,
  },
  {
    id: "museum-cafes-available",
    subjectId: "museum-cafe",
    requirementId: "accessible-cafe",
    sourceId: "nhm-food",
    statement:
      "The museum confirms that cafés and food venues operate inside the building.",
    stance: "supports",
    directness: 0.82,
  },
  {
    id: "museum-cafe-building-access",
    subjectId: "museum-cafe",
    requirementId: "accessible-cafe",
    sourceId: "nhm-access",
    statement:
      "The accessibility guide places cafés within the wheelchair-accessible museum building.",
    stance: "supports",
    directness: 0.74,
  },
  {
    id: "wheelchair-toilets",
    subjectId: "accessible-toilet",
    requirementId: "accessible-toilet",
    sourceId: "nhm-facilities",
    statement:
      "The facilities guide confirms wheelchair-accessible toilets marked on the museum map.",
    stance: "supports",
    directness: 1,
  },
  {
    id: "changing-places-toilet",
    subjectId: "accessible-toilet",
    requirementId: "changing-places",
    sourceId: "nhm-facilities",
    statement:
      "A Changing Places toilet is listed on the Ground Floor, with a second facility available through staff if needed.",
    stance: "supports",
    directness: 1,
  },
] as const;

export const evidenceClaims: EvidenceClaim[] = claimRecords.map((claim) =>
  evidenceClaimSchema.parse(claim),
);

const origin: SegmentDefinition = {
  id: "victoria-origin",
  title: "Victoria Station",
  detail: "Start the five-hour London visit at the bus station.",
  time: "10:00",
  kind: "origin",
  critical: false,
  requirements: [],
};

const transport: SegmentDefinition = {
  id: "c1-bus",
  title: "C1 low-floor bus",
  detail: "Victoria Station to South Kensington, then continue to Exhibition Road.",
  time: "10:10",
  kind: "transport",
  critical: true,
  requirements: [
    {
      id: "step-free-transport",
      label: "Wheelchair-accessible transport",
      claimIds: ["c1-connects-victoria-south-kensington", "tfl-low-floor-bus"],
    },
  ],
};

const eastEntrance: SegmentDefinition = {
  id: "east-entrance",
  title: "East Entrance",
  detail: "Initial entrance candidate on Exhibition Road; access depends on a lift.",
  time: "10:35",
  kind: "entrance",
  critical: true,
  requirements: [
    {
      id: "step-free-entrance",
      label: "Step-free museum entrance",
      claimIds: ["east-entrance-lift", "east-entrance-lift-outage"],
    },
  ],
};

export function centralEntrance(avoidSteepRamps: boolean): SegmentDefinition {
  return {
    id: "central-entrance",
    title: "Central Entrance via East Gate",
    detail: "Replanned entrance on Cromwell Road using the documented step-free ramp.",
    time: "10:39",
    kind: "entrance",
    critical: true,
    requirements: [
      {
        id: "step-free-entrance",
        label: "Step-free museum entrance",
        claimIds: ["central-entrance-step-free", "central-entrance-access-page"],
      },
      ...(avoidSteepRamps
        ? [
            {
              id: "avoid-steep-ramps",
              label: "Avoid steep ramps",
              claimIds: ["central-entrance-steep-ramp"],
            },
          ]
        : []),
    ],
  };
}

const museum: SegmentDefinition = {
  id: "museum-galleries",
  title: "Natural History Museum",
  detail: "Wheelchair-accessible route through selected ground-floor galleries.",
  time: "10:45",
  kind: "museum",
  critical: true,
  requirements: [
    {
      id: "museum-access",
      label: "Accessible museum visit",
      claimIds: ["museum-wheelchair-access", "museum-lift-caveat"],
    },
  ],
};

const cafe: SegmentDefinition = {
  id: "museum-cafe",
  title: "Museum café stop",
  detail: "A café inside the museum's accessible visitor route.",
  time: "12:15",
  kind: "cafe",
  critical: true,
  requirements: [
    {
      id: "accessible-cafe",
      label: "Accessible café",
      claimIds: ["museum-cafes-available", "museum-cafe-building-access"],
    },
  ],
};

export function toilet(needsChangingPlaces: boolean): SegmentDefinition {
  return {
    id: "accessible-toilet",
    title: needsChangingPlaces ? "Changing Places toilet" : "Accessible toilet",
    detail: needsChangingPlaces
      ? "Ground Floor facility, with a staff-assisted backup facility documented."
      : "Wheelchair-accessible facilities are marked on the museum map.",
    time: "13:00",
    kind: "toilet",
    critical: true,
    requirements: [
      {
        id: "accessible-toilet",
        label: "Wheelchair-accessible toilet",
        claimIds: ["wheelchair-toilets"],
      },
      ...(needsChangingPlaces
        ? [
            {
              id: "changing-places",
              label: "Changing Places facility",
              claimIds: ["changing-places-toilet"],
            },
          ]
        : []),
    ],
  };
}

export function getInitialSegments(needsChangingPlaces: boolean): SegmentDefinition[] {
  return [origin, transport, eastEntrance, museum, cafe, toilet(needsChangingPlaces)];
}

export function getRevisedSegments(
  needsChangingPlaces: boolean,
  avoidSteepRamps: boolean,
): SegmentDefinition[] {
  return [
    origin,
    transport,
    centralEntrance(avoidSteepRamps),
    museum,
    cafe,
    toilet(needsChangingPlaces),
  ];
}
