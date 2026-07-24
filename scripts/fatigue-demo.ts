/**
 * Prints the three worked fatigue examples (spec F3 checkpoint) with real numbers
 * straight from the engine. Run: npx tsx scripts/fatigue-demo.ts
 */
import {
  computeMuscleFatigue,
  estimateExerciseOneRM,
  setBaseStimulus,
  systemicFatigue,
  type LoggedSet,
} from "../src/lib/core/fatigue/engine";
import { STRENGTH_EXERCISES_BY_ID } from "../src/lib/core/strength/library";

const HOUR = 3_600_000;
const lib = STRENGTH_EXERCISES_BY_ID;
const MON = Date.UTC(2026, 6, 20, 17, 0, 0); // Monday
const fmtEta = (h: number | null) => (h == null ? ">14 days" : h < 24 ? `~${h}h` : `~${(h / 24).toFixed(1)} days`);
const pct = (n: number) => `${n.toFixed(1)}%`;

console.log("\n=== Example 1 — Barbell Hip Thrust 4×8 @ 100kg (RIR 2), Monday ===");
const hip: LoggedSet[] = Array.from({ length: 4 }, () => ({ exerciseId: "barbell-hip-thrust", timestamp: MON, load: 100, reps: 8, rir: 2 }));
const e1 = estimateExerciseOneRM(hip, "barbell-hip-thrust")!;
console.log(`estimated 1RM (Epley) = ${e1.toFixed(1)} kg | per-set base stimulus = ${setBaseStimulus(hip[0]!, lib["barbell-hip-thrust"]!, e1).toFixed(3)} SU`);
for (const [label, t] of [["Mon (post)", MON], ["Tue +24h", MON + 24 * HOUR], ["Wed +48h", MON + 48 * HOUR]] as const) {
  const r = computeMuscleFatigue("glute_max", { sets: hip, now: t });
  console.log(`  glutes ${label.padEnd(11)} local ${pct(r.localPct).padStart(6)}  (F=${r.fatigue.toFixed(2)}, cap=${r.capacity})  ETA ${fmtEta(r.etaHours)}`);
}

console.log("\n=== Example 2 — Nordic Hamstring Curl 3×5 eccentric (RIR 1), Monday ===");
const nordic: LoggedSet[] = Array.from({ length: 3 }, () => ({ exerciseId: "nordic-hamstring-curl", timestamp: MON, reps: 5, rir: 1 }));
console.log(`(bodyweight → intensityProxy ${lib["nordic-hamstring-curl"]!.loadGuidance.intensityProxy}, fatigueMultiplier ${lib["nordic-hamstring-curl"]!.fatigueMultiplier}, recoveryClass ${lib["nordic-hamstring-curl"]!.recoveryClass})`);
for (const [label, t] of [["Mon (post)", MON], ["Wed +48h", MON + 48 * HOUR], ["Fri +96h", MON + 96 * HOUR]] as const) {
  const r = computeMuscleFatigue("hamstring", { sets: nordic, now: t });
  console.log(`  hamstrings ${label.padEnd(11)} local ${pct(r.localPct).padStart(6)}  (F=${r.fatigue.toFixed(2)}, cap=${r.capacity.toFixed(1)})  ETA ${fmtEta(r.etaHours)}`);
}

console.log("\n=== Example 3 — Depth Drop → Rebound 5×3 (15 contacts, RIR 4), green day (WHOOP 80) ===");
const depth: LoggedSet[] = Array.from({ length: 5 }, () => ({ exerciseId: "depth-drop-rebound-jump", timestamp: MON, groundContacts: 3, rir: 4 }));
const sysIn = { recoveryScore: 80 };
for (const m of ["quad", "soleus"] as const) {
  const r = computeMuscleFatigue(m, { sets: depth, now: MON, systemic: sysIn });
  console.log(`  ${m.padEnd(6)} local ${pct(r.localPct).padStart(6)}  displayed ${pct(r.displayedPct).padStart(6)}  ETA ${fmtEta(r.etaHours)}`);
}
console.log(`  systemic load = ${pct(systemicFatigue(depth, MON, lib, sysIn))}  |  15 ground contacts logged (scheduler cap: ≤40/session)`);
console.log("");
