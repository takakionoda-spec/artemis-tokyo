"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { dict } = useLanguage();

  return (
    <footer className="border-t border-ink-200 mt-section bg-paper">
      <div className="px-6 lg:px-10 py-12 lg:py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <p className="font-display text-3xl tracking-[0.12em] uppercase">Artemis Tokyo</p>
          <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-ink-600">
            {dict.ui.footer.copy}
          </p>
          <div className="silver-rule mt-8 max-w-xs" />
        </div>
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
          {dict.ui.footer.sections.map((section) => (
            <div key={section.name}>
              <h4 className="eyebrow text-ink">{section.name}</h4>
              <ul className="mt-4 space-y-2 text-sm text-ink-700">
                {section.items.map((item) => (
                  <li key={item}>
                    <a href="#" className="editorial-link hover:text-ink/70">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-ink-200 px-6 lg:px-10 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[0.6875rem] tracking-[0.18em] uppercase text-ink-500">
        <span>{dict.brand.legal}</span>
        <span>Tokyo · Cislunar · Editorial Independent</span>
      </div>
    </footer>
  );
}
