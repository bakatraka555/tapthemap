// GET /.netlify/functions/diag?token=YOUR_TOKEN&iso=HRV&name=Croatia
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

function hash(salt, email, pi, ref) {
  return crypto.createHash("sha256").update(`${email||""}|${pi||""}|${ref||""}|${salt}`).digest("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const token = event.queryStringParameters?.token || "";
  if (!process.env.DEBUG_TOKEN || token !== process.env.DEBUG_TOKEN) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const iso  = (event.queryStringParameters?.iso  || "HRV").toUpperCase(); // <-- koristi postojeći ISO-3
  const name =  event.queryStringParameters?.name || "Croatia";

  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const ts = Date.now();
  const pi = `diagpi_${ts}`;
  const salt = process.env.REF_HASH_SALT || "fallback-salt";

  try {
    const { data, error } = await supa
      .from("payments")
      .insert([{
        country_iso: iso,
        country_name: name,
        amount_eur: 1,
        amount_cents: 100,
        currency: "EUR",
        ref: "diag",
        email:
