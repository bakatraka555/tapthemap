// GET /.netlify/functions/stats  → agregati iz tablice payments
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_PUBLIC, {
    auth: { persistSession: false }
  });

exports.handler = async () => {
  try {
    const since24 = new Date(Date.now() - 24*60*60*1000).toISOString();
    const since7  = new Date(Date.now() - 7*24*60*60*1000).toISOString();

    const { data, error } = await supa()
      .from("payments")
      .select("country_iso,country_name,amount_eur,created_at")
      .limit(10000);

    if (error) throw error;

    const bucket = new Map();
    for (const r of (data || [])) {
      const iso  = r.country_iso || "UNK";
      const name = r.country_name || iso;
      if (!bucket.has(iso)) bucket.set(iso, { iso, name, total_eur: 0, donors_24h: 0, donors_7d: 0 });
      const row = bucket.get(iso);

      row.total_eur += Number(r.amount_eur || 0);
      if (r.created_at >= since24) row.donors_24h += 1;
      if (r.created_at >= since7)  row.donors_7d  += 1;
    }

    const out = Array.from(bucket.values())
      .sort((a,b)=> b.total_eur - a.total_eur)
      .map(r => ({ ...r, total_eur: r.total_eur.toFixed(0) }));

    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 500, body: `Stats error: ${e.message}` };
  }
};
