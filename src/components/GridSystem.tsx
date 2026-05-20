"use client";

import { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto max-w-[1440px] px-6 lg:px-10 ${className}`}>{children}</div>
  );
}

export function SectionRule({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 border-t border-ink pt-4">
      <h2 className="eyebrow text-ink">{label}</h2>
      {action ? <div className="text-[0.6875rem] tracking-[0.22em] uppercase text-ink-500">{action}</div> : null}
    </div>
  );
}

export function HeroGrid({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-12">
      <div className="lg:col-span-8 lg:border-r lg:border-ink-200 lg:pr-8">{left}</div>
      <aside className="lg:col-span-4 flex flex-col gap-10">{right}</aside>
    </div>
  );
}

export function TriColGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
      {children}
    </div>
  );
}

export function LeadGrid({ lead, items }: { lead: ReactNode; items: ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-12">
      <div className="lg:col-span-7">{lead}</div>
      <div className="lg:col-span-5 grid grid-cols-1 gap-8 divide-y divide-ink-200">
        {items}
      </div>
    </div>
  );
}
