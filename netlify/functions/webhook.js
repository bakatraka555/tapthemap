// netlify/functions/webhook.js
const Stripe = require("stripe");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

const MAP = {
  croatia: "HRV",
  libya: "LBY",
  algeria: "DZA",
  russia: "RUS",
  "russian federation": "RUS",
  usa: "USA",
  "united states": "USA",
  "united states of america": "USA",
  finland: "FIN",
  colombia: "COL",
  "saudi arabia": "SAU",
  "kingdom of saudi arabia": "SAU",
  ksa: "SAU",
};

const isoFromName = (name) => {
  if (!name) return null;
  const k = name.trim().toLowerCase();
  return MAP[k] || null;
};

const normalizeISO = (iso, name) => {
  let z = (iso || "").toUpperCase().slice(0, 3);
  if (!/^[A-Z]{3}$/.test(z)) z = "";
  if (!z && name) {
    const guess = isoFromName(name);
    if (guess) z = guess;
  }
  return z || "UNK";
};

const donorHash = (idLike, salt) =>
  crypto.createHash("sha256").update(`${salt}::${(idLike || "").toLowerCase().trim()}`).digest("hex");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const sig = event.headers["stripe-signature"];
    const whsec = process.env.STRIPE_WEBHOOK_SECRET || "";
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let evt;
    try {
      evt = stripe.webhooks.constructEvent(event.body, sig, whsec);
    } catch (err) {
      console.warn("WEBHOOK signature error:", err.message);
      return { statusCode: 400, body: `Signature error: ${err.message}` };
    }

    if (evt.type !== "checkout.session.completed") {
      return { statusCode: 200, body: "ignored" };
    }

    const session = evt.data.object;
    const meta = session.metadata || {};

    const amountCents = Number(session.amount_total || 0);
    if (!amountCents || amountCents < 100) {
      console.warn("WEBHOOK: low amount_total, skip", { amountCents });
      return { statusCode: 200, body: "skip: amount_total" };
    }
    const amount_eur = Math.round(amountCents / 100);

    const email = session.customer_details?.email || session.customer_email || "";
    const pseudoId = email || session.customer || session.id || "";
    const salt = process.env.REF_HASH_SALT || "tapthemap_default_salt";

    const country_name = meta.country_name || meta.name || "";
    const country_iso = normalizeISO(meta.country_iso, country_name);

    if (country_iso === "UNK") {
      console.warn("WEBHOOK: unknown ISO, skip", { meta, country_name });
      return { statusCode: 200, body: "skip: unknown iso" };
    }

    const row = {
      created_at: new Date().toISOString(),
      country_iso,
      country_name: country_name || country_iso,
      amount_eur,
      ref: meta.ref || null,
      donor_hash: donorHash(pseudoId, salt),
      stripe_pi: String(session.payment_intent || session.id || ""),
    };

    const { error } = await supa()
      .from("payments")
      .upsert(row, { onConflict: "stripe_pi", ignoreDuplicates: true });

    if (error) {
      console.error("WEBHOOK supabase error:", error.message);
      return { statusCode: 500, body: `supabase error: ${error.message}` };
    }

    console.info("WEBHOOK inserted", { iso: row.country_iso, eur: row.amount_eur, pi: row.stripe_pi });
    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("WEBHOOK fatal error:", e.message);
    return { statusCode: 500, body: `webhook error: ${e.message}` };
  }
};
