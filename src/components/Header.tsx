"use client";

import Link from "next/link";
import LanguageToggle from "./LanguageToggle";
import Navigation from "./Navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function Header() {
  const { dict, lang } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80 border-b border-ink-200">
      {/* Top utility row */}
      <div className="hidden md:flex items-center justify-between border-b border-ink-200 px-6 lg:px-10 py-2 text-[0.625rem] tracking-[0.22em] uppercase text-ink-500">
        <div>
          <span>{new Date().toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          })}</span>
          <span className="mx-3 text-ink-300">|</span>
          <span>Tokyo</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/about" className="hover:text-ink transition-colors">{dict.nav.about}</Link>
          <Link href="/issues" className="hover:text-ink transition-colors">{lang === "ja" ? "アーカイブ" : "Archive"}</Link>
          <Link href="/#newsletter" className="hover:text-ink transition-colors">{dict.nav.subscribe}</Link>
          <LanguageToggle />
        </div>
      </div>

      {/* Masthead */}
      <div className="flex items-center justify-between gap-6 px-6 lg:px-10 py-5 lg:py-7">
        <div className="md:hidden">
          <LanguageToggle />
        </div>
        <Link href="/" aria-label="ARTEMIS TOKYO — home" className="block mx-auto md:mx-0">
          <span className="block text-center md:text-left font-display text-[1.75rem] md:text-[2.25rem] lg:text-[2.5rem] tracking-[0.18em] uppercase leading-none">
            Artemis Tokyo
          </span>
          <span className="hidden md:block mt-2 text-[0.625rem] tracking-[0.32em] uppercase text-ink-500">
            {dict.brand.tagline}
          </span>
        </Link>
        <div className="hidden md:block">
          <span className="text-[0.625rem] tracking-[0.22em] uppercase text-ink-500">{dict.ui.issue} 04 — 2026</span>
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
