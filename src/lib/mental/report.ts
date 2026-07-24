/**
 * The Sunday Report generator (spec I6). Deterministic assembly — every sentence
 * traces to a real logged value; a claim with no value does not ship. Language is
 * templated (no LLM fabrication). Honesty is a feature: when a metric hasn't
 * moved, it says so (spec Part D honesty requirement).
 */

export interface ReportLine {
  kind: "win" | "honest" | "note";
  text: string;
  /** The metric + underlying value this sentence is derived from (traceability). */
  metric: string;
  value: number | string;
}

export interface ReportInput {
  weekName: string;
  nextTeaser: string;
  alterEgo?: string;
  blocksCompleted: number;
  blocksTotal: number;
  missedTitles: string[];
  /** Wednesday 85% vs 100% set makes. */
  eightyFive?: { at85Makes: number; at100Makes: number };
  /** Shoulder (or average) tension audit, this week vs last. */
  tensionThis?: number;
  tensionPrior?: number;
  /** Pressure-FT gap (points), this week vs last. Lower is better. */
  pressureGapThis?: number;
  pressureGapPrior?: number;
  /** Monday intention self-grade 0-3. */
  intentionGrade?: number;
  focusInsight?: { under: number; over: number; delta: number };
}

export interface SundayReport {
  weekName: string;
  lines: ReportLine[];
  nextTeaser: string;
}

export function generateSundayReport(input: ReportInput): SundayReport {
  const lines: ReportLine[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) <= 0.2;

  // 85% vs 100% — the week's whole lesson when it lands.
  if (input.eightyFive) {
    const { at85Makes, at100Makes } = input.eightyFive;
    const diff = at85Makes - at100Makes;
    if (diff > 0) {
      lines.push({ kind: "win", metric: "85%_vs_100%_makes", value: diff, text: `85% beat 100% by ${diff} ${diff === 1 ? "make" : "makes"}. That 3-word lesson — loose is fast — you found it yourself. Nobody can un-teach you that.` });
    } else {
      lines.push({ kind: "honest", metric: "85%_vs_100%_makes", value: diff, text: `85% didn't beat 100% this week. Either you were already loose, or you weren't honest about the effort levels. Run it again — for real.` });
    }
  }

  // Tension audit — honest if it hasn't moved.
  if (input.tensionThis != null && input.tensionPrior != null) {
    if (input.tensionThis < input.tensionPrior - 0.2) {
      lines.push({ kind: "win", metric: "tension_shoulders", value: input.tensionThis, text: `Your shoulder tension dropped from ${input.tensionPrior} to ${input.tensionThis}. You can feel that in your shot even if you can't name it.` });
    } else if (near(input.tensionThis, input.tensionPrior)) {
      lines.push({ kind: "honest", metric: "tension_shoulders", value: input.tensionThis, text: `Your tension hasn't moved in the audits (${input.tensionThis}). Either the drill isn't landing or you're not doing it honestly. Which one?` });
    } else {
      lines.push({ kind: "honest", metric: "tension_shoulders", value: input.tensionThis, text: `Tension went up this week (${input.tensionPrior} → ${input.tensionThis}). Rough week, or you stopped scanning. Worth a look.` });
    }
  }

  // Pressure-FT gap trend — the headline retention metric.
  if (input.pressureGapThis != null && input.pressureGapPrior != null) {
    if (input.pressureGapThis < input.pressureGapPrior) {
      lines.push({ kind: "win", metric: "pressure_ft_gap", value: input.pressureGapThis, text: `Your pressure gap closed from ${input.pressureGapPrior} to ${input.pressureGapThis} points. That gap is the mental game. It's shrinking.` });
    } else if (input.pressureGapThis === input.pressureGapPrior) {
      lines.push({ kind: "honest", metric: "pressure_ft_gap", value: input.pressureGapThis, text: `Your pressure gap held at ${input.pressureGapThis} points. Not worse — but this is the number we're here to move.` });
    } else {
      lines.push({ kind: "honest", metric: "pressure_ft_gap", value: input.pressureGapThis, text: `Your pressure gap widened to ${input.pressureGapThis} points. One week isn't a trend. Two is. Watch it.` });
    }
  }

  if (input.focusInsight) {
    const f = input.focusInsight;
    lines.push({ kind: "note", metric: "focus_vs_sleep", value: f.delta, text: `Your focus scores are ${f.delta} lower on days you slept under 6 hours (${f.under} vs ${f.over}). That's from your data, not a study.` });
  }

  if (input.intentionGrade != null) {
    lines.push({ kind: "note", metric: "intention_grade", value: input.intentionGrade, text: `You graded Monday's intention ${input.intentionGrade}/3. The grade only counts if it's honest.` });
  }

  // Consistency — the week is a container, not a streak.
  lines.push({ kind: "note", metric: "blocks_completed", value: `${input.blocksCompleted}/${input.blocksTotal}`, text: `You logged ${input.blocksCompleted} of ${input.blocksTotal}.` });
  if (input.missedTitles.length > 0) {
    lines.push({ kind: "honest", metric: "missed_days", value: input.missedTitles.join(", "), text: `You missed ${input.missedTitles.join(" and ")}. I noticed. Not a judgment — a pattern to watch.` });
  }

  return { weekName: input.weekName, lines, nextTeaser: input.nextTeaser };
}
