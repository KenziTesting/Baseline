"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Field, SegmentedControl, TextInput } from "@/components/ui";
import { ArrowLeft, Check } from "@/components/icons";
import { useBaselineStore, type WearableMode } from "@/lib/store";
import type { SelfReport } from "@/lib/providers/wearable/selfReport";

const SOURCE_OPTIONS: { value: WearableMode; label: string }[] = [
  { value: "demo", label: "Demo" },
  { value: "self", label: "Self-report" },
  { value: "whoop", label: "WHOOP" },
];

const WHOOP_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  connected: { text: "WHOOP connected. Your recovery now drives your plan.", ok: true },
  denied: { text: "WHOOP authorization was denied.", ok: false },
  error: { text: "Something went wrong connecting WHOOP. Try again.", ok: false },
  badstate: { text: "Security check failed (state mismatch). Try again.", ok: false },
  notconfigured: { text: "WHOOP isn't set up on the server yet.", ok: false },
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="pt-24 text-center text-white/40">Loading…</div>}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const {
    wearableMode, setWearableMode, whoopStatus, refreshWhoopStatus,
    selfReportByDate, saveSelfReport, availableEquipment,
  } = useBaselineStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated) void refreshWhoopStatus();
  }, [hydrated, refreshWhoopStatus]);

  const whoopMsg = params.get("whoop");

  if (!hydrated) return <div className="pt-24 text-center text-white/40">Loading…</div>;

  return (
    <div className="pb-28">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={() => router.push("/today")} aria-label="Back" className="pressable -ml-1 rounded-lg p-1 text-white/60 hover:text-white">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
      </header>

      {whoopMsg && WHOOP_MESSAGES[whoopMsg] && (
        <div className={`mt-5 rounded-2xl border p-3 text-sm ${WHOOP_MESSAGES[whoopMsg].ok ? "border-readiness-green/30 bg-readiness-green/[0.08] text-readiness-green" : "border-readiness-red/30 bg-readiness-red/[0.08] text-readiness-red"}`}>
          {WHOOP_MESSAGES[whoopMsg].text}
        </div>
      )}

      {/* SUBSCRIPTION */}
      <section className="mt-6">
        <p className="eyebrow mb-2">Subscription</p>
        <SubscriptionCard />
      </section>

      {/* DATA SOURCE */}
      <section className="mt-6">
        <p className="eyebrow mb-2">Readiness source</p>
        <Card>
          <SegmentedControl columns={3} value={wearableMode} onChange={setWearableMode} options={SOURCE_OPTIONS} />
          <p className="mt-3 text-xs leading-relaxed text-white/50">
            {wearableMode === "demo" && "Demo mode uses realistic mock recovery data so you can see how autoregulation behaves without a device."}
            {wearableMode === "self" && "No wearable? Log a quick sleep + readiness check-in each morning and we'll autoregulate off that."}
            {wearableMode === "whoop" && "Pulls recovery, HRV, resting HR, sleep, and strain straight from WHOOP, with a rolling 30-day baseline."}
          </p>
        </Card>
      </section>

      {/* WHOOP */}
      <section className="mt-6">
        <p className="eyebrow mb-2">WHOOP</p>
        <WhoopCard status={whoopStatus} onDisconnect={async () => {
          await fetch("/api/whoop/disconnect", { method: "POST" });
          await refreshWhoopStatus();
        }} />
      </section>

      {/* SELF-REPORT */}
      <section className="mt-6">
        <p className="eyebrow mb-2">Morning check-in</p>
        <SelfReportCard
          existing={selfReportByDate[new Date().toISOString().slice(0, 10)]}
          onSave={(r) => saveSelfReport(new Date().toISOString().slice(0, 10), r)}
        />
      </section>

      {/* EQUIPMENT */}
      <section className="mt-6">
        <p className="eyebrow mb-2">Equipment access</p>
        <EquipmentCard selected={availableEquipment} />
      </section>

      {/* DEMO DATA */}
      <section className="mt-6">
        <p className="eyebrow mb-2">Demo data</p>
        <DemoDataCard />
      </section>
    </div>
  );
}

function SubscriptionCard() {
  const router = useRouter();
  const { subscription, setSubscription } = useBaselineStore();
  if (subscription.active) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-readiness-green/15 text-readiness-green"><Check className="h-4 w-4" /></span>
          <p className="text-sm font-bold text-white/85">Premium active · {subscription.plan}</p>
        </div>
        <p className="mt-2 text-xs text-white/50">THE WEEK, the alter ego system, the Sunday Report, mental metrics, and the 3D fatigue map are unlocked.</p>
        <button onClick={() => setSubscription("free", false)} className="mt-3 text-xs font-semibold text-readiness-red/80 hover:text-readiness-red">Cancel — one tap, no questions</button>
      </Card>
    );
  }
  return (
    <Card>
      <p className="text-sm font-bold text-white/85">Unlock THE WEEK</p>
      <p className="mt-1.5 text-xs leading-relaxed text-white/50">
        The mentality module, alter ego, Sunday Report, mental metrics, and the 3D fatigue map. From $4.17/mo on the annual plan.
      </p>
      <div className="mt-3">
        <Button onClick={() => router.push("/paywall")}>Subscribe</Button>
      </div>
    </Card>
  );
}

