// /.netlify/functions/checkout
const Stripe = require("stripe");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const {
      country_iso = "",
      country_name = "",
      amount_eur = 5,
      ref = "",
      handle = ""
    } = JSON.parse(event.body || "{}");

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil"
    });

    const amountCents = Math.max(100, Math.round(Number(amount_eur) * 100));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            // prikaz samo imena države (bez ISO sufiksa)
            product_data: { name: country_name || country_iso || "TapTheMap" },
            unit_amount: amountCents
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.SITE_BASE_URL}/?paid=1`,
      cancel_url: `${process.env.SITE_BASE_URL}/?cancel=1`,
      metadata: {
        country_iso,
        country_name,
        ref,
        handle
      }
    });

    return { statusCode: 200, body: JSON.stringify({ id: session.id, url: session.url }) };
  } catch (e) {
    return { statusCode: 500, body: `Checkout error: ${e.message}` };
  }
};
