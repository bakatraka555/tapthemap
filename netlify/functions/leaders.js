// GET /.netlify/functions/leaders?window=24h|7d|all&limit=20&country_iso=HRV
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_PUBLIC, {
    auth: { persistSession: false }
  });

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const windowOpt = (q.window || "24h").toLowerCase(); // 24h | 7d | all
    const limit = Math.min(100, Math.max(1, parseInt(q.limit || "20", 10)));
    const countryFilter = (q.country_iso || "").toUpperCase().slice(0,3);

    let since = null;
    if (windowOpt === "24h") since = new Date(Date.now() - 24*60*60*1000).toISOString();
    if (windowOpt === "7d")  since = new Date(Date.now() - 7*24*60*60*1000).toISOString();
    // "all" => since = null

    // minimalni set kolona za agregaciju
    let query = supa()
      .from("payments")
      .select("country_iso,country_name,amount_eur,donor_hash,ref,created_at")
      .order("created_at", { ascending: false })
      .limit(20000); // safety cap

    if (since) query = query.gte("created_at", since);
    if (countryFilter) query = query.eq("country_iso", countryFilter);

    const { data, error } = await query;
    if (error) throw error;

    // --- agregacija ---
    const byCountry = new Map(); // iso -> { iso,name,total,donors_24h/7d, donors_unique }
    const byRef     = new Map(); // ref -> { ref,total,donors_unique, countries:Set, last_at }

    const uniqByCountry = new Map(); // iso -> Set(donor_hash)
    const uniqByRef     = new Map(); // ref -> Set(donor_hash)

    for (const r of (data || [])) {
      const iso = (r.country_iso || "UNK").toUpperCase();
      const name = r.country_name || iso;
      const amt = Number(r.amount_eur || 0);
      const dh  = r.donor_hash || null;
      const ref = (r.ref || "").toString().trim();

      // country bucket
      if (!byCountry.has(iso)) byCountry.set(iso, { iso, name, total_eur: 0, donors_unique: 0 });
      const c = byCountry.get(iso);
      c.total_eur += amt;

      if (dh) {
        if (!uniqByCountry.has(iso)) uniqByCountry.set(iso, new Set());
        const S = uniqByCountry.get(iso);
        if (!S.has(dh)) { S.add(dh); c.donors_unique += 1; }
      }

      // ref bucket (samo ako postoji ref)
      if (ref) {
        if (!byRef.has(ref)) byRef.set(ref, { ref, total_eur: 0, donors_unique: 0, countries: new Set(), last_at: r.created_at });
        const rr = byRef.get(ref);
        rr.total_eur += amt;
        rr.countries.add(iso);
        if (!rr.last_at || r.created_at > rr.last_at) rr.last_at = r.created_at;

        if (dh) {
          if (!uniqByRef.has(ref)) uniqByRef.set(ref, new Set());
          const S = uniqByRef.get(ref);
          if (!S.has(dh)) { S.add(dh); rr.donors_unique += 1; }
        }
      }
    }

    const outCountries = Array.from(byCountry.values())
      .sort((a,b)=> b.total_eur - a.total_eur)
      .slice(0, limit)
      .map(o => ({ ...o, total_eur: Number(o.total_eur.toFixed(0)) }));

    const outRefs = Array.from(byRef.values())
      .map(o => ({ ...o, countries: Array.from(o.countries), total_eur: Number(o.total_eur.toFixed(0)) }))
      .sort((a,b)=>{
        // primarno: najviše unikatnih donora, sekundarno: veći total, tercijarno: noviji last_at
        const d1 = (b.donors_unique||0) - (a.donors_unique||0);
        if (d1 !== 0) return d1;
        const d2 = (b.total_eur||0) - (a.total_eur||0);
        if (d2 !== 0) return d2;
        return (b.last_at||"").localeCompare(a.last_at||"");
      })
      .slice(0, limit);

    return {
      statusCode: 200,
      body: JSON.stringify({
        window: windowOpt,
        generated_at: new Date().toISOString(),
        by_country: outCountries,
        by_ref: outRefs
      })
    };
  } catch (e) {
    return { statusCode: 500, body: `Leaders error: ${e.message}` };
  }
};
