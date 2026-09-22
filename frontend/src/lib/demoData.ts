import type { DetectedSubscription } from "./api";

/** Sample-CSV results, frozen in the client. Demo never calls the API. */
export const DEMO_SUBSCRIPTIONS: DetectedSubscription[] = [
  {
    merchantNorm: "ADOBE",
    avgAmount: 56.49,
    intervalDays: 30,
    occurrences: 6,
    firstSeen: "2025-10-12",
    lastSeen: "2026-03-12",
    priceIncreased: true,
    projectedAnnual: 687.3,
  },
  {
    merchantNorm: "PLANET FITNESS",
    avgAmount: 24.99,
    intervalDays: 30,
    occurrences: 6,
    firstSeen: "2025-10-01",
    lastSeen: "2026-03-01",
    priceIncreased: false,
    projectedAnnual: 304.05,
  },
  {
    merchantNorm: "OPENAI",
    avgAmount: 20,
    intervalDays: 30,
    occurrences: 6,
    firstSeen: "2025-10-22",
    lastSeen: "2026-03-22",
    priceIncreased: false,
    projectedAnnual: 243.33,
  },
  {
    merchantNorm: "NETFLIX",
    avgAmount: 16.74,
    intervalDays: 30,
    occurrences: 6,
    firstSeen: "2025-10-05",
    lastSeen: "2026-03-05",
    priceIncreased: true,
    projectedAnnual: 203.67,
  },
  {
    merchantNorm: "YOUTUBE",
    avgAmount: 13.99,
    intervalDays: 30,
    occurrences: 6,
    firstSeen: "2025-10-20",
    lastSeen: "2026-03-20",
    priceIncreased: false,
    projectedAnnual: 170.21,
  },
  {
    merchantNorm: "SPOTIFY",
    avgAmount: 10.99,
    intervalDays: 30,
    occurrences: 6,
    firstSeen: "2025-10-08",
    lastSeen: "2026-03-08",
    priceIncreased: false,
    projectedAnnual: 133.71,
  },
  {
    merchantNorm: "GITHUB",
    avgAmount: 4,
    intervalDays: 30,
    occurrences: 6,
    firstSeen: "2025-10-14",
    lastSeen: "2026-03-14",
    priceIncreased: false,
    projectedAnnual: 48.67,
  },
];

export const DEMO_NARRATIVE =
  "Detected 7 recurring subscriptions totaling $1,791/year. Software is the largest bucket ($979), then Streaming ($508) and Fitness ($304). Price increases: Adobe and Netflix.";
