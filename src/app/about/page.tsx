"use client";

import { Container } from "@/components/GridSystem";
import { useLanguage } from "@/context/LanguageContext";
import Newsletter from "@/components/Newsletter";
import { siteConfig } from "@/site.config";

export default function AboutPage() {
  const { lang, dict } = useLanguage();
  const about = siteConfig.about;

  return (
    <>
      <Container className="pt-12 lg:pt-16 pb-12">
        <p className="eyebrow">{dict.nav.about}</p>
        <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.025em] max-w-5xl">
          {about.headline[lang]}
        </h1>
        <p className="mt-8 max-w-[68ch] text-lg text-ink-600 leading-relaxed">
          {about.lede[lang]}
        </p>
        <div className="silver-rule mt-12" />
      </Container>

      <Container className="pb-section">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-16">
          {about.blocks.map((block, i) => (
            <article key={i} className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-4 border-t border-ink pt-10">
              <div className="lg:col-span-3">
                <p className="eyebrow">{block.eyebrow[lang]}</p>
              </div>
              <div className="lg:col-span-9">
                <h2 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.08] tracking-[-0.015em] text-ink max-w-3xl">
                  {block.heading[lang]}
                </h2>
                <p className="mt-6 max-w-[68ch] text-base text-ink-700 leading-relaxed">
                  {block.body[lang]}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>

      <Container>
        <Newsletter />
      </Container>
    </>
  );
}
