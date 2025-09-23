import Stripe from 'stripe';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    console.log('Checkout received:', body);
    
    const {
      amount_cents,
      country_iso,
      country_name,
      ref,
      email
    } = body;

    console.log('Parsed values:', { amount_cents, country_iso, country_name, ref, email });

    if (!amount_cents || amount_cents < 100) {
      console.log('Amount validation failed:', { amount_cents, min: 100 });
      return { statusCode: 400, body: `amount_cents must be >= 100, received: ${amount_cents}` };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const successUrl = `${process.env.SITE_BASE_URL || ''}/?success=true`;
    const cancelUrl  = `${process.env.SITE_BASE_URL || ''}/?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: 'TapTheMap Donation' },
          unit_amount: amount_cents
        },
        quantity: 1
      }],
      metadata: {
        country_iso: country_iso || '',
        country_name: country_name || '',
        ref: ref || ''
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id, url: session.url })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message || 'Internal Error' };
  }
};
