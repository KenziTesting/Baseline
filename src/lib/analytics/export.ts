/** Data export (spec A.3: "It's the user's data."). Pure serialization. */

import type { LoggedSet } from "@/lib/core";
import type { BodyMetric, ShotLog } from "@/lib/progress/types";

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export function strengthLogsCSV(logs: LoggedSet[]): string {
  return toCSV(
    ["date", "exerciseId", "load", "reps", "groundContacts", "rir"],
    logs.map((s) => [new Date(s.timestamp).toISOString(), s.exerciseId, s.load ?? "", s.reps ?? "", s.groundContacts ?? "", s.rir ?? ""]),
  );
}

export function shootingLogsCSV(logs: ShotLog[]): string {
  return toCSV(["date", "zone", "makes", "attempts"], logs.map((l) => [l.dateISO, l.zone, l.makes, l.attempts]));
}

export interface ExportBundle {
  strengthLogs: LoggedSet[];
  shootingLogs: ShotLog[];
  bodyMetrics: BodyMetric[];
  exportedAt: string;
}

export function buildExportBundle(strengthLogs: LoggedSet[], shootingLogs: ShotLog[], bodyMetrics: BodyMetric[]): ExportBundle {
  return { strengthLogs, shootingLogs, bodyMetrics, exportedAt: new Date().toISOString() };
}
