"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { ArrowLeft, Check } from "@/components/icons";
import { useBaselineStore, type SubscriptionPlan } from "@/lib/store";

/**
 * Paywall (spec I7). Pricing resolved (Part H): annual is the honest hero,
 * monthly is the standard — NOT a manipulative anchor (spec forbids dark
 * patterns). Pre-purchase disclosure is on the same screen as the buy button, in
 * plain type, as required by both app stores + FTC negative-option + EU law.
 *
 * On iOS/Android this drives StoreKit 2 / Google Play Billing 6+ with the intro
 * as a store-configured introductory offer and server-side receipt validation.
 * On web there's no in-app purchase, so "Unlock" here is a demo stand-in.
 */
const PLANS: { plan: SubscriptionPlan; label: string; price: string; per: string; note?: string; hero?: boolean }[] = [
  { plan: "annual", label: "Annual", price: "$50.00", per: "/year", note: "$4.17/mo · best value", hero: true },
  { plan: "monthly", label: "Monthly", price: "$9.99", per: "/month", note: "Cancel anytime" },
  { plan: "intro", label: "First month", price: "$5.99", per: "intro", note: "Then $9.99/mo" },
];

export default function PaywallPage() {
  const router = useRouter();
  const setSubscription = useBaselineStore((s) => s.setSubscription);
  const [selected, setSelected] = useState<SubscriptionPlan>("annual");

  const unlock = () => {
    setSubscription(selected, true);
    router.replace("/week");
  };

  return (
    <div className="pb-28">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={() => router.back()} aria-label="Back" className="pressable -ml-1 rounded-lg p-1 text-white/60 hover:text-white">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-display text-2xl tracking-tight">THE WEEK</h1>
      </header>

      <section className="mt-5 animate-fade-up">
        <h2 className="text-2xl font-extrabold leading-tight">You already train your body every day.</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-white/60">
          THE WEEK trains the thing that's actually been holding you back — a named weekly cycle, your alter ego,
          the Sunday Report, the mental metrics, and the 3D fatigue map.
        </p>
        <ul className="mt-4 space-y-2">
          {["A new named week every Monday", "Your alter ego, used everywhere", "The Sunday Report — real numbers, real reckoning", "Pressure-FT gap, tension, reset time — tracked", "The 3D fatigue map"].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-white/80"><Check className="h-4 w-4 text-amber-400" /> {f}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-white/40">The entire physical program, drill library, and progress tracking stay free, forever.</p>
      </section>

      <section className="mt-6 space-y-2">
        {PLANS.map((p) => {
          const active = selected === p.plan;
          return (
            <button
              key={p.plan}
              onClick={() => setSelected(p.plan)}
              className={`pressable flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${active ? "border-amber-500/70 bg-amber-500/[0.1]" : "border-white/[0.08] bg-court-850"}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{p.label}</span>
                  {p.hero && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-court-950">BEST VALUE</span>}
                </div>
                {p.note && <p className="mt-0.5 text-xs text-white/45">{p.note}</p>}
              </div>
              <div className="text-right">
                <span className="font-display text-xl text-white">{p.price}</span>
                <span className="text-xs text-white/40">{p.per}</span>
              </div>
            </button>
          );
        })}
      </section>

      {/* Required pre-purchase disclosure — same screen as the buy button. */}
      <p className="mt-4 text-[11px] leading-relaxed text-white/45">
        {selected === "intro"
          ? "Your $5.99 first month auto-renews at $9.99/month until you cancel."
          : selected === "monthly"
            ? "$9.99/month, auto-renews monthly until you cancel."
            : "$50.00/year ($4.17/mo), billed annually, auto-renews until you cancel."}{" "}
        Cancel anytime in one tap in Settings. Payment is charged to your app-store account.{" "}
        <span className="underline">Terms</span> · <span className="underline">Privacy</span>.
      </p>

      <div className="mt-4">
        <Button onClick={unlock}>Start · {PLANS.find((p) => p.plan === selected)!.price}</Button>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs">
        <button onClick={() => { setSubscription("monthly", true); router.replace("/week"); }} className="font-semibold text-white/50 hover:text-white">Restore purchases</button>
        <span className="text-white/15">·</span>
        <button onClick={() => router.back()} className="font-semibold text-white/50 hover:text-white">Not now</button>
      </div>
      <p className="mt-4 text-center text-[11px] text-white/30">Under 18? Ask a parent. Clear terms, no tricks, cancel in one tap.</p>
    </div>
  );
}
