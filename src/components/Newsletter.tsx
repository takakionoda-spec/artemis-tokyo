"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function Newsletter() {
  const { dict } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="newsletter" className="border-y border-ink py-16 lg:py-24 my-section">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-8 items-end">
        <div className="lg:col-span-6">
          <p className="eyebrow">{dict.ui.newsletter.eyebrow}</p>
          <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.02em] whitespace-pre-line">
            {dict.ui.newsletter.heading}
          </h2>
          <p className="mt-5 max-w-xl text-base text-ink-600 leading-relaxed">
            {dict.ui.newsletter.lede}
          </p>
        </div>
        <div className="lg:col-span-6 lg:pl-10 lg:border-l lg:border-ink-200">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label htmlFor="email" className="eyebrow text-ink-500">Email</label>
            <div className="flex items-center border-b border-ink pb-3 gap-3">
              <input
                id="email"
                type="email"
                required
                placeholder={dict.ui.newsletter.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-lg outline-none placeholder:text-ink-400"
              />
              <button
                type="submit"
                className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium px-5 py-3 border border-ink text-ink hover:bg-ink hover:text-paper transition-colors duration-200"
              >
                {dict.ui.newsletter.cta}
              </button>
            </div>
            <p className="text-[0.6875rem] tracking-[0.12em] uppercase text-ink-500">
              {submitted ? "✓ " + dict.ui.newsletter.disclaimer : dict.ui.newsletter.disclaimer}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
