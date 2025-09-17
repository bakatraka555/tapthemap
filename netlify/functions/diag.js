// GET /.netlify/functions/diag?token=YOUR_TOKEN&iso=HRV&name=Croatia
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const qs = event.queryStringParameters || {};
  const token = qs.token || "";
  if (!process.env.DEBUG_TOKEN || token !== process.env.DEBUG_TOKEN) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  // Koristi ISO koji već postoji u tvojoj referentnoj tablici (npr. HRV)
  const countryIso  = (qs.iso  || "HRV").toUpperCase();
  const countryName =  qs.name || "Croatia";

  const supa = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const ts = Date.now();
  const stripe_pi = `diagpi_${ts}`;
  const email = null;       // test unos, ne koristimo email
  const ref   = "diag";
  const salt  = process.env.REF_HASH_SALT || "fallback-salt";
  const donor_hash = crypto
    .createHash("sha256")
    .update(`${email || ""}|${stripe_pi}|${ref}|${salt}`)
    .digest("hex");

  try {
    const { data, error } = await supa
      .from("payments")
      .insert([{
        country_iso:       countryIso,
        country_name:      countryName,
        amount_eur:        1,
        amount_cents:      100,
        currency:          "EUR",
        ref:               ref,
        email:             email,
        stripe_session_id: `diag_${ts}`,
        stripe_pi:         stripe_pi,
        donor_hash:        donor_hash
      }])
      .select()
      .single();

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ ok: true, id: data.id }) };
  } catch (e) {
    return { statusCode: 500, body: `supabase error: ${e.message}` };
  }
};
