"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

/* =============================================================================
   Newsletter — async-submitting signup form
   -----------------------------------------------------------------------------
   POSTs to /api/subscribe and reflects the response in the UI:
     idle    → input + button
     loading → input disabled, button shows "Subscribing…" label
     success → form replaced with thank-you block + small "subscribe another"
               link to re-arm
     error   → button re-enabled, inline error message under the field

   Visual design preserved from ARTEMIS TOKYO's editorial monochrome:
     - serif font-display headline
     - hairline ink underlines, not glass / neon
     - success and error states are type-driven (no color flooding):
         success → eyebrow ✓ + display-serif thank-you
         error   → input bottom-border switches to red-700 + small red note
   ========================================================================== */

type Status = "idle" | "loading" | "success" | "error";

type SubscribeResponse = {
  success: boolean;
  error?: "invalid_email" | "duplicate" | "rate_limited" | "server_error" | "upstream_error";
  provider?: string;
};

/** Bilingual UI strings local to this component. Kept inline (rather than
 *  threaded through siteConfig.chrome.newsletter.states) because they're
 *  transient — visible only for a moment around the submit. */
const COPY = {
  en: {
    loading: "Subscribing…",
    success: "Thank you — you are on the list. See you in the next dispatch.",
    successAgain: "Subscribe another",
    invalid: "That email looks malformed. Please double-check.",
    duplicate: "This address is already on the list.",
    rate: "Too many attempts — please try again in a minute.",
    server: "Something went wrong on our end. Please try again.",
    upstream: "Our newsletter provider is having a moment. Try again shortly.",
    confirmed: "Confirmed"
  },
  ja: {
    loading: "送信中…",
    success: "ご登録、ありがとうございます。次の Dispatch でお会いしましょう。",
    successAgain: "別のメールアドレスで登録",
    invalid: "メールアドレスの形式を確認してください。",
    duplicate: "このアドレスは既に登録されています。",
    rate: "短時間に何度も送信されました。少し時間をおいて再度お試しください。",
    server: "サーバーで一時的なエラーが発生しました。もう一度お試しください。",
    upstream: "ニュースレター連携先で問題が発生しています。少し経ってからお試しください。",
    confirmed: "登録完了"
  }
} as const;

export default function Newsletter() {
  const { lang, dict } = useLanguage();
  const t = COPY[lang];

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  function pickErrorMessage(code: SubscribeResponse["error"]): string {
    switch (code) {
      case "invalid_email":
        return t.invalid;
      case "duplicate":
        return t.duplicate;
      case "rate_limited":
        return t.rate;
      case "upstream_error":
        return t.upstream;
      case "server_error":
      default:
        return t.server;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    const trimmed = email.trim();
    if (!trimmed) {
      setStatus("error");
      setErrorMsg(t.invalid);
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed })
      });
      const data = (await res.json().catch(() => ({}))) as SubscribeResponse;

      if (res.ok && data.success) {
        setStatus("success");
        setEmail("");
        return;
      }

      setStatus("error");
      setErrorMsg(pickErrorMessage(data.error));
    } catch (err) {
      // Network / fetch threw — treat as server error.
      console.error("[Newsletter] submit failed:", err);
      setStatus("error");
      setErrorMsg(t.server);
    }
  }

  function reset() {
    setStatus("idle");
    setErrorMsg("");
    setEmail("");
  }

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const hasError = status === "error";

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
          {isSuccess ? (
            <div
              className="flex flex-col gap-5"
              role="status"
              aria-live="polite"
            >
              <p className="eyebrow text-ink">✓ {t.confirmed}</p>
              <p className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-tight tracking-[-0.012em] text-ink">
                {t.success}
              </p>
              <button
                type="button"
                onClick={reset}
                className="self-start editorial-link text-[0.6875rem] tracking-[0.22em] uppercase text-ink hover:text-ink/60"
              >
                ← {t.successAgain}
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
              <label htmlFor="email" className="eyebrow text-ink-500">
                Email
              </label>
              <div
                className={`flex items-center pb-3 gap-3 border-b transition-colors ${
                  hasError ? "border-red-700" : "border-ink"
                }`}
              >
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={dict.ui.newsletter.placeholder}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (hasError) {
                      setStatus("idle");
                      setErrorMsg("");
                    }
                  }}
                  disabled={isLoading}
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? "newsletter-error" : undefined}
                  className="flex-1 bg-transparent text-lg outline-none placeholder:text-ink-400 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium px-5 py-3 border border-ink text-ink hover:bg-ink hover:text-paper transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink"
                >
                  {isLoading ? t.loading : dict.ui.newsletter.cta}
                </button>
              </div>

              {hasError ? (
                <p
                  id="newsletter-error"
                  role="alert"
                  aria-live="assertive"
                  className="text-[0.6875rem] tracking-[0.12em] uppercase text-red-700"
                >
                  ✗ {errorMsg}
                </p>
              ) : (
                <p className="text-[0.6875rem] tracking-[0.12em] uppercase text-ink-500">
                  {dict.ui.newsletter.disclaimer}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
