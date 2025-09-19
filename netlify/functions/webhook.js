// /.netlify/functions/webhook
const Stripe = require("stripe");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

const MAP = {
  // već postojeći + proširenja
  "croatia": "HRV",
  "libya": "LBY",
  "algeria": "DZA",
  "russia": "RUS",
  "russian federation": "RUS",
  "usa": "USA",
  "united states": "USA",
  "united states of america": "USA",
  // NOVO:
  "saudi arabia": "SAU",
  "kingdom of saudi arabia": "SAU",
  "ksa": "SAU",
};

const isoFromName = (name) => {
  if (!name) return null;
  const k = name.trim().toLowerCase();
  return MAP[k] || null;
};

const normalizeISO = (iso, name) => {
  let z = (iso || "").toUpperCase().slice(0, 3);
  if (!/^[A-Z]{3}$/.test(z)) z = "";
  // ako je HRV a ime NIJE Croatia – pokušaj iz imena
  if (!z || (z === "HRV" && name && name.trim() !== "Croatia")) {
    const guess = isoFromName(name);
    if (guess) z = guess;
  }
  return z || "UNK";
};

const donorHash = (email, salt) =>
  crypto.createHash("sha256").update(`${salt}::${(email || "").toLowerCase().trim()}`).digest("hex");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const sig = event.headers["stripe-signature"];
    const whsec = process.env.STRIPE_WEBHOOK_SECRET || "";
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

    let evt;
    try {
      evt = stripe.webhooks.constructEvent(event.body, sig, whsec);
    } catch (err) {
      return { statusCode: 400, body: `Signature error: ${err.message}` };
    }

    if (evt.type !== "checkout.session.completed") {
      return { statusCode: 200, body: "ignored" };
    }

    const session = evt.data.object;
    const meta = session.metadata || {};
    const amountCents = Number(session.amount_total || 0);
    const amount_eur = Math.round(amountCents / 100);
    const email = session.customer_details?.email || session.customer_email || "";
    const salt = process.env.REF_HASH_SALT || "tapthemap_default_salt";

    const name = meta.country_name || meta.name || "";
    const iso = normalizeISO(meta.country_iso, name);

    const row = {
      created_at: new Date().toISOString(),
      country_iso: iso,
      country_name: name || iso,
      amount_eur,
      ref: meta.ref || null,
      donor_hash: donorHash(email, salt),
      stripe_pi: (session.payment_intent || session.id || "").toString()
    };

    const { error } = await supa().from("payments").insert([row]);
    if (error) return { statusCode: 500, body: `supabase error: ${error.message}` };

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    return { statusCode: 500, body: `webhook error: ${e.message}` };
  }
};
