"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBaselineStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const dna = useBaselineStore((s) => s.dna);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (!hydrated) return;
    router.replace(dna ? "/reveal" : "/onboarding");
  }, [hydrated, dna, router]);

  return <div className="pt-20 text-center text-white/40">Loading Baseline…</div>;
}
