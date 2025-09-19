// GET /.netlify/functions/sums
// Vraća agregate po country_iso: total_eur (ALL) i total_24h
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_PUBLIC, {
    auth: { persistSession: false }
  });

exports.handler = async () => {
  try {
    const { data, error } = await supa()
      .from("payments")
      .select("country_iso,country_name,amount_eur,donor_hash,created_at")
      .order("created_at", { ascending: false })
      .limit(50000); // safety cap

    if (error) throw error;

    const by = new Map(); // iso -> { iso,name,total_eur,total_24h, donors_24h }
    const since24 = Date.now() - 24*60*60*1000;

    for (const r of (data||[])) {
      const iso = (r.country_iso || "UNK").toUpperCase().slice(0,3);
      const name = r.country_name || iso;
      const amt = Number(r.amount_eur || 0);
      const ts = new Date(r.created_at).getTime();

      if (!by.has(iso)) by.set(iso, { iso, name, total_eur: 0, total_24h: 0, donors_24h: new Set() });
      const o = by.get(iso);
      o.total_eur += amt;
      if (ts >= since24) {
        o.total_24h += amt;
        if (r.donor_hash) o.donors_24h.add(r.donor_hash);
      }
    }

    const out = Array.from(by.values()).map(o => ({
      iso: o.iso, name: o.name,
      total_eur: Math.round(o.total_eur),
      total_24h: Math.round(o.total_24h),
      donors_24h: o.donors_24h.size
    })).sort((a,b)=> b.total_eur - a.total_eur);

    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 500, body: `sums error: ${e.message}` };
  }
};
