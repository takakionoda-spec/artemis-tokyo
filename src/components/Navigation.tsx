"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { CATEGORY_ORDER } from "@/lib/i18n";

export default function Navigation({ variant = "primary" }: { variant?: "primary" | "compact" }) {
  const { dict } = useLanguage();

  return (
    <nav
      aria-label="Sections"
      className={
        variant === "primary"
          ? "flex items-center gap-7 text-[0.6875rem] tracking-[0.22em] uppercase font-medium"
          : "flex items-center gap-5 text-[0.625rem] tracking-[0.18em] uppercase font-medium text-ink/70"
      }
    >
      {CATEGORY_ORDER.map((key) => (
        <Link
          key={key}
          href={`/category/${key}`}
          className="editorial-link text-ink hover:text-ink/70"
        >
          {dict.categories[key]}
        </Link>
      ))}
    </nav>
  );
}
