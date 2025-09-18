// /.netlify/functions/checkout
// Kreira Stripe Checkout Session (TEST ili LIVE prema STRIPE_SECRET_KEY)
// ENV: STRIPE_SECRET_KEY, SITE_BASE_URL
const Stripe = require("stripe");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // ---- ENV check
    const sk = process.env.STRIPE_SECRET_KEY || "";
    const siteBase = (process.env.SITE_BASE_URL || "").replace(/\/+$/, ""); // bez završnog /
    if (!sk || !sk.startsWith("sk_")) {
      // 503 = “not configured” -> frontend će prikazati user-friendly poruku
      return { statusCode: 503, body: "Stripe not configured (missing STRIPE_SECRET_KEY)" };
    }
    if (!siteBase || !/^https:\/\/.+/i.test(siteBase)) {
      return { statusCode: 500, body: "SITE_BASE_URL missing or invalid (must be https://…)" };
    }

    const stripe = new Stripe(sk, { apiVersion: "2025-08-27.basil" });

    // ---- Body
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch {}
    const iso  = ((body.country_iso || "").toString().toUpperCase()).slice(0,3) || "UNK";
    const name = (body.country_name || iso).toString().slice(0,80);
    const ref  = (body.ref || "").toString().replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,32);
    let amount = parseInt(body.amount, 10);

    if (!Number.isFinite(amount)) amount = 0;
    amount = Math.max(1, Math.min(100000, amount)); // 1..100000 EUR
    const amountCents = amount * 100;

    // ---- Session create
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "link"],
      allow_promotion_codes: false,
      line_items: [{
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name: `TapTheMap — ${name} (${iso})`,
            description: ref ? `Captain: @${ref}` : undefined
          }
        },
        quantity: 1
      }],
      metadata: { country_iso: iso, country_name: name, ref },
      success_url: `${siteBase}/?ok=1&c=${encodeURIComponent(iso)}`,
      cancel_url: `${siteBase}/?canceled=1`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };

  } catch (err) {
    // vrati jasan tekst u response da ga frontend prikaže
    const msg = (err && err.message) ? err.message : "Unknown checkout error";
    return { statusCode: 500, body: `Checkout error: ${msg}` };
  }
};
