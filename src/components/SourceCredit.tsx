"use client";

import { useLanguage } from "@/context/LanguageContext";

type Props = {
  source?: { name: string; url: string };
  /** "inline" = card footer chip (default). "block" = sidebar dt/dd layout. */
  variant?: "inline" | "block";
  className?: string;
};

/** Small external-link arrow drawn in line-art so it picks up `currentColor`. */
function ArrowOut({ className = "" }: { className?: string }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden
      className={`inline-block translate-y-[-1px] ${className}`}
    >
      <path
        d="M2.4 7.6 L7.4 2.6"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M3.4 2.6 H7.4 V6.6"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Editorial source attribution.
 *
 * Renders as a small, tracked-out uppercase link in muted ink that
 * resolves on hover to full ink with a hairline underline — restrained
 * enough to sit at the foot of an ArticleCard, formal enough to live in
 * the article masthead.
 */
export default function SourceCredit({ source, variant = "inline", className = "" }: Props) {
  const { lang } = useLanguage();
  if (!source?.url || !source?.name) return null;
  const label = lang === "ja" ? "出典" : "Source";

  if (variant === "block") {
    return (
      <div className={className}>
        <p className="eyebrow text-ink-500">{label}</p>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-baseline gap-1.5 text-sm text-ink hover:text-ink/60 transition-colors group/source"
        >
          <span className="border-b border-ink/40 group-hover/source:border-ink transition-colors">
            {source.name}
          </span>
          <ArrowOut className="text-ink-500 group-hover/source:text-ink transition-colors" />
        </a>
      </div>
    );
  }

  // inline (card footer)
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group/source inline-flex items-baseline gap-1.5 text-[0.625rem] tracking-[0.22em] uppercase text-ink-500 hover:text-ink transition-colors duration-200 ${className}`}
    >
      <span>{label}:</span>
      <span className="text-ink border-b border-ink/30 group-hover/source:border-ink transition-colors">
        {source.name}
      </span>
      <ArrowOut className="text-ink-400 group-hover/source:text-ink transition-colors" />
    </a>
  );
}
