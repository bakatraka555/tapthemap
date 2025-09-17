// GET /.netlify/functions/diag?token=YOUR_TOKEN  → testni upis u payments
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

function h(s) {
  const salt = process.env.REF_HASH_SALT || "fallback-salt";
  return crypto.createHash("sha256").update(`${s}|${salt}`).digest("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const token = event.queryStringParameters?.token || "";
  if (!process.env.DEBUG_TOKEN || token !== process.env.DEBUG_TOKEN) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const ts = Date.now();
  try {
    const { data, error } = await supa
      .from("payments")
      .insert([{
        country_iso: "ZZZ",
        country_name: "Debugland",
        amount_eur: 1,
        amount_cents: 100,
        currency: "EUR",
        ref: "diag",
        email: null,
        stripe_session_id: `diag_${ts}`,
        stripe_pi: `diagpi_${ts}`,
        donor_hash: h(`diag_${ts}`)
      }])
      .select()
      .single();

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ ok: true, id: data.id }) };
  } catch (e) {
    return { statusCode: 500, body: `supabase error: ${e.message}` };
  }
};
