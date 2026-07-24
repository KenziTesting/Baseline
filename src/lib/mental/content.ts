/**
 * "THE WEEK" seed content (spec I2). Week 3 (Quiet Hands) is authored in full as
 * the tone target; the 12-week arc names/themes are set so a returning user never
 * repeats. Authoring the remaining full weeks is a writing job (spec I2) — those
 * carry names + framework and unlock their days on their Monday.
 *
 * ALL copy is original, in the module's voice. `{alter}` → the alter-ego name.
 */

import type { DayBlock, Framework, Quote, Week } from "./types";

export interface FrameworkMeta {
  id: Framework;
  name: string;
  tagline: string;
  /** The headline line for the module (spec C). */
  hook: string;
  summary: string;
}

export const FRAMEWORKS: Record<Framework, FrameworkMeta> = {
  reverse_effort: {
    id: "reverse_effort",
    name: "Quiet Hands",
    tagline: "Reverse effort",
    hook: "Everybody's told you to try harder. Nobody's ever told you that you're 15% too tight to be great.",
    summary:
      "Past a point, trying harder makes you worse — you brake and accelerate at once. The elite athlete strains less in the places that don't help. Wanting it quieter is the strategy.",
  },
  mamba: {
    id: "mamba",
    name: "The Pile",
    tagline: "Process obsession",
    hook: "Judge the week by whether you did the work — not whether the ball went in.",
    summary:
      "Obsessive preparation of the unglamorous parts. Footwork. Film. The same boring move, logged, every day. On Sunday you look at the pile. The pile is the point.",
  },
  alter_ego: {
    id: "alter_ego",
    name: "The Walk-In",
    tagline: "Activation",
    hook: "It lowers the cost of failure and gives you permission to be the version of you that takes the last shot.",
    summary:
      "A named, deliberate persona you switch into with a physical trigger and a totem. A well-documented technique for compartmentalizing — you become the version that demands the ball.",
  },
  beast: {
    id: "beast",
    name: "Dog",
    tagline: "The competitive edge",
    hook: "Dog isn't rage. Rage turns the ball over. Dog is refusing to be outworked in a moment nobody is watching.",
    summary:
      "The box-out when you're down 20. Sprinting back in a preseason scrimmage. Trained through deliberate adversity reps — and the highest-transfer drill in the app: the mistake reset.",
  },
};

function d(block: Partial<DayBlock> & Pick<DayBlock, "day" | "kind" | "title">): DayBlock {
  return { minutes: 8, body: [], ...block };
}

/** Week 3 — QUIET HANDS. Authored in full (spec Part F). */
const WEEK_3: Week = {
  index: 3,
  name: "QUIET HANDS",
  theme: "Reverse effort — take something away",
  framework: "reverse_effort",
  nextTeaser: "THE WEIGHT ROOM IS A LIE",
  days: [
    d({
      day: 0, kind: "declaration", title: "Declaration", minutes: 8,
      body: [
        "Here's the thing nobody told you: you're not losing because you don't want it enough. You're losing because you want it so hard your hands have turned to concrete.",
        "This week we're taking something away.",
      ],
      prompts: [{ id: "intention", kind: "written", label: "Write it down: one thing you're going to stop gripping." }],
    }),
    d({
      day: 1, kind: "hard_rep", title: "The Hard Rep", minutes: 10,
      body: [
        "Spot your imaginary guy 5 points. Play to 11. If you lose, you run.",
        "He's better than you today. That's the point. You don't find out who you are when it's 11–2.",
      ],
      prompts: [{ id: "hardrep_note", kind: "written", label: "One line: what did you say to yourself when you wanted to stop?" }],
    }),
    d({
      day: 2, kind: "quiet_hands", title: "Quiet Hands", minutes: 12,
      body: [
        "Five checkpoints: jaw, shoulders, hands, breath, forehead. Rate them, 1–5, during your shooting block.",
        "Then shoot 20 at 100%. Then shoot 20 at 85%.",
        "I already know what happened. Log it anyway. You need to see it in your own handwriting.",
      ],
      prompts: [
        { id: "jaw", kind: "scale", label: "Jaw", min: 1, max: 5 },
        { id: "shoulders", kind: "scale", label: "Shoulders", min: 1, max: 5 },
        { id: "hands", kind: "scale", label: "Hands", min: 1, max: 5 },
        { id: "breath", kind: "scale", label: "Breath", min: 1, max: 5 },
        { id: "forehead", kind: "scale", label: "Forehead", min: 1, max: 5 },
      ],
    }),
    d({
      day: 3, kind: "mirror", title: "The Mirror", minutes: 10,
      body: [
        "Pull up film of a game you lost. Not your highlights. The whole thing.",
        "Three questions: Where did I stop competing? What did my body language say after my second miss? Would I want to guard me?",
        "Answer honestly or don't answer at all.",
      ],
      prompts: [
        { id: "q1", kind: "written", label: "Where did I stop competing?" },
        { id: "q2", kind: "written", label: "What did my body language say after my second miss?" },
        { id: "q3", kind: "written", label: "Would I want to guard me?" },
      ],
    }),
    d({
      day: 4, kind: "activation", title: "Activation", minutes: 6,
      body: [
        "Tape the wrists. Song on. Sixty seconds — see the gym, hear it, smell it, put yourself in it.",
        "Say the three words out loud. Yes, out loud. Nobody's home.",
        "{alter}. You're up.",
      ],
    }),
    d({
      day: 5, kind: "compete", title: "Compete", minutes: null,
      body: [],
      compete: { morning: "Quiet hands. Loud feet. Go.", night: "Log it. We'll talk tomorrow." },
    }),
    d({
      day: 6, kind: "report", title: "The Report", minutes: 15,
      body: ["This is where the week gets honest. Real numbers, no spin. Then next week's theme."],
    }),
  ],
};

