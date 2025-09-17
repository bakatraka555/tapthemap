// POST /.netlify/functions/webhook  (Stripe → Supabase, table: payments)
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key    = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return { statusCode: 503, body: "Webhook not configured" };

  const stripe = Stripe(key);

  const sig = event.headers["stripe-signature"];
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  let evt;
  try {
    evt = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    console.error("Stripe signature error:", e.message);
    return { statusCode: 400, body: `Signature error: ${e.message}` };
  }

  const upsert = async (rec) => {
    try {
      const { error } = await supa().from("payments").insert([rec]);
      if (error) throw error;
      console.log("Inserted payments row:", rec.stripe_pi);
    } catch (e) {
      console.error("Supabase insert error:", e.message, rec);
    }
  };

  // Checkout session done — ima amount_total (u centima)
  if (evt.type === "checkout.session.completed") {
    const s = evt.data.object;

    const piId =
      typeof s.payment_intent === "string"
        ? s.payment_intent
        : s.payment_intent?.id || null;

    const amount_cents = s.amount_total || 0;

    const rec = {
      country_iso:       s.metadata?.country_iso || "UNK",
      country_name:      s.metadata?.country_name || "Unknown",
      amount_eur:        (amount_cents / 100),
      amount_cents:      amount_cents,
      currency:          (s.currency || "eur").toUpperCase(),
      ref:               s.metadata?.ref || null,
      email:             s.customer_details?.email || null,
      stripe_session_id: s.id,
      stripe_pi:         piId || `sess_${s.id}`
    };
    await upsert(rec);
  }

  // Fallback ako šalješ i payment_intent.succeeded
  if (evt.type === "payment_intent.succeeded") {
    const pi = evt.data.object;
    const md = pi.metadata || {};
    const amount_cents = pi.amount_received || pi.amount || 0;

    const rec = {
      country_iso:       (md.country_iso || "UNK").toUpperCase(),
      country_name:      md.country_name || "Unknown",
      amount_eur:        (amount_cents / 100),
      amount_cents:      amount_cents,
      currency:          (pi.currency || "eur").toUpperCase(),
      ref:               md.ref || null,
      email:             null,
      stripe_session_id: md.session_id || `pi_${pi.id}`,
      stripe_pi:         pi.id
    };
    await upsert(rec);
  }

  return { statusCode: 200, body: "ok" };
};
