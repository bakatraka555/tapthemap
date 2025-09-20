// netlify/functions/checkout.js
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: cors(), body: "" };
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    let body = {};
    try { body = typeof event.body === "string" ? JSON.parse(event.body||"{}") : (event.body||{}); }
    catch { return { statusCode: 400, body: "Invalid JSON" }; }

    const iso  = (body.country_iso || "").toString().toUpperCase().slice(0,3);
    const name = (body.country_name || "").toString().trim() || iso || "TapTheMap";
    const ref  = (body.ref || "").toString().slice(0,64);
    const handle = (body.handle || "").toString().slice(0,64);

    // prihvati amount ili amount_eur
    const raw = body.amount ?? body.amount_eur;
    if (raw === undefined || raw === null) return { statusCode: 400, body: "Amount missing" };
    const eur = Number(String(raw).replace(/[^\d.]/g,""));
    if (!Number.isFinite(eur) || eur < 2) return { statusCode: 400, body: "Amount invalid" };

    const cents = Math.round(eur * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      payment_method_types: ["card", "link"],
      line_items: [{
        price_data: {
          currency: "eur",
          unit_amount: cents,
          product_data: { name: name || iso, metadata: { country_iso: iso } }
        },
        quantity: 1
      }],
      success_url: `${process.env.SITE_BASE_URL || 'https://tapthemap.world'}?paid=1`,
      cancel_url:  `${process.env.SITE_BASE_URL || 'https://tapthemap.world'}?cancel=1`,
      metadata: { country_iso: iso, country_name: name, amount_eur: String(eur), ref, handle }
    });

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ id: session.id, url: session.url }) };
  } catch (e) {
    console.error("Checkout error:", e);
    return { statusCode: 500, body: `Checkout error: ${e.message}` };
  }
};

function cors(){
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
