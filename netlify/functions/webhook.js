// /.netlify/functions/webhook
const Stripe = require("stripe");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// --- helpers ---
const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

const mapNameToISO = (name) => {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  const dict = {
    // najčešći slučajevi + tvoji testovi
    "croatia":"HRV","libya":"LBY","algeria":"DZA","russia":"RUS","russian federation":"RUS",
    "usa":"USA","united states":"USA","united states of america":"USA",
    "united kingdom":"GBR","uk":"GBR","england":"GBR","scotland":"GBR","wales":"GBR",
    "germany":"DEU","france":"FRA","italy":"ITA","spain":"ESP","poland":"POL",
    "brazil":"BRA","india":"IND","china":"CHN","japan":"JPN","canada":"CAN","australia":"AUS"
  };
  return dict[n] || null;
};

const normalizeISO = (iso, name) => {
  let z = (iso || "").toString().toUpperCase().slice(0,3);
  if (!/^[A-Z]{3}$/.test(z)) z = "";
  // ako je ISO prazan ili "očito kriv" u odnosu na naziv, probaj iz naziva
  if (!z || (name && z === "HRV" && name !== "Croatia")) {
    const fromName = mapNameToISO(name);
    if (fromName) z = fromName;
  }
  return z || "UNK";
};

const donorHash = (email, salt) => {
  const src = (email || "").toLowerCase().trim();
  return crypto.createHash("sha256").update(`${salt}::${src}`).digest("hex");
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    const sig = event.headers["stripe-signature"];
    const whsec = process.env.STRIPE_WEBHOOK_SECRET || "";
    const sk = process.env.STRIPE_SECRET_KEY || "";
    if (!sig || !whsec) {
      return { statusCode: 400, body: "Missing Stripe signature/secret" };
    }
    const stripe = new Stripe(sk, { apiVersion: "2025-08-27.basil" });

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

    // UZMI ISO + name iz metadata, ali NORMALIZIRAJ
    const name = meta.country_name || meta.name || "";
    const iso = normalizeISO(meta.country_iso, name);

    const row = {
      created_at: new Date().toISOString(),
      country_iso: iso,
      country_name: name || iso,
      amount_eur,
      ref: (meta.ref || null),
      donor_hash: donorHash(email, salt),
      stripe_pi: (session.payment_intent || session.id || "").toString()
    };

    // upis
    const { error } = await supa().from("payments").insert([row]);
    if (error) {
      console.error("Supabase insert error:", error.message);
      return { statusCode: 500, body: `supabase error: ${error.message}` };
    }

    console.info("Inserted payments row:", row.stripe_pi, row.donor_hash, row.country_iso, row.country_name, row.amount_eur);
    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("webhook error", e);
    return { statusCode: 500, body: `webhook error: ${e.message}` };
  }
};
