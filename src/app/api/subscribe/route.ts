import { NextResponse } from "next/server";

/* =============================================================================
   POST /api/subscribe
   -----------------------------------------------------------------------------
   Newsletter signup endpoint. Designed so the wiring stays unchanged when you
   later flip from "log only" mode to a real provider (Resend / Loops /
   Mailchimp / Google Sheets webhook).

   Request:
     POST /api/subscribe
     Content-Type: application/json
     { "email": "user@example.com" }

   Responses:
     200  { success: true,  provider: "noop" | "resend" | ... }
     400  { success: false, error: "invalid_email" }
     409  { success: false, error: "duplicate" }
     429  { success: false, error: "rate_limited" }
     500  { success: false, error: "server_error" }
     502  { success: false, error: "upstream_error" }

   Provider selection (in priority order):
     - RESEND_API_KEY + RESEND_AUDIENCE_ID         → Resend Audiences API
     - LOOPS_API_KEY                                → Loops contact create
     - MAILCHIMP_API_KEY + MAILCHIMP_LIST_ID +
       MAILCHIMP_SERVER (e.g. us21)                → Mailchimp lists members
     - GOOGLE_SHEETS_WEBHOOK_URL                    → Apps Script webhook
     - (none)                                       → log to stdout + succeed

   The stubs at the bottom of this file show exactly what to add when you
   commit to a provider. Just delete the `throw` and uncomment the fetch.
   ========================================================================== */

// Don't run on the Edge runtime — some provider SDKs need Node fs / crypto.
export const runtime = "nodejs";
// Always run on demand; don't cache responses.
export const dynamic = "force-dynamic";

/** Pragmatic RFC-5321-ish email regex. Rejects whitespace and demands a TLD
 *  of at least 2 chars. Not perfect but it filters >99% of typos and bots,
 *  which is the only useful job for a client-side gate. Server-side, the
 *  upstream provider does the authoritative validation. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LEN = 254; // per RFC 5321

type Provider = "resend" | "loops" | "mailchimp" | "google-sheets" | "noop";
type SubscribeError =
  | "invalid_email"
  | "duplicate"
  | "rate_limited"
  | "server_error"
  | "upstream_error";

type DeliveryResult =
  | { success: true; provider: Provider }
  | { success: false; error: SubscribeError };

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_email" as SubscribeError },
      { status: 400 }
    );
  }

  const raw = (body as { email?: unknown })?.email;
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  // Validation gate
  if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { success: false, error: "invalid_email" as SubscribeError },
      { status: 400 }
    );
  }

  // Provider dispatch
  let result: DeliveryResult;
  try {
    result = await deliverSubscription(email);
  } catch (err) {
    console.error("[api/subscribe] unexpected delivery error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" as SubscribeError },
      { status: 500 }
    );
  }

  if (!result.success) {
    const statusByError: Record<SubscribeError, number> = {
      invalid_email: 400,
      duplicate: 409,
      rate_limited: 429,
      server_error: 500,
      upstream_error: 502
    };
    return NextResponse.json(result, { status: statusByError[result.error] });
  }

  return NextResponse.json(result, { status: 200 });
}

// ---------------------------------------------------------------------------
// Delivery dispatcher — picks the first configured provider, falls back to
// "noop" (log only) so local development never needs an API key.
// ---------------------------------------------------------------------------
async function deliverSubscription(email: string): Promise<DeliveryResult> {
  if (process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID) {
    return deliverToResend(email);
  }
  if (process.env.LOOPS_API_KEY) {
    return deliverToLoops(email);
  }
  if (
    process.env.MAILCHIMP_API_KEY &&
    process.env.MAILCHIMP_LIST_ID &&
    process.env.MAILCHIMP_SERVER
  ) {
    return deliverToMailchimp(email);
  }
  if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
    return deliverToGoogleSheets(email);
  }

  // ---- Noop: dev fallback ----
  console.log("Newsletter Subscribe Signup:", email);
  return { success: true, provider: "noop" };
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------
// Each delivery function below is intentionally a stub that throws. Replace
// the throw with the real fetch when you wire the key. The shape — Promise of
// DeliveryResult — and the error codes are the only contract.
//
// Reference docs (verify before shipping):
//   Resend     https://resend.com/docs/api-reference/contacts/create-contact
//   Loops      https://loops.so/docs/api-reference/create-contact
//   Mailchimp  https://mailchimp.com/developer/marketing/api/list-members/add-member-to-list/
//   GAS Sheets https://developers.google.com/apps-script/guides/web

async function deliverToResend(email: string): Promise<DeliveryResult> {
  /*
  const res = await fetch(
    `https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    }
  );
  if (res.status === 409) return { success: false, error: "duplicate" };
  if (!res.ok) return { success: false, error: "upstream_error" };
  return { success: true, provider: "resend" };
  */
  void email; // suppress unused-arg lint until wired
  throw new Error("Resend integration: not yet implemented. See route.ts.");
}

async function deliverToLoops(email: string): Promise<DeliveryResult> {
  /*
  const res = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
    },
    body: JSON.stringify({ email, source: "aitech-tokyo" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body?.message === "Email already on list") {
      return { success: false, error: "duplicate" };
    }
    return { success: false, error: "upstream_error" };
  }
  return { success: true, provider: "loops" };
  */
  void email;
  throw new Error("Loops integration: not yet implemented. See route.ts.");
}

async function deliverToMailchimp(email: string): Promise<DeliveryResult> {
  /*
  const url = `https://${process.env.MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members`;
  const auth = Buffer.from(`anystring:${process.env.MAILCHIMP_API_KEY}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({ email_address: email, status: "subscribed" }),
  });
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    if (body?.title === "Member Exists") return { success: false, error: "duplicate" };
    return { success: false, error: "invalid_email" };
  }
  if (!res.ok) return { success: false, error: "upstream_error" };
  return { success: true, provider: "mailchimp" };
  */
  void email;
  throw new Error("Mailchimp integration: not yet implemented. See route.ts.");
}

async function deliverToGoogleSheets(email: string): Promise<DeliveryResult> {
  // The webhook URL is set by scripts/wire-up-sheets-newsletter.sh into the
  // Vercel env. Apps Script Web Apps always return HTTP 200; the logical
  // outcome is in the JSON body's `success` field. `redirect: "follow"` is
  // required because Apps Script bounces POSTs through script.googleusercontent.com.
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL!;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      body: JSON.stringify({
        email,
        source: "artemis-tokyo",
        userAgent: "next-api-subscribe"
      })
    });
  } catch (err) {
    console.error("[subscribe] sheets fetch failed:", err);
    return { success: false, error: "upstream_error" };
  }

  if (!res.ok) return { success: false, error: "upstream_error" };

  const body = (await res.json().catch(() => null)) as
    | { success?: boolean; error?: string; provider?: string }
    | null;
  if (!body || typeof body !== "object") {
    return { success: false, error: "upstream_error" };
  }
  if (body.success === true) {
    return { success: true, provider: "google-sheets" };
  }
  // Map Apps Script's logical errors back to our SubscribeError union
  const e = body.error;
  if (e === "duplicate") return { success: false, error: "duplicate" };
  if (e === "invalid_email") return { success: false, error: "invalid_email" };
  return { success: false, error: "upstream_error" };
}