function DemoDataCard() {
  const { demoDataLoaded, loadDemoHistory, clearDemoHistory, loadDemoMental } = useBaselineStore();
  return (
    <Card>
      <p className="text-sm font-bold text-white/85">Sample training history</p>
      <p className="mt-1.5 text-xs leading-relaxed text-white/50">
        Loads ~4 weeks of realistic gym, shooting, and bodyweight logs so the Progress tab and the
        fatigue body map are populated. Clearly demo — clear it anytime.
      </p>
      <div className="mt-3 space-y-2">
        {demoDataLoaded ? (
          <Button variant="ghost" onClick={clearDemoHistory}>Clear demo history</Button>
        ) : (
          <Button onClick={loadDemoHistory}>Load 4 weeks of demo history</Button>
        )}
        <Button variant="ghost" onClick={loadDemoMental}>Load demo mental data (unlocks The Week)</Button>
      </div>
    </Card>
  );
}

function WhoopCard({ status, onDisconnect }: { status: { configured: boolean; connected: boolean } | null; onDisconnect: () => void }) {
  if (!status) return <Card><p className="text-sm text-white/50">Checking WHOOP status…</p></Card>;

  if (!status.configured) {
    return (
      <Card>
        <p className="text-sm font-bold text-white/85">WHOOP needs server setup</p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/50">
          Requires an approved WHOOP developer account. Add these to <code className="text-amber-400">.env.local</code>, then restart:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-white/60">
          <li className="font-mono">WHOOP_CLIENT_ID</li>
          <li className="font-mono">WHOOP_CLIENT_SECRET</li>
          <li className="font-mono">WHOOP_REDIRECT_URI</li>
        </ul>
      </Card>
    );
  }

  if (status.connected) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-readiness-green/15 text-readiness-green"><Check className="h-4 w-4" /></span>
          <p className="text-sm font-bold text-white/85">Connected</p>
        </div>
        <p className="mt-2 text-xs text-white/50">Baseline recomputes over a rolling 30 days. Webhooks keep it fresh; polling is the fallback.</p>
        <button onClick={onDisconnect} className="mt-3 text-xs font-semibold text-readiness-red/80 hover:text-readiness-red">Disconnect</button>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm font-bold text-white/85">Connect your WHOOP</p>
      <p className="mt-1.5 text-xs leading-relaxed text-white/50">Authorize once — we&apos;ll pull recovery, sleep, HRV, and strain.</p>
      <a href="/api/whoop/authorize" className="pressable mt-3 flex min-h-[52px] items-center justify-center rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 text-[15px] font-bold text-court-950">
        Connect WHOOP
      </a>
    </Card>
  );
}

function SelfReportCard({ existing, onSave }: { existing?: SelfReport; onSave: (r: SelfReport) => void }) {
  const [sleep, setSleep] = useState(existing ? String(existing.sleepHours) : "");
  const [readiness, setReadiness] = useState<number>(existing?.subjectiveReadiness ?? 3);
  const [soreness, setSoreness] = useState<number>(existing?.soreness ?? 2);
  const [saved, setSaved] = useState(false);

  const save = () => {
    onSave({ sleepHours: Number(sleep || 0), subjectiveReadiness: readiness, soreness });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Card>
      <Field label="Hours slept last night">
        <TextInput inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value.replace(/[^\d.]/g, ""))} placeholder="e.g. 7.5" />
      </Field>
      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-white/75">How ready do you feel?</p>
        <Scale value={readiness} onChange={setReadiness} lo="Wrecked" hi="Springy" />
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-white/75">Soreness</p>
        <Scale value={soreness} onChange={setSoreness} lo="None" hi="Very sore" />
      </div>
      <div className="mt-5">
        <Button variant={saved ? "ghost" : "primary"} onClick={save}>
          {saved ? <><Check className="h-5 w-5" /> Saved</> : "Save today's check-in"}
        </Button>
      </div>
    </Card>
  );
}

function Scale({ value, onChange, lo, hi }: { value: number; onChange: (n: number) => void; lo: string; hi: string }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`pressable flex min-h-[46px] items-center justify-center rounded-xl border text-sm font-bold ${
              value === n ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-white/[0.07] bg-court-850 text-white/45"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-white/35"><span>{lo}</span><span>{hi}</span></div>
    </div>
  );
}

const COMMON_EQUIPMENT = [
  { value: "hoop", label: "Hoop" },
  { value: "court", label: "Full court" },
  { value: "ball", label: "Ball" },
  { value: "rack", label: "Squat rack" },
  { value: "barbell", label: "Barbell" },
  { value: "trap_bar", label: "Trap bar" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "bench", label: "Bench" },
  { value: "bands", label: "Bands" },
  { value: "box", label: "Plyo box" },
  { value: "med_ball", label: "Med ball" },
  { value: "cones", label: "Cones" },
] as const;

function EquipmentCard({ selected }: { selected: string[] }) {
  const setEquipment = useBaselineStore((s) => s.setEquipment);
  const toggle = (v: string) => {
    const has = selected.includes(v);
    const next = has ? selected.filter((x) => x !== v) : [...selected, v];
    // "none" is always available; keep it in the set.
    setEquipment(next.includes("none") ? (next as never) : (["none", ...next] as never));
  };
  return (
    <Card>
      <p className="text-xs leading-relaxed text-white/50">What you can train with — sessions only pull drills you have the gear for.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {COMMON_EQUIPMENT.map((eq) => {
          const active = selected.includes(eq.value);
          return (
            <button
              key={eq.value}
              onClick={() => toggle(eq.value)}
              className={`pressable min-h-[44px] rounded-xl border px-2 text-xs font-semibold ${
                active ? "border-amber-500/60 bg-amber-500/[0.14] text-amber-300" : "border-white/[0.07] bg-court-850 text-white/55"
              }`}
            >
              {eq.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
