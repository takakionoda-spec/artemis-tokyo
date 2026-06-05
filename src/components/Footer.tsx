"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { CATEGORY_ORDER } from "@/lib/i18n";
import { siteConfig } from "@/site.config";

export default function Footer() {
  const { dict, lang } = useLanguage();

  return (
    <footer className="border-t border-ink-200 mt-section bg-paper">
      <div className="px-6 lg:px-10 py-12 lg:py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-6">
          <p className="font-display text-3xl tracking-[0.12em] uppercase">{siteConfig.brand.wordmark}</p>
          <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-ink-600">
            {dict.ui.footer.copy}
          </p>
          <div className="silver-rule mt-8 max-w-xs" />
        </div>

        <div className="md:col-span-3">
          <h4 className="eyebrow text-ink">
            {lang === "ja" ? "セクション" : "Sections"}
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-ink-700">
            {CATEGORY_ORDER.map((key) => (
              <li key={key}>
                <Link href={`/category/${key}`} className="editorial-link hover:text-ink/70">
                  {dict.categories[key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <h4 className="eyebrow text-ink">
            {lang === "ja" ? "編集部" : "Editorial"}
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-ink-700">
            <li>
              <Link href="/about" className="editorial-link hover:text-ink/70">
                {dict.nav.about}
              </Link>
            </li>
            <li>
              <Link href="/#newsletter" className="editorial-link hover:text-ink/70">
                {dict.nav.subscribe}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-200 px-6 lg:px-10 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[0.6875rem] tracking-[0.18em] uppercase text-ink-500">
        <span>{dict.brand.legal}</span>
        <span>{siteConfig.chrome.footer.strapline}</span>
      </div>
    </footer>
  );
}
