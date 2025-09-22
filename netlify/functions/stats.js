// /.netlify/functions/stats
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

exports.handler = async () => {
  try {
    const db = supa();

    // 1) Pokušaj dohvatiti sve države (ako postoji tablica countries)
    let countriesMap = {};
    {
      const { data: countries, error } = await db
        .from("countries")
        .select("iso3,name");
      if (!error && countries) {
        for (const c of countries) {
          if (c.iso3) countriesMap[c.iso3.toUpperCase()] = c.name;
        }
      }
    }

    // 2) Dohvati uplate (zadnjih 90 dana – promijeni po želji)
    const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: pays, error: pErr } = await db
      .from("payments")
      .select("country_iso,country_name,amount_eur,donor_hash,created_at")
      .gte("created_at", since90d)
      .order("created_at", { ascending: false });

    if (pErr) {
      return { statusCode: 500, body: `supabase error: ${pErr.message}` };
    }

    // 3) Agregacija u JS-u (radi i bez countries tablice)
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const byIso = new Map(); // iso -> { sum, set24, set7, name }

    for (const p of pays || []) {
      const iso = (p.country_iso || "").toUpperCase() || "UNK";
      const name =
        countriesMap[iso] ||
        p.country_name ||
        iso;

      if (!byIso.has(iso)) {
        byIso.set(iso, {
          name,
          sum: 0,
          donors24: new Set(),
          donors7: new Set(),
        });
      }
      const bucket = byIso.get(iso);
      const amt = Number(p.amount_eur || 0);
      bucket.sum += amt;

      const t = new Date(p.created_at).getTime();
      const dh = (p.donor_hash || "").trim();

      if (now - t <= DAY) {
        if (dh) bucket.donors24.add(dh);
      }
      if (now - t <= 7 * DAY) {
        if (dh) bucket.donors7.add(dh);
      }
    }

    // 4) U izlaz
    const out = [];
    for (const [iso, v] of byIso.entries()) {
      if (v.sum <= 0) continue;
      out.push({
        iso,
        name: v.name,
        total_eur: Math.round(v.sum),
        donors_24h: v.donors24.size,
        donors_7d: v.donors7.size,
      });
    }

    // Sortiraj po iznosu pa po 7d donorima
    out.sort((a, b) => (b.total_eur - a.total_eur) || (b.donors_7d - a.donors_7d));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(out),
    };
  } catch (e) {
    return { statusCode: 500, body: `stats error: ${e.message}` };
  }
};
