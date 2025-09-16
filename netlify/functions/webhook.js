import Stripe from "stripe";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function donorHash(customerId) {
  const salt = process.env.REF_HASH_SALT || "salt";
  return crypto.createHash("sha256").update(`${customerId}:${salt}`).digest("hex");
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) return { statusCode: 503, body: "Webhook not configured" };

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const sig = event.headers["stripe-signature"];
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64") : Buffer.from(event.body || "");

  let evt;
  try {
    evt = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Bad signature", err.message);
    return { statusCode: 400, body: "Bad signature" };
  }

  try {
    if (evt.type === "checkout.session.completed") {
      const s = evt.data.object;
      const pi = s.payment_intent;
      const md = s.metadata || {};
      const amount = Number(md.amount_cents || s.amount_total || 0);
      const country_iso = md.country_iso;
      const ref = md.ref || null;

      let customerId = s.customer;
      if (!customerId && typeof pi === "string") {
        const intent = await stripe.paymentIntents.retrieve(pi);
        customerId = intent.customer;
      }
      const dHash = donorHash(customerId || `anon-${pi}`);

      await supabase.from("payments").upsert({
        stripe_pi: String(pi),
        amount_cents: amount,
        currency: s.currency || "eur",
        country_iso,
        ref_code: ref,
        donor_hash: dHash,
        created_at: new Date().toISOString()
      }, { onConflict: "stripe_pi" });

      await supabase.rpc("upsert_country_stats", { p_country_iso: country_iso, p_amount: amount });
      await supabase.rpc("rebuild_donor_windows");
    }
    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("Webhook error", e);
    return { statusCode: 500, body: "Server error" };
  }
};
