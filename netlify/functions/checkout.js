// netlify/functions/checkout.js
const Stripe = require("stripe");
const { createRateLimiter } = require("./utils/rateLimit");
const { createLogger } = require("./utils/logger");

// Rate limiter: 50 requests per minute per IP (stricter for payments)
const rateLimiter = createRateLimiter({
  maxRequests: 50,
  windowMs: 60000, // 1 minute
});

exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || Date.now().toString();
  const log = createLogger({ function: "checkout", requestId });

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
      log.warn("Invalid HTTP method", { method: event.httpMethod });
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Rate limiting
    const rateLimitResult = rateLimiter(event);
    if (rateLimitResult) {
      log.warn("Rate limit exceeded", { ip: event.headers['x-forwarded-for'] });
      return rateLimitResult;
    }

    // 1) Sigurno parsiranje bodyja
    let body = {};
    try {
      body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
    } catch (e) {
      log.warn("Invalid JSON in request body", { error: e.message });
      return { statusCode: 400, body: "Invalid JSON" };
    }

    log.info("Checkout request received", {
      country_iso: body.country_iso,
      amount: body.amount || body.amount_eur,
    });

    // 2) Polja iz bodyja
    const country_iso = (body.country_iso || "").toString().toUpperCase().slice(0, 3);
    const country_name = (body.country_name || "").toString().trim() || country_iso || "TapTheMap";
    const ref    = (body.ref || "").toString().slice(0, 64);
    const handle = (body.handle || "").toString().slice(0, 64);

    // 3) UZMI IZNOS iz više mogućih ključeva: amount, amount_eur, amt, value
    const candidates = [body.amount, body.amount_eur, body.amt, body.value];
    let amountEur = 0;
    for (const c of candidates) {
      if (c === undefined || c === null) continue;
      const n = Number(String(c).replace(/[^\d.]/g, "")); // prihvati "100", "100€", " 100 "
      if (Number.isFinite(n) && n > 0) { amountEur = n; break; }
    }
    if (!amountEur) {
      log.warn("Amount missing or invalid", { body });
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Amount missing or invalid",
          requestId,
        }),
      };
    }

    // 4) Pretvori u cente (min 1 €)
    const amountCents = Math.max(100, Math.round(amountEur * 100));
    log.debug("Amount calculated", { amountEur, amountCents });

    // 5) Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY /* , { apiVersion: '2024-06-20' } */);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "link", "paypal"], // dodao PayPal
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
      success_url: `${process.env.SITE_BASE_URL || "https://tapthemap.world"}/?payment=success&amount=${amountEur}&country=${encodeURIComponent(country_name)}&captain=${encodeURIComponent(ref || '')}`,
      cancel_url:  `${process.env.SITE_BASE_URL || "https://tapthemap.world"}/?cancel=1`,
      metadata: { 
        country_iso, 
        country_name, 
        ref, 
        handle, 
        amount_eur: String(amountEur),
        influencer_ref: ref,  // Dodaj influencer_ref
        commission_rate: "0.25"  // Dodaj commission_rate
      }
    });

    log.info("Checkout session created", {
      sessionId: session.id,
      amount: amountCents,
      country_iso,
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: session.id, url: session.url })
    };
  } catch (e) {
    log.error("Checkout error", e);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Checkout error",
        message: e.message,
        requestId,
      }),
    };
  }
};
