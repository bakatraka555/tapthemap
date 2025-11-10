const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

exports.handler = async (event) => {
  try {
    const qs = new URLSearchParams(event.rawQuery || event.queryStringParameters || "");
    const limit = Math.min(50, Math.max(1, Number(qs.get("limit") || 10)));
    const since = new Date(Date.now() - 7*24*3600*1000).toISOString();

    const { data, error } = await supa()
      .from("payments")
      .select("ref, donor_hash, amount_eur, country_name, created_at")
      .gt("created_at", since)
      .not("ref","is",null)
      .neq("ref","");

    if (error) throw error;

    const acc = new Map(); // ref -> { sum, donors:Set, countries:Set }
    for (const r of data || []) {
      const ref = (r.ref || "").trim(); if (!ref) continue;
      if (!acc.has(ref)) acc.set(ref, { sum:0, donors:new Set(), countries:new Set() });
      const b = acc.get(ref);
      const amt = Number(r.amount_eur || 0); if (amt>0) b.sum += amt;
      const dh = (r.donor_hash || "").trim(); if (dh) b.donors.add(dh);
      const cn = (r.country_name || "").trim(); if (cn) b.countries.add(cn);
    }

    const out = Array.from(acc.entries())
      .map(([ref,b])=>({ ref, donors_unique:b.donors.size, total_eur:Math.round(b.sum), countries:[...b.countries] }))
      .sort((a,b)=> (b.donors_unique - a.donors_unique) || (b.total_eur - a.total_eur))
      .slice(0, limit);

    return { statusCode: 200, headers: { "content-type":"application/json","cache-control":"no-store" },
      body: JSON.stringify({ by_ref: out }) };
  } catch (e) {
    return { statusCode: 500, body: `leaders error: ${e.message}` };
  }
};
