"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Container } from "@/components/GridSystem";

export default function NotFound() {
  const { dict } = useLanguage();
  return (
    <Container className="py-section">
      <div className="max-w-[68ch]">
        <p className="eyebrow">404</p>
        <h1 className="mt-6 font-display text-[clamp(2.75rem,6vw,5rem)] leading-[0.95] tracking-[-0.025em]">
          {dict.ui.notFound.title}
        </h1>
        <p className="mt-6 text-lg text-ink-600 leading-relaxed">{dict.ui.notFound.lede}</p>
        <Link
          href="/"
          className="mt-10 inline-block editorial-link text-[0.6875rem] tracking-[0.22em] uppercase"
        >
          ← {dict.ui.notFound.back}
        </Link>
      </div>
    </Container>
  );
}
