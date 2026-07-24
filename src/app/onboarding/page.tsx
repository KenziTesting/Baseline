"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Field,
  MultiSegmentedControl,
  ProgressBar,
  SegmentedControl,
  Slider,
  TextInput,
} from "@/components/ui";
import { ArrowLeft, ArrowRight, Bolt, Check } from "@/components/icons";
import {
  LEVEL_LABELS,
  PLAYER_LEVELS,
  POSITION_LABELS,
  type PlayerLevel,
  type PlayerProfile,
  type Position,
  type SkillRating,
  type UnitSystem,
} from "@/lib/core";
import { useBaselineStore } from "@/lib/store";
import { GAME_SURVEY, RATING_LABELS } from "./skillGroups";

const TOTAL_STEPS = 6;

interface Draft {
  displayName: string;
  age: string;
  trainingAge: string;
  level: PlayerLevel | null;
  positions: Position[];
  units: UnitSystem;
  showAdvanced: boolean;
  // imperial height
  heightFt: string;
  heightIn: string;
  // metric height
  heightCm: string;
  weight: string; // lb or kg per units
  // imperial wingspan
  wingspanFt: string;
  wingspanIn: string;
  // metric wingspan
  wingspanCm: string;
  standingReach: string; // in or cm
  vertical: string; // in or cm
  surveyRatings: Record<string, SkillRating>;
  style: {
    pacePreference: number;
    shotLocation: number;
    onOffBall: number;
    isoVsSystem: number;
    physicalityTolerance: number;
  };
  selfDescribedPlaystyle: string;
  injuryHistory: string;
  currentLimitations: string;
}

