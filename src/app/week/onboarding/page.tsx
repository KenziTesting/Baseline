"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput } from "@/components/ui";
import { ArrowRight } from "@/components/icons";
import { useBaselineStore } from "@/lib/store";

const TRIGGERS = ["Tape the wrists", "One specific song", "Double-tap the floor", "Last shoe tightened"];
const TOTEMS = ["A wristband", "Specific socks", "A word on my tape", "A chain"];

export default function AlterEgoCeremony() {
  const router = useRouter();
  const setAlterEgo = useBaselineStore((s) => s.setAlterEgo);
  const [step, setStep] = useState(0);
  const [threeWords, setThreeWords] = useState("");
  const [holdsBack, setHoldsBack] = useState("");
  const [doesntCare, setDoesntCare] = useState("");
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [totem, setTotem] = useState("");
  const [revealed, setRevealed] = useState(false);

  const finish = () => {
    setAlterEgo({
      name: name.trim().toUpperCase(),
      threeWordsOffCourt: threeWords.trim(),
      holdsBackFrom: holdsBack.trim(),
      doesNotCareLook: doesntCare.trim(),
      trigger,
      totem,
      createdAt: new Date().toISOString(),
    });
    router.replace("/week");
  };

  const steps = [
    // 0 — intro
    <Screen key="intro" eyebrow="Activation" title="Let's build the one who takes the last shot.">
      <p className="text-[15px] leading-relaxed text-white/60">
        This is a real technique — Kobe had the Black Mamba, Beyoncé had Sasha Fierce. A named version of you that
        lowers the cost of failure and gives you permission to be loud, to demand the ball, to look stupid trying.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-white/60">Six questions. Answer them honestly. Then we name it.</p>
    </Screen>,
    // 1
    <Screen key="q1" eyebrow="1 of 6" title="Who are you off the court?">
      <p className="mb-4 text-sm text-white/50">Three words. The everyday you.</p>
      <TextInput value={threeWords} onChange={(e) => setThreeWords(e.target.value)} placeholder="e.g. quiet, careful, kind" />
    </Screen>,
    // 2
    <Screen key="q2" eyebrow="2 of 6" title="What does that person hold you back from?">
      <p className="mb-4 text-sm text-white/50">The honest one. Usually: being loud, taking the shot, looking stupid.</p>
      <TextInput value={holdsBack} onChange={(e) => setHoldsBack(e.target.value)} placeholder="What you shrink from" />
    </Screen>,
    // 3
    <Screen key="q3" eyebrow="3 of 6" title="What does the version who doesn't care look like?">
      <p className="mb-4 text-sm text-white/50">The one who takes the shot and doesn't flinch at the miss.</p>
      <TextInput value={doesntCare} onChange={(e) => setDoesntCare(e.target.value)} placeholder="Describe them" />
    </Screen>,
    // 4 — name + reveal
    <Screen key="name" eyebrow="4 of 6" title="Name them.">
      {!revealed ? (
        <>
          <p className="mb-4 text-sm text-white/50">One word. Something that isn't your name. Something that sounds like it means business.</p>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="The name" autoCapitalize="characters" />
        </>
      ) : (
        <div className="py-8 text-center">
          <p className="eyebrow mb-4">You&apos;re not you anymore. You&apos;re</p>
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 -top-4 mx-auto h-40 w-40 animate-glow-pulse rounded-full bg-gradient-to-br from-amber-500/40 to-orange-500/20 blur-3xl" />
            <h1 className="relative animate-scale-in bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-500 bg-clip-text font-display text-[54px] uppercase leading-none tracking-tight text-transparent">
              {name.trim().toUpperCase()}
            </h1>
          </div>
          <p className="mt-6 text-sm text-white/55">That&apos;s who trains now. That&apos;s who the app talks to.</p>
        </div>
      )}
    </Screen>,
    // 5 — trigger
    <Screen key="trigger" eyebrow="5 of 6" title="Pick the trigger.">
      <p className="mb-4 text-sm text-white/50">A physical action that switches you in. It must be physical and repeatable.</p>
      <ChoiceGrid options={TRIGGERS} value={trigger} onChange={setTrigger} />
    </Screen>,
    // 6 — totem
    <Screen key="totem" eyebrow="6 of 6" title="Pick the totem.">
      <p className="mb-4 text-sm text-white/50">Something you can wear or carry. {name.trim().toUpperCase() || "The name"} lives in it.</p>
      <ChoiceGrid options={TOTEMS} value={totem} onChange={setTotem} />
    </Screen>,
  ];

  const isNameStep = step === 4;
  const canNext =
    (step === 1 && threeWords.trim()) ||
    (step === 2 && holdsBack.trim()) ||
    (step === 3 && doesntCare.trim()) ||
    (step === 4 && name.trim()) ||
    (step === 5 && trigger) ||
    (step === 6 && totem) ||
    step === 0;

  const onNext = () => {
    if (isNameStep && !revealed) { setRevealed(true); return; }
    if (step === steps.length - 1) { finish(); return; }
    setStep((s) => s + 1);
  };

  return (
    <div className="flex min-h-[88vh] flex-col pt-8">
      <div key={step + (revealed ? "-r" : "")} className="flex-1 animate-fade-up">{steps[step]}</div>
      <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-court-950 via-court-950/95 to-transparent px-5 pb-6 pt-4">
        <Button disabled={!canNext} onClick={onNext}>
          {isNameStep && !revealed ? "Reveal" : step === steps.length - 1 ? "Enter the week" : "Next"}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function Screen({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="text-[26px] font-extrabold leading-tight tracking-tight">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function ChoiceGrid({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`pressable min-h-[64px] rounded-2xl border px-3 text-sm font-semibold transition-colors ${value === o ? "border-amber-500/60 bg-amber-500/[0.14] text-amber-300" : "border-white/[0.08] bg-court-850 text-white/70"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
