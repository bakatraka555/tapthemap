// POST /.netlify/functions/webhook  (Stripe → Supabase, table: payments)
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

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

  // Zanimaju nas završene Checkout sesije
  if (evt.type === "checkout.session.completed") {
    const s = evt.data.object;

    const rec = {
      country_iso:        s.metadata?.country_iso || "UNK",
      country_name:       s.metadata?.country_name || "Unknown",
      amount_eur:         (s.amount_total || 0) / 100,
      currency:           (s.currency || "eur").toUpperCase(),
      ref:                s.metadata?.ref || null,
      email:              s.customer_details?.email || null,
      stripe_session_id:  s.id
    };

    try {
      const { error } = await supa().from("payments").insert([rec]);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase insert error:", e.message);
      // vraćamo 200 da Stripe ne ponavlja unedogled
    }
  }

  return { statusCode: 200, body: "ok" };
};
