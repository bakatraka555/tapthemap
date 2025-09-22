// /.netlify/functions/leaders
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

function parseWindow(s = "7d") {
  // prihvaća "24h", "7d", "30d" …
  const m = String(s).match(/^(\d+)(h|d)$/i);
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = Number(m[1]);
  return m[2].toLowerCase() === "h" ? n * 3600 * 1000 : n * 24 * 3600 * 1000;
}

exports.handler = async (event) => {
  try {
    const qs = new URLSearchParams(event.rawQuery || event.queryStringParameters || "");
    const winMs = parseWindow(qs.get("window") || "7d");
    const limit = Math.min(50, Math.max(1, Number(qs.get("limit") || 10)));
    const since = new Date(Date.now() - winMs).toISOString();

    // Uzmi samo retke s ispunjenim ref-om u zadnjem prozoru
    const { data, error } = await supa()
      .from("payments")
      .select("ref, donor_hash, amount_eur, country_name, created_at")
      .gt("created_at", since)
      .not("ref", "is", null)
      .neq("ref", "");

    if (error) throw error;

    // Grupiraj u memoriji
    const map = new Map(); // ref => { total, donors:Set, countries:Set }
    for (const r of data || []) {
      const ref = (r.ref || "").trim();
      if (!ref) continue;

      if (!map.has(ref))
        map.set(ref, { total: 0, donors: new Set(), countries: new Set() });

      const bucket = map.get(ref);
      const amt = Number(r.amount_eur || 0);
      if (!isNaN(amt)) bucket.total += amt;

      const dh = (r.donor_hash || "").trim();
      if (dh) bucket.donors.add(dh);

      const cname = (r.country_name || "").trim();
      if (cname) bucket.countries.add(cname);
    }

    const out = Array.from(map.entries())
      .map(([ref, b]) => ({
        ref,
        donors_unique: b.donors.size,
        total_eur: Math.round(b.total),
        countries: Array.from(b.countries),
      }))
      .sort((a, b) =>
        b.donors_unique !== a.donors_unique
          ? b.donors_unique - a.donors_unique
          : b.total_eur - a.total_eur
      )
      .slice(0, limit);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ by_ref: out }),
    };
  } catch (e) {
    return { statusCode: 500, body: `leaders error: ${e.message}` };
  }
};