/** The 12-week arc. Names/themes are set (original); full day content unlocks weekly. */
export const WEEK_ARC: Week[] = [
  arcStub(1, "THE NAMING", "Build the alter ego — the version who takes the shot", "alter_ego", "THE DOG YEARS"),
  arcStub(2, "THE DOG YEARS", "Adversity reps and the mistake-reset drill", "beast", "QUIET HANDS"),
  WEEK_3,
  arcStub(4, "THE WEIGHT ROOM IS A LIE", "Process over outcome — the pile is the point", "mamba", "THE MIRROR DOESN'T BLINK"),
  arcStub(5, "THE MIRROR DOESN'T BLINK", "Self-honesty — the film you don't want to watch", "beast", "BORING IS A SUPERPOWER"),
  arcStub(6, "BORING IS A SUPERPOWER", "One unglamorous fundamental, every day, logged", "mamba", "SEVEN SECONDS"),
  arcStub(7, "SEVEN SECONDS", "The reset breath — training the recovery, not the make", "reverse_effort", "THE LAST SHOT IS YOURS"),
  arcStub(8, "THE LAST SHOT IS YOURS", "Permission — becoming the one who demands the ball", "alter_ego", "OUTWORK THE ROOM"),
  arcStub(9, "OUTWORK THE ROOM", "Dog — refusing to be outworked when nobody's watching", "beast", "WATCH THE FILM YOU HATE"),
  arcStub(10, "WATCH THE FILM YOU HATE", "Studying opponents like homework, not highlights", "mamba", "LOOSE IS FAST"),
  arcStub(11, "LOOSE IS FAST", "Tension audit under load — loose is fast", "reverse_effort", "WHO YOU BECAME"),
  arcStub(12, "WHO YOU BECAME", "The arc closes — measure who you became", "alter_ego", "Next arc: new themes, never a repeat"),
];

function arcStub(index: number, name: string, theme: string, framework: Framework, nextTeaser: string): Week {
  return { index, name, theme, framework, nextTeaser, days: [] };
}

export function getWeek(index: number): Week | undefined {
  return WEEK_ARC.find((w) => w.index === index);
}

/** Every line original — the mandatory `source` is present and non-empty (spec rule #1). */
export const QUOTES: Quote[] = [
  { id: "q-tight", text: "You're not tired. You're tight. There's a difference, and it's costing you.", source: "Original, written for Baseline", framework: "reverse_effort" },
  { id: "q-boxout", text: "Nobody is watching you box out in a preseason scrimmage. That's exactly why it counts.", source: "Original, written for Baseline", framework: "beast" },
  { id: "q-pile", text: "Do the boring thing seven days straight and look at the pile. The pile is the argument.", source: "Original, written for Baseline", framework: "mamba" },
  { id: "q-reset", text: "The mistake already happened. The only question left is how fast you're breathing on the next possession.", source: "Original, written for Baseline", framework: "reverse_effort" },
  { id: "q-late", text: "Late is a rep. Zero is not.", source: "Original, written for Baseline" },
  { id: "q-permission", text: "Your everyday self is polite. The game doesn't reward polite. Let the other one in.", source: "Original, written for Baseline", framework: "alter_ego" },
  { id: "q-quiet-loud", text: "Quiet hands. Loud feet.", source: "Original, written for Baseline", framework: "reverse_effort" },
  { id: "q-earned", text: "You logged forty-one straight days. Forty-one. Most people quit at nine.", source: "Original, written for Baseline" },
];