const emptyDraft: Draft = {
  displayName: "",
  age: "",
  trainingAge: "",
  level: null,
  positions: [],
  units: "imperial",
  showAdvanced: false,
  heightFt: "",
  heightIn: "",
  heightCm: "",
  weight: "",
  wingspanFt: "",
  wingspanIn: "",
  wingspanCm: "",
  standingReach: "",
  vertical: "",
  surveyRatings: {},
  style: {
    pacePreference: 55,
    shotLocation: 50,
    onOffBall: 55,
    isoVsSystem: 45,
    physicalityTolerance: 50,
  },
  selfDescribedPlaystyle: "",
  injuryHistory: "",
  currentLimitations: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useBaselineStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const age = Number(draft.age);
  const isYouth = age > 0 && age < 16;
  const canAdvance = useMemo(() => validateStep(step, draft), [step, draft]);

  const finish = () => {
    completeOnboarding(toProfile(draft));
    router.push("/reveal");
  };

  return (
    <div className="flex min-h-[88vh] flex-col">
      <header className="mb-7">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-lg tracking-wide text-amber-500">BASELINE</span>
          <span className="text-xs font-medium text-white/40">
            {step + 1} of {TOTAL_STEPS}
          </span>
        </div>
        <ProgressBar total={TOTAL_STEPS} current={step} />
      </header>

      <div key={step} className="flex-1 animate-fade-up">
        {step === 0 && <WelcomeStep />}
        {step === 1 && <BasicsStep draft={draft} set={set} isYouth={isYouth} />}
        {step === 2 && <MeasurementsStep draft={draft} set={set} />}
        {step === 3 && <SurveyStep draft={draft} set={set} />}
        {step === 4 && <PlaystyleStep draft={draft} set={set} />}
        {step === 5 && <InjuriesStep draft={draft} set={set} isYouth={isYouth} />}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-8 flex gap-3 bg-gradient-to-t from-court-950 via-court-950/95 to-transparent px-5 pb-6 pt-4">
        {step > 0 && (
          <Button variant="ghost" className="w-16 !min-w-[64px] flex-none" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <Button disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>
            Continue <ArrowRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button disabled={!canAdvance} onClick={finish}>
            <Bolt className="h-5 w-5" /> Reveal my archetype
          </Button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Steps ----------------------------- */

function StepHead({
  eyebrow,
  title,
  subtitle,
  size = "lg",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  size?: "lg" | "sm";
}) {
  return (
    <div className={size === "lg" ? "mb-6" : "mb-4"}>
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className={`font-extrabold leading-tight tracking-tight ${size === "lg" ? "text-[26px]" : "text-[20px]"}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-2 leading-relaxed text-white/55 ${size === "lg" ? "text-[15px]" : "text-[13px]"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function WelcomeStep() {
  return (
    <div>
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 text-amber-400">
        <Bolt className="h-7 w-7" />
      </div>
      <h1 className="font-display text-[40px] leading-[0.95] tracking-tight">
        FIND OUT WHO<br />
        <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
          YOU&apos;RE BUILT
        </span>
        <br />TO BE.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-white/60">
        A few honest minutes. We map your build, your game, and your style — then show you the player
        you most resemble and the exact gap to who you&apos;re chasing.
      </p>
      <Card className="mt-6">
        <p className="text-sm font-bold text-white/85">Straight up, before we start</p>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Baseline is a training tool, <span className="font-semibold text-white/85">not medical advice</span>. It
          doesn&apos;t diagnose injuries. If something hurts, we&apos;ll tell you to modify and see a
          professional — never to push through it. You train at your own risk.
        </p>
      </Card>
    </div>
  );
}

function BasicsStep({ draft, set, isYouth }: { draft: Draft; set: (p: Partial<Draft>) => void; isYouth: boolean }) {
  return (
    <div>
      <StepHead eyebrow="Profile" title="The basics" />
      <div className="space-y-5">
        <Field label="What should we call you?">
          <TextInput
            value={draft.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
            placeholder="First name or handle"
            autoComplete="given-name"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <TextInput inputMode="numeric" value={draft.age} onChange={(e) => set({ age: e.target.value.replace(/\D/g, "") })} placeholder="17" />
          </Field>
          <Field label="Years lifting" hint="0 is fine">
            <TextInput inputMode="numeric" value={draft.trainingAge} onChange={(e) => set({ trainingAge: e.target.value.replace(/[^\d.]/g, "") })} placeholder="2" />
          </Field>
        </div>
        {isYouth && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
            <p className="text-sm leading-relaxed text-amber-300/90">
              Under 16 — we&apos;ll cap volume, put movement quality ahead of heavy load, and watch
              growth-plate stress. No aggressive bulking or cutting.
            </p>
          </div>
        )}
        <Field label="Current level">
          <SegmentedControl
            columns={3}
            value={draft.level}
            onChange={(v) => set({ level: v })}
            options={PLAYER_LEVELS.map((v) => ({ value: v, label: LEVEL_LABELS[v] }))}
          />
        </Field>
        <Field label="Position(s)" hint="Tap all you play — first pick is your primary">
          <MultiSegmentedControl
            columns={5}
            values={draft.positions}
            onChange={(v) => set({ positions: v })}
            options={(Object.keys(POSITION_LABELS) as Position[]).map((v) => ({ value: v, label: v.toUpperCase() }))}
          />
        </Field>
      </div>
    </div>
  );
}

function MeasurementsStep({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const metric = draft.units === "metric";
  return (
    <div>
      <StepHead
        eyebrow="Body"
        title="Measurements"
        subtitle="Height and weight get you started. Wingspan and reach sharpen the read — add them if you know them."
      />
      <div className="space-y-5">
        <Field label="Units">
          <SegmentedControl
            columns={2}
            value={draft.units}
            onChange={(v) => set({ units: v })}
            options={[
              { value: "imperial", label: "ft / in · lb" },
              { value: "metric", label: "cm · kg" },
            ]}
          />
        </Field>

        <Field label="Height">
          {metric ? (
            <TextInput inputMode="numeric" value={draft.heightCm} onChange={(e) => set({ heightCm: e.target.value.replace(/\D/g, "") })} placeholder="cm" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <TextInput inputMode="numeric" value={draft.heightFt} onChange={(e) => set({ heightFt: e.target.value.replace(/\D/g, "") })} placeholder="ft" />
              <TextInput inputMode="numeric" value={draft.heightIn} onChange={(e) => set({ heightIn: e.target.value.replace(/\D/g, "") })} placeholder="in" />
            </div>
          )}
        </Field>

        <Field label={`Weight (${metric ? "kg" : "lb"})`}>
          <TextInput inputMode="numeric" value={draft.weight} onChange={(e) => set({ weight: e.target.value.replace(/\D/g, "") })} placeholder={metric ? "84" : "185"} />
        </Field>

        {!draft.showAdvanced ? (
          <button
            type="button"
            onClick={() => set({ showAdvanced: true })}
            className="pressable flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-sm font-semibold text-white/60 hover:border-amber-500/40 hover:text-amber-300"
          >
            <span className="text-lg leading-none">+</span> Add wingspan, reach &amp; vertical
          </button>
        ) : (
          <div className="space-y-5 rounded-2xl border border-white/[0.07] bg-court-900/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white/80">Combine-style measurements</p>
              <button type="button" onClick={() => set({ showAdvanced: false })} className="text-xs font-semibold text-white/40 hover:text-white/70">
                Hide
              </button>
            </div>
            <Field label="Wingspan" hint="Optional — we estimate if blank">
              {metric ? (
                <TextInput inputMode="numeric" value={draft.wingspanCm} onChange={(e) => set({ wingspanCm: e.target.value.replace(/\D/g, "") })} placeholder="cm" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <TextInput inputMode="numeric" value={draft.wingspanFt} onChange={(e) => set({ wingspanFt: e.target.value.replace(/\D/g, "") })} placeholder="ft" />
                  <TextInput inputMode="numeric" value={draft.wingspanIn} onChange={(e) => set({ wingspanIn: e.target.value.replace(/\D/g, "") })} placeholder="in" />
                </div>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Standing reach (${metric ? "cm" : "in"})`} hint="Optional">
                <TextInput inputMode="numeric" value={draft.standingReach} onChange={(e) => set({ standingReach: e.target.value.replace(/\D/g, "") })} placeholder="opt." />
              </Field>
              <Field label={`Max vertical (${metric ? "cm" : "in"})`} hint="Optional">
                <TextInput inputMode="numeric" value={draft.vertical} onChange={(e) => set({ vertical: e.target.value.replace(/\D/g, "") })} placeholder="opt." />
              </Field>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SurveyStep({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const rate = (key: string, value: SkillRating) =>
    set({ surveyRatings: { ...draft.surveyRatings, [key]: value } });
  return (
    <div>
      <StepHead
        eyebrow="Self-assessment"
        title="Rate your game"
        subtitle="Six honest calls, relative to your level."
        size="sm"
      />
      <div className="space-y-3">
        {GAME_SURVEY.map((item) => (
          <div key={item.key} className="surface p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-white/90">{item.label}</span>
              <span className="truncate text-right text-[10px] text-white/35">{item.cue}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {([1, 2, 3, 4, 5] as SkillRating[]).map((n) => {
                const active = draft.surveyRatings[item.key] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => rate(item.key, n)}
                    aria-pressed={active}
                    className={`pressable flex min-h-[40px] flex-col items-center justify-center rounded-lg border transition-colors ${
                      active
                        ? "border-amber-500/60 bg-amber-500/[0.16] text-amber-300"
                        : "border-white/[0.06] bg-court-800 text-white/45 hover:border-white/15"
                    }`}
                  >
                    <span className="font-display text-[15px] leading-none">{n}</span>
                    <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide opacity-70">
                      {RATING_LABELS[n]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaystyleStep({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const s = draft.style;
  const setStyle = (patch: Partial<Draft["style"]>) => set({ style: { ...s, ...patch } });
  return (
    <div>
      <StepHead eyebrow="Identity" title="Your playstyle" subtitle="No right answers — this is identity, not skill." />
      <div className="space-y-7">
        <Slider label="Pace" value={s.pacePreference} leftLabel="Deliberate, half-court" rightLabel="Push, get out running" onChange={(v) => setStyle({ pacePreference: v })} />
        <Slider label="Where you score" value={s.shotLocation} leftLabel="At the rim" rightLabel="From deep" onChange={(v) => setStyle({ shotLocation: v })} />
        <Slider label="On-ball vs off-ball" value={s.onOffBall} leftLabel="Off the ball" rightLabel="Ball in my hands" onChange={(v) => setStyle({ onOffBall: v })} />
        <Slider label="Iso vs system" value={s.isoVsSystem} leftLabel="Within the offense" rightLabel="Clear out, give me the ball" onChange={(v) => setStyle({ isoVsSystem: v })} />
        <Slider label="Physicality" value={s.physicalityTolerance} leftLabel="Finesse, avoid contact" rightLabel="Seek the contact" onChange={(v) => setStyle({ physicalityTolerance: v })} />
      </div>
      <div className="mt-6">
        <Field label="In your own words (optional)" hint="e.g. combo guard, pick-and-roll heavy, weak going left">
          <TextInput value={draft.selfDescribedPlaystyle} onChange={(e) => set({ selfDescribedPlaystyle: e.target.value })} placeholder="Describe your game" />
        </Field>
      </div>
    </div>
  );
}

function InjuriesStep({ draft, set, isYouth }: { draft: Draft; set: (p: Partial<Draft>) => void; isYouth: boolean }) {
  return (
    <div>
      <StepHead
        eyebrow="Health"
        title="Anything to protect?"
        subtitle="Optional, but it changes what we program. We route around pain — we don't train through it."
      />
      <div className="space-y-5">
        <Field label="Injury history">
          <TextInput value={draft.injuryHistory} onChange={(e) => set({ injuryHistory: e.target.value })} placeholder="e.g. 2 ankle sprains, patellar tendinitis" />
        </Field>
        <Field label="Current limitations">
          <TextInput value={draft.currentLimitations} onChange={(e) => set({ currentLimitations: e.target.value })} placeholder="e.g. left knee sore on landings" />
        </Field>
        {isYouth && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
            <p className="text-sm leading-relaxed text-amber-300/90">
              Growing athletes: knee pain below the kneecap (Osgood-Schlatter) and heel pain are common
              during growth spurts. Sharp, swelling, or lasting more than a couple weeks — see a pro.
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1 text-xs text-white/35">
          <Check className="h-4 w-4 text-readiness-green" /> You&apos;re all set. Tap below for the reveal.
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Validation + mapping ----------------------------- */

function validateStep(step: number, d: Draft): boolean {
  switch (step) {
    case 1:
      return d.displayName.trim().length > 0 && Number(d.age) >= 8 && d.trainingAge !== "" && d.level != null && d.positions.length > 0;
    case 2:
      return heightInches(d) > 0 && Number(d.weight) > 0;
    default:
      return true;
  }
}

const CM_PER_IN = 2.54;
const LB_PER_KG = 2.20462;

function heightInches(d: Draft): number {
  if (d.units === "metric") return Number(d.heightCm || 0) / CM_PER_IN;
  return Number(d.heightFt || 0) * 12 + Number(d.heightIn || 0);
}

function toProfile(d: Draft): PlayerProfile {
  const metric = d.units === "metric";
  const heightIn = heightInches(d);
  const weightLb = metric ? Number(d.weight) * LB_PER_KG : Number(d.weight);

  let wingspanIn: number | undefined;
  if (metric) {
    if (d.wingspanCm) wingspanIn = Number(d.wingspanCm) / CM_PER_IN;
  } else if (d.wingspanFt || d.wingspanIn) {
    wingspanIn = Number(d.wingspanFt || 0) * 12 + Number(d.wingspanIn || 0);
  }
  const cmToIn = (v: string) => (v ? Number(v) / CM_PER_IN : undefined);
  const standingReachIn = d.standingReach ? (metric ? cmToIn(d.standingReach) : Number(d.standingReach)) : undefined;
  const verticalIn = d.vertical ? (metric ? cmToIn(d.vertical) : Number(d.vertical)) : undefined;

  const skillRatings: Record<string, SkillRating> = {};
  for (const item of GAME_SURVEY) {
    const r = d.surveyRatings[item.key];
    if (r == null) continue;
    for (const dim of item.dims) skillRatings[dim] = r;
  }

  return {
    displayName: d.displayName.trim(),
    age: Number(d.age),
    trainingAge: Number(d.trainingAge || 0),
    level: d.level!,
    positions: d.positions,
    units: d.units,
    selfDescribedPlaystyle: d.selfDescribedPlaystyle.trim() || undefined,
    anthropometrics: { heightIn, weightLb, wingspanIn, standingReachIn, verticalIn },
    skillRatings,
    style: d.style,
    injuryHistory: d.injuryHistory.trim() || undefined,
    currentLimitations: d.currentLimitations.trim() || undefined,
  };
}
