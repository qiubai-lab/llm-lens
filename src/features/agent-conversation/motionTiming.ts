// Teaching presentation time, independent of model/network latency.
export const flowTiming = {
  focus: 0.55,
  draw: 1.15,
  lineArrival: 1.15,
  arrival: 1.7,
  stepHoldMs: 2100,
  content: 0.45,
  lineStagger: 0.12,
  readingHoldMs: 2200,
  resultHoldMs: 4700,
  thinkingHoldMs: 1800,
} as const;
