const { createClient } = require("@supabase/supabase-js");

exports.handler = async () => {
  try {
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
    // Povuci sve potrebne kolone (zadnjih 180 dana da ne preplavimo RAM)
    const since = new Date(Date.now() - 180*24*3600*1000).toISOString();
    const { data, error } = await supa
      .from("payments")
      .select("country_iso, country_name, amount_eur, donor_hash, created_at")
      .gte("created_at", since);

    if (error) throw error;

    const now = Date.now(), t24 = now - 24*3600*1000, t7d = now - 7*24*3600*1000;
    const map = new Map(); // ISO3 -> bucket

    for (const r of data || []) {
      const iso = (r.country_iso || "").toUpperCase();
      if (!iso) continue;
      const name = r.country_name || iso;
      const amt = Number(r.amount_eur || 0);
      if (!(amt > 0)) continue;

      if (!map.has(iso)) map.set(iso, { iso, name, total:0, s24:new Set(), s7:new Set() });
      const b = map.get(iso);
      b.name = name;
      b.total += amt;

      const ts = r.created_at ? new Date(r.created_at).getTime() : 0;
      const dh = (r.donor_hash || "").trim();
      if (dh) {
        if (ts >= t24) b.s24.add(dh);
        if (ts >= t7d) b.s7.add(dh);
      }
    }

    const out = Array.from(map.values()).map(b => ({
      iso: b.iso,
      name: b.name,
      total_eur: Math.round(b.total),
      donors_24h: b.s24.size,
      donors_7d: b.s7.size
    })).sort((a,b) => b.total_eur - a.total_eur);

    return { statusCode: 200,
      headers: { "content-type":"application/json", "cache-control":"no-store" },
      body: JSON.stringify(out)
    };
  } catch (e) {
    return { statusCode: 500, body: `stats error: ${e.message}` };
  }
};
