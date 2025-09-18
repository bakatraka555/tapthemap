// GET /.netlify/functions/last  → vrati zadnjih ~20 uplata iz payments
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_PUBLIC, {
    auth: { persistSession: false }
  });

exports.handler = async () => {
  try {
    const { data, error } = await supa()
      .from("payments")
      .select("created_at,country_iso,country_name,amount_eur,ref,stripe_pi")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify(data || []) };
  } catch (e) {
    return { statusCode: 500, body: `last error: ${e.message}` };
  }
};
