// GET /.netlify/functions/stats
// Agregira po zemlji: total_eur + donors_24h + donors_7d (ALL vrijeme)
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
      .limit(50000);

    if (error) throw error;

    const by = new Map();
    const now = Date.now();
    const since24 = now - 24*60*60*1000;
    const since7d = now - 7*24*60*60*1000;

    for (const r of (data||[])) {
      const iso = (r.country_iso || "UNK").toUpperCase().slice(0,3);
      const name = r.country_name || iso;
      const amt  = Number(r.amount_eur || 0);
      const ts   = new Date(r.created_at).getTime();
      const dh   = r.donor_hash || null;

      if (!by.has(iso)) by.set(iso, {
        iso, name, total_eur: 0,
        donors24: new Set(), donors7: new Set()
      });
      const o = by.get(iso);
      o.total_eur += amt;
      if (ts >= since7d && dh) o.donors7.add(dh);
      if (ts >= since24 && dh) o.donors24.add(dh);
    }

    const out = Array.from(by.values()).map(o => ({
      iso: o.iso,
      name: o.name,
      total_eur: Math.round(o.total_eur),
      donors_24h: o.donors24.size,
      donors_7d: o.donors7.size
    }))
    // default sortiranje za "Today’s heat": po donors_24h pa total
    .sort((a,b)=>{
      const d = (b.donors_24h||0) - (a.donors_24h||0);
      if (d !== 0) return d;
      return (b.total_eur||0) - (a.total_eur||0);
    });

    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 500, body: `Stats error: ${e.message}` };
  }
};
