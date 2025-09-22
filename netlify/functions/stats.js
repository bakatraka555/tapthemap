// /.netlify/functions/stats
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

exports.handler = async () => {
  try {
    // povuci sve potrebne kolone (bez limitiranja)
    const { data, error } = await supa()
      .from("payments")
      .select("country_iso, country_name, amount_eur, donor_hash, created_at");

    if (error) throw error;

    const now = Date.now();
    const t24 = now - 24 * 3600 * 1000;
    const t7d = now - 7 * 24 * 3600 * 1000;

    // agregacije po ISO3
    const byIso = new Map(); // { total, name, donors24:Set, donors7:Set }
    for (const r of data || []) {
      const iso = (r.country_iso || "").toUpperCase();
      if (!iso) continue;
      const name = r.country_name || iso;

      if (!byIso.has(iso)) {
        byIso.set(iso, {
          iso,
          name,
          total_eur: 0,
          set24: new Set(),
          set7: new Set(),
        });
      }
      const bucket = byIso.get(iso);
      bucket.name = name; // zadnje ime je ok

      const amt = Number(r.amount_eur || 0);
      if (!isNaN(amt)) bucket.total_eur += amt;

      const ts = r.created_at ? new Date(r.created_at).getTime() : 0;
      const dh = (r.donor_hash || "").trim();
      if (dh) {
        if (ts >= t24) bucket.set24.add(dh);
        if (ts >= t7d) bucket.set7.add(dh);
      }
    }

    const out = Array.from(byIso.values())
      .map((b) => ({
        iso: b.iso,
        name: b.name,
        total_eur: Math.round(b.total_eur),
        donors_24h: b.set24.size,
        donors_7d: b.set7.size,
      }))
      .sort((a, b) => b.total_eur - a.total_eur);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(out),
    };
  } catch (e) {
    return { statusCode: 500, body: `stats error: ${e.message}` };
  }
};
