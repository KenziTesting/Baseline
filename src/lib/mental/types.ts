/**
 * "THE WEEK" — mentality module content schema (spec I1).
 *
 * HARD RULES enforced by tests:
 *  - Every Quote.source is non-empty (no fabricated/misattributed quotes).
 *  - No copy promotes sleep deprivation (blocked in content.test.ts).
 */

export type Framework = "reverse_effort" | "mamba" | "alter_ego" | "beast";

/** Mon=0 … Sun=6. */
export type BlockKind =
  | "declaration" | "hard_rep" | "quiet_hands" | "mirror" | "activation" | "compete" | "report";

export interface Prompt {
  id: string;
  /** "written" = free text (Monday declaration), "scale" = 1-5/0-3, "choice". */
  kind: "written" | "scale" | "choice";
  label: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface DayBlock {
  day: number; // 0=Mon
  kind: BlockKind;
  title: string;
  /** null on Saturday — the app goes almost silent. */
  minutes: number | null;
  /** Copy paragraphs, in the module's voice. `{alter}` is replaced by the alter-ego name. */
  body: string[];
  prompts?: Prompt[];
  /** Saturday's two lines: [morning, night]. */
  compete?: { morning: string; night: string };
}

export interface Week {
  index: number; // 1-based within the 12-week arc
  name: string;
  theme: string;
  framework: Framework;
  days: DayBlock[];
  /** Sunday's cliffhanger reveal of next week's theme. */
  nextTeaser: string;
}

export interface Quote {
  id: string;
  text: string;
  /** MANDATORY — non-empty. Original lines are sourced as "Original, written for Baseline". */
  source: string;
  framework?: Framework;
}

/* ------------------------------- User data ------------------------------- */

export interface AlterEgo {
  name: string;
  threeWordsOffCourt: string;
  holdsBackFrom: string;
  doesNotCareLook: string;
  trigger: string;
  totem: string;
  createdAt: string;
}

export interface Intention {
  weekIndex: number;
  text: string;
  /** Sunday self-grade 0-3. */
  grade?: number;
}

export interface PressureFT {
  dateISO: string;
  unpressuredMakes: number;
  unpressuredAttempts: number;
  pressuredMakes: number;
  pressuredAttempts: number;
}

export interface ResetTimeLog {
  dateISO: string;
  /** Possessions until playing normally after a mistake, self-rated 0-3. */
  rating: number;
}

export interface TensionAudit {
  dateISO: string;
  jaw: number;
  shoulders: number;
  hands: number;
  breath: number;
  forehead: number;
}

export interface FocusRating {
  dateISO: string;
  rating: number; // 1-5
  sleepHours?: number;
}

export type MSIDimension = "confidence" | "focus" | "resilience" | "competitiveness" | "pressure_tolerance";

export interface MSIResult {
  dateISO: string;
  scores: Record<MSIDimension, number>; // 0-100 per dimension
}
