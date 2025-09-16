import Stripe from "stripe";
export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  if (!process.env.STRIPE_SECRET_KEY) return { statusCode: 503, body: "Stripe not configured" };

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  try {
    const { country_iso, country_name, amount, ref } = JSON.parse(event.body || "{}");
    if (!country_iso || !country_name || !amount) return { statusCode: 400, body: "Missing fields" };

    const unitAmount = Math.max(1, Math.round(Number(amount) * 100));
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "link"],
      line_items: [{ price_data: { currency: "eur", unit_amount: unitAmount, product_data: { name: `TapTheMap · ${country_name}` } }, quantity: 1 }],
      success_url: `${process.env.SITE_BASE_URL}/?status=success`,
      cancel_url: `${process.env.SITE_BASE_URL}/?status=cancel`,
      metadata: { country_iso, country_name, amount_cents: String(unitAmount), ref: ref || "" }
    });

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: session.url }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "Checkout error" };
  }
};
