// GET /.netlify/functions/diag?token=YOUR_TOKEN  → testni upis u payments
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const token = event.queryStringParameters?.token || "";
  if (!process.env.DEBUG_TOKEN || token !== process.env.DEBUG_TOKEN) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    const { data, error } = await supa
      .from("payments")
      .insert([{
        country_iso: "ZZZ",
        country_name: "Debugland",
        amount_eur: 1,
        currency: "EUR",
        ref: "diag",
        email: null,
        stripe_session_id: `diag_${Date.now()}`,
        stripe_pi: `diagpi_${Date.now()}`
      }])
      .select()
      .single();

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ ok: true, id: data.id }) };
  } catch (e) {
    return { statusCode: 500, body: `supabase error: ${e.message}` };
  }
};
