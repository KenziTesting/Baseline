/** Body metrics analytics (spec A.1): bodyweight 7-day MA, vertical trend. Pure. */

import type { BodyMetric } from "@/lib/progress/types";
import { movingAverage, type SeriesPoint } from "./strength";

export function bodyweightSeries(metrics: BodyMetric[]): SeriesPoint[] {
  return metrics
    .filter((m) => m.bodyweightKg != null)
    .map((m) => ({ dateISO: m.dateISO, value: m.bodyweightKg! }))
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
}

export function bodyweightMA(metrics: BodyMetric[], window = 7): SeriesPoint[] {
  return movingAverage(bodyweightSeries(metrics), window);
}

export function verticalSeries(metrics: BodyMetric[]): SeriesPoint[] {
  return metrics
    .filter((m) => m.verticalIn != null)
    .map((m) => ({ dateISO: m.dateISO, value: m.verticalIn! }))
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
}
