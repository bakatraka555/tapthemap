// /.netlify/functions/leaders
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

exports.handler = async () => {
  try {
    const db = supa();

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db
      .from("payments")
      .select("handle, donor_hash, amount_eur, created_at")
      .gte("created_at", since7d);

    if (error) {
      return { statusCode: 500, body: `supabase error: ${error.message}` };
    }

    const byHandle = new Map(); // handle -> { sum, donors:Set }

    for (const p of data || []) {
      const h = (p.handle || "").trim();
      if (!h) continue;

      if (!byHandle.has(h)) {
        byHandle.set(h, { sum: 0, donors: new Set() });
      }
      const bucket = byHandle.get(h);
      bucket.sum += Number(p.amount_eur || 0);
      const dh = (p.donor_hash || "").trim();
      if (dh) bucket.donors.add(dh);
    }

    const out = [];
    for (const [handle, v] of byHandle.entries()) {
      out.push({
        handle,
        donors: v.donors.size,      // unique donors in last 7d
        total_eur: Math.round(v.sum)
      });
    }

    // Sortiraj: najviše unique donora, pa po iznosu
    out.sort((a, b) => (b.donors - a.donors) || (b.total_eur - a.total_eur));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(out),
    };
  } catch (e) {
    return { statusCode: 500, body: `leaders error: ${e.message}` };
  }
};
