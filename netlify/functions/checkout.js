// netlify/functions/checkout.js
const Stripe = require("stripe");

exports.handler = async (event) => {
  try {
    // (opcionalno) preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: ""
      };
    }

    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // 1) Sigurno parsiranje bodyja
    let body = {};
    try {
      body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
    } catch (e) {
      return { statusCode: 400, body: "Invalid JSON" };
    }

    // 2) Polja iz bodyja
    const country_iso = (body.country_iso || "").toString().toUpperCase().slice(0, 3);
    const country_name = (body.country_name || "").toString().trim() || country_iso || "TapTheMap";
    const ref    = (body.ref || "").toString().slice(0, 64);
    const handle = (body.handle || "").toString().slice(0, 64);
    
    // Izdvoji influencer_ref iz ref parametra (ukloni ?ref= prefix)
    const influencer_ref = ref.replace(/^\?ref=/, '').replace(/^ref=/, '').trim();

    // 3) UZMI IZNOS iz više mogućih ključeva: amount, amount_eur, amt, value
    const candidates = [body.amount, body.amount_eur, body.amt, body.value];
    let amountEur = 0;
    for (const c of candidates) {
      if (c === undefined || c === null) continue;
      const n = Number(String(c).replace(/[^\d.]/g, "")); // prihvati "100", "100€", " 100 "
      if (Number.isFinite(n) && n > 0) { amountEur = n; break; }
    }
    if (!amountEur) {
      return { statusCode: 400, body: "Amount missing or invalid" };
    }

    // 4) Pretvori u cente (min 1 €)
    const amountCents = Math.max(100, Math.round(amountEur * 100));

    // 5) Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY /* , { apiVersion: '2024-06-20' } */);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "link"], // možeš ostaviti samo "card" ako želiš
      currency: "eur",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              // prikaz samo imena države (bez ISO sufiksa)
              name: country_name || country_iso || "TapTheMap",
              metadata: { country_iso }
            }
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.SITE_BASE_URL || "https://tapthemap.world"}/?paid=1`,
      cancel_url:  `${process.env.SITE_BASE_URL || "https://tapthemap.world"}/?cancel=1`,
      metadata: { 
        country_iso, 
        country_name, 
        ref, 
        handle, 
        amount_eur: String(amountEur),
        influencer_ref: influencer_ref,  // Ispravljen influencer_ref
        commission_rate: "0.25"  // Dodaj commission_rate
      }
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ id: session.id, url: session.url })
    };
  } catch (e) {
    console.error("Checkout error:", e);
    return { statusCode: 500, body: `Checkout error: ${e.message}` };
  }
};
