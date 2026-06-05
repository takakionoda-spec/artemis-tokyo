"use client";

import Link from "next/link";
import LanguageToggle from "./LanguageToggle";
import Navigation from "./Navigation";
import { useLanguage } from "@/context/LanguageContext";
import { siteConfig } from "@/site.config";

// Issue counter derived from siteConfig.brand.issueBase. Vol. 01 corresponds
// to {issueBase.year, issueBase.month}. Updated on every render so the masthead
// stays accurate over months.
function currentIssueLabel(): string {
  const d = new Date();
  const base = siteConfig.brand.issueBase;
  const offset = (d.getFullYear() - base.year) * 12 + (d.getMonth() + 1 - base.month) + 1;
  const vol = Math.max(1, offset);
  return `${String(vol).padStart(2, "0")} — ${d.getFullYear()}`;
}

export default function Header() {
  const { dict, lang } = useLanguage();
  const issueLabel = currentIssueLabel();
  const brand = siteConfig.brand;

  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80 border-b border-ink-200">
      {/* Top utility row — visible on every viewport. On mobile it carries the
          language toggle so the masthead below can hold the logo alone and
          keep it perfectly centered. */}
      <div className="flex items-center justify-between border-b border-ink-200 px-6 lg:px-10 py-2 text-[0.625rem] tracking-[0.22em] uppercase text-ink-500">
        <div className="flex items-center">
          <span>{new Date().toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          })}</span>
          <span className="mx-3 text-ink-300 hidden sm:inline">|</span>
          <span className="hidden sm:inline">Tokyo</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/about" className="hidden md:inline hover:text-ink transition-colors">{dict.nav.about}</Link>
          <Link href="/#newsletter" className="hidden md:inline hover:text-ink transition-colors">{dict.nav.subscribe}</Link>
          <LanguageToggle />
        </div>
      </div>

      {/* Masthead — single child on mobile so the logo sits dead-centre.
          On md+ we flip to a 2-column row with the issue marker on the right. */}
      <div className="flex items-center justify-center md:justify-between gap-6 px-6 lg:px-10 py-5 lg:py-7">
        <Link href="/" aria-label={`${brand.name} — home`} className="block">
          <span className="block text-center md:text-left font-display text-[1.75rem] md:text-[2.25rem] lg:text-[2.5rem] tracking-[0.18em] uppercase leading-none">
            {brand.wordmark}
          </span>
          <span className="hidden md:block mt-2 text-[0.625rem] tracking-[0.32em] uppercase text-ink-500">
            {dict.brand.tagline}
          </span>
        </Link>
        <div className="hidden md:block">
          <span className="text-[0.625rem] tracking-[0.22em] uppercase text-ink-500">{dict.ui.issue} {issueLabel}</span>
        </div>
      </div>

      {/* Section nav */}
      <div className="border-t border-ink-200">
        <div className="px-6 lg:px-10 py-3 overflow-x-auto">
          <Navigation />
        </div>
      </div>
    </header>
  );
}
