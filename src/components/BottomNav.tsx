"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Chart, Chat, Home, Shoe, Target } from "./icons";

interface Tab {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  enabled: boolean;
}

const TABS: Tab[] = [
  { href: "/today", label: "Today", Icon: Home, enabled: true },
  { href: "/reveal", label: "Archetype", Icon: Target, enabled: true },
  { href: "/progress", label: "Progress", Icon: Chart, enabled: true },
  { href: "/shoes", label: "Shoes", Icon: Shoe, enabled: true },
  { href: "/coach", label: "Coach", Icon: Chat, enabled: true },
];

/** Routes that are focused, single-task flows — the nav bar stays out of the way. */
const HIDE_ON = ["/", "/onboarding", "/session"];

export function BottomNav() {
  const pathname = usePathname();
  if (HIDE_ON.includes(pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-white/[0.07] bg-court-950/85 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg"
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map(({ href, label, Icon, enabled }) => {
          const active = pathname === href;
          const content = (
            <span
              className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl px-3 transition-colors ${
                active ? "text-amber-400" : enabled ? "text-white/55" : "text-white/25"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </span>
          );
          if (!enabled) {
            return (
              <li key={href} className="relative flex-1">
                <button
                  type="button"
                  aria-disabled
                  title={`${label} — coming soon`}
                  className="pressable w-full cursor-default"
                >
                  {content}
                </button>
                <span className="pointer-events-none absolute right-1/2 top-0 translate-x-[26px] rounded-full bg-court-700 px-1 text-[7px] font-bold uppercase tracking-wide text-white/40">
                  soon
                </span>
              </li>
            );
          }
          return (
            <li key={href} className="flex-1">
              <Link href={href as Route} aria-current={active ? "page" : undefined} className="pressable block">
                {content}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
