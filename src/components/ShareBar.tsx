"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { siteConfig } from "@/site.config";

type Props = {
  title: string;
  slug: string;
};

export default function ShareBar({ title, slug }: Props) {
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/articles/${slug}`
      : `${siteConfig.brand.siteUrl}/articles/${slug}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const xHref = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const liHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;

  const labels = {
    share: lang === "ja" ? "シェア" : "Share",
    copy: lang === "ja" ? "リンクをコピー" : "Copy link",
    copied: lang === "ja" ? "✓ コピーしました" : "✓ Copied"
  };

  const btn =
    "text-[0.6875rem] tracking-[0.22em] uppercase font-medium px-4 py-2 border border-ink-200 text-ink hover:bg-ink hover:text-paper hover:border-ink transition-colors duration-200";

  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow text-ink-500">{labels.share}</p>
      <div className="flex flex-wrap gap-2">
        <a className={btn} href={xHref} target="_blank" rel="noopener noreferrer">X</a>
        <a className={btn} href={liHref} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a className={btn} href={mailHref}>Email</a>
        <button type="button" className={btn} onClick={onCopy}>
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
    </div>
  );
}
