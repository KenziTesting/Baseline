/**
 * Muscle taxonomy (spec Part D.2). FROZEN — referenced by the drill schema, the
 * fatigue engine, the (future) 2D/3D body maps, and the contribution-sum test.
 * Changing an id here is a breaking change to all of them.
 *
 * These are the 26 BASE muscle ids. Most exist as separate left/right meshes in
 * the body map (`hasSides: true`); the fatigue ENGINE (F3) computes per-base
 * muscle, and left/right splitting is layered on with the body map (F5/F8).
 *
 * recoveryTauHours and capacityWeight are DESIGNED HEURISTICS, not measured
 * science — they are tuned in one place and consumed by the fatigue engine.
 */

export type MuscleId =
  | "pec_major"
  | "anterior_deltoid"
  | "lateral_deltoid"
  | "posterior_deltoid"
  | "biceps"
  | "triceps"
  | "forearm"
  | "lat"
  | "upper_trap"
  | "mid_lower_trap"
  | "erector_spinae"
  | "rectus_abdominis"
  | "obliques"
  | "serratus_core"
  | "glute_max"
  | "glute_med"
  | "tfl"
  | "adductor"
  | "quad"
  | "hamstring"
  | "hip_flexor"
  | "gastrocnemius"
  | "soleus"
  | "tibialis_anterior"
  | "rotator_cuff"
  | "neck";

export type MuscleRegion =
  | "chest" | "shoulder" | "arm" | "back" | "core" | "glute" | "thigh" | "lower_leg" | "neck";

export interface MuscleDef {
  id: MuscleId;
  displayName: string;
  commonName: string;
  region: MuscleRegion;
  /** Base decay time constant (hours), before the drill's recoveryClass scaling. Heuristic. */
  recoveryTauHours: number;
  /** Relative work capacity vs. glute_max = 1.0. Heuristic; drives the capacity floor. */
  capacityWeight: number;
  /** Has separate L/R meshes in the body map (all but neck, abs, erectors). */
  hasSides: boolean;
}

export const MUSCLES: Record<MuscleId, MuscleDef> = {
  pec_major: { id: "pec_major", displayName: "Pectoralis Major", commonName: "Chest", region: "chest", recoveryTauHours: 32, capacityWeight: 0.8, hasSides: true },
  anterior_deltoid: { id: "anterior_deltoid", displayName: "Anterior Deltoid", commonName: "Front delts", region: "shoulder", recoveryTauHours: 20, capacityWeight: 0.5, hasSides: true },
  lateral_deltoid: { id: "lateral_deltoid", displayName: "Lateral Deltoid", commonName: "Side delts", region: "shoulder", recoveryTauHours: 20, capacityWeight: 0.45, hasSides: true },
  posterior_deltoid: { id: "posterior_deltoid", displayName: "Posterior Deltoid", commonName: "Rear delts", region: "shoulder", recoveryTauHours: 20, capacityWeight: 0.45, hasSides: true },
  biceps: { id: "biceps", displayName: "Biceps Brachii", commonName: "Biceps", region: "arm", recoveryTauHours: 24, capacityWeight: 0.5, hasSides: true },
  triceps: { id: "triceps", displayName: "Triceps Brachii", commonName: "Triceps", region: "arm", recoveryTauHours: 24, capacityWeight: 0.55, hasSides: true },
  forearm: { id: "forearm", displayName: "Forearm Flexors/Extensors", commonName: "Forearms", region: "arm", recoveryTauHours: 20, capacityWeight: 0.4, hasSides: true },
  lat: { id: "lat", displayName: "Latissimus Dorsi", commonName: "Lats", region: "back", recoveryTauHours: 32, capacityWeight: 0.8, hasSides: true },
  upper_trap: { id: "upper_trap", displayName: "Upper Trapezius", commonName: "Upper traps", region: "back", recoveryTauHours: 24, capacityWeight: 0.5, hasSides: true },
  mid_lower_trap: { id: "mid_lower_trap", displayName: "Mid / Lower Trapezius", commonName: "Mid-back", region: "back", recoveryTauHours: 28, capacityWeight: 0.6, hasSides: true },
  erector_spinae: { id: "erector_spinae", displayName: "Erector Spinae", commonName: "Lower back", region: "back", recoveryTauHours: 48, capacityWeight: 0.8, hasSides: false },
  rectus_abdominis: { id: "rectus_abdominis", displayName: "Rectus Abdominis", commonName: "Abs", region: "core", recoveryTauHours: 24, capacityWeight: 0.6, hasSides: false },
  obliques: { id: "obliques", displayName: "Obliques", commonName: "Obliques", region: "core", recoveryTauHours: 28, capacityWeight: 0.6, hasSides: true },
  serratus_core: { id: "serratus_core", displayName: "Serratus Anterior", commonName: "Serratus", region: "core", recoveryTauHours: 24, capacityWeight: 0.4, hasSides: true },
  glute_max: { id: "glute_max", displayName: "Gluteus Maximus", commonName: "Glutes", region: "glute", recoveryTauHours: 32, capacityWeight: 1.0, hasSides: true },
  glute_med: { id: "glute_med", displayName: "Gluteus Medius", commonName: "Side glutes", region: "glute", recoveryTauHours: 28, capacityWeight: 0.6, hasSides: true },
  tfl: { id: "tfl", displayName: "Tensor Fasciae Latae", commonName: "TFL", region: "glute", recoveryTauHours: 24, capacityWeight: 0.35, hasSides: true },
  adductor: { id: "adductor", displayName: "Hip Adductors", commonName: "Groin", region: "thigh", recoveryTauHours: 48, capacityWeight: 0.6, hasSides: true },
  quad: { id: "quad", displayName: "Quadriceps", commonName: "Quads", region: "thigh", recoveryTauHours: 32, capacityWeight: 1.0, hasSides: true },
  hamstring: { id: "hamstring", displayName: "Hamstrings", commonName: "Hamstrings", region: "thigh", recoveryTauHours: 48, capacityWeight: 0.85, hasSides: true },
  hip_flexor: { id: "hip_flexor", displayName: "Hip Flexors", commonName: "Hip flexors", region: "thigh", recoveryTauHours: 28, capacityWeight: 0.5, hasSides: true },
  gastrocnemius: { id: "gastrocnemius", displayName: "Gastrocnemius", commonName: "Calves", region: "lower_leg", recoveryTauHours: 20, capacityWeight: 0.6, hasSides: true },
  soleus: { id: "soleus", displayName: "Soleus", commonName: "Lower calf", region: "lower_leg", recoveryTauHours: 24, capacityWeight: 0.5, hasSides: true },
  tibialis_anterior: { id: "tibialis_anterior", displayName: "Tibialis Anterior", commonName: "Shin", region: "lower_leg", recoveryTauHours: 20, capacityWeight: 0.35, hasSides: true },
  rotator_cuff: { id: "rotator_cuff", displayName: "Rotator Cuff", commonName: "Rotator cuff", region: "shoulder", recoveryTauHours: 24, capacityWeight: 0.35, hasSides: true },
  neck: { id: "neck", displayName: "Neck", commonName: "Neck", region: "neck", recoveryTauHours: 20, capacityWeight: 0.4, hasSides: false },
};

export const MUSCLE_IDS = Object.keys(MUSCLES) as MuscleId[];

export function isMuscleId(x: string): x is MuscleId {
  return x in MUSCLES;
}
