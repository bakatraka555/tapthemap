// netlify/functions/stats.js
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_PUBLIC, {
    auth: { persistSession: false }
  });

exports.handler = async () => {
  try {
    // agregat po ISO – bez ikakvog defaulta na HRV
    const { data, error } = await supa().rpc("stats_by_country"); // ako nema RPC, koristimo SQL kroz .from()

    // Ako nemaš RPC funkciju, koristi plain SQL kroz PostgREST:
    // const { data, error } = await supa()
    //   .from("payments")
    //   .select("country_iso, country_name, amount_eur, created_at")
    //   .order("created_at", { ascending: false });

    if (error) throw error;

    // Ako si išao plain select, pregrupiši u JS-u:
    // const map = new Map();
    // for (const r of data) {
    //   const key = r.country_iso || "UNK";
    //   const cur = map.get(key) || { iso: key, name: r.country_name || key, total_eur: 0, donors_24h: 0, donors_7d: 0, donors: new Set() };
    //   cur.total_eur += Number(r.amount_eur || 0);
    //   // donors / vremenski prozori po potrebi
    //   map.set(key, cur);
    // }
    // const rows = [...map.values()].map(x => ({ iso: x.iso, name: x.name, total_eur: Math.round(x.total_eur), donors_24h: x.donors_24h, donors_7d: x.donors_7d }));

    // Pretpostavimo da RPC već vraća polja: iso, name, total_eur, donors_24h, donors_7d
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 500, body: `Stats error: ${e.message}` };
  }
};
