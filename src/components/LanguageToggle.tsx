"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, toggle } = useLanguage();
  const next = lang === "en" ? "JA" : "EN";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch language to ${next}`}
      className={`group inline-flex items-center gap-2 text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-ink hover:text-ink/60 transition-colors duration-200 ${className}`}
    >
      <span aria-hidden className={lang === "en" ? "text-ink" : "text-ink/35"}>EN</span>
      <span aria-hidden className="h-3 w-px bg-ink/30" />
      <span aria-hidden className={lang === "ja" ? "text-ink" : "text-ink/35"}>JA</span>
    </button>
  );
}
