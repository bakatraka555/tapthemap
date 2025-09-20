// GET /.netlify/functions/stats
// Agregira po zemlji: total_eur + donors_24h + donors_7d
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_PUBLIC, {
    auth: { persistSession: false },
  });

/** Minimalna normalizacija ISO koda prema imenu države
 *  - spašava stare zapise gdje je ostao HRV, a name je druga država
 *  - ne utječe na nove zapise (webhook već šalje točan ISO)
 */
const NAME_2_ISO = {
  "croatia": "HRV",
  "kazakhstan": "KAZ",
  "saudi arabia": "SAU",
  "kingdom of saudi arabia": "SAU",
  "ksa": "SAU",
  "libya": "LBY",
  "algeria": "DZA",
  "russia": "RUS",
  "russian federation": "RUS",
  "united states": "USA",
  "united states of america": "USA",
  "usa": "USA",
};

function normalizeISO(iso, name) {
  let z = (iso || "").toUpperCase().slice(0, 3);
  const validIso = /^[A-Z]{3}$/;

  // ako ISO nije valjan ili je ostao HRV, a ime NIJE Croatia → probaj iz imena
  if (!validIso.test(z) || (z === "HRV" && name && name.trim() !== "Croatia")) {
    const guess = NAME_2_ISO[(name || "").trim().toLowerCase()];
    if (guess) z = guess;
  }
  return validIso.test(z) ? z : "UNK";
}

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
    const since24 = now - 24 * 60 * 60 * 1000;
    const since7d = now - 7 * 24 * 60 * 60 * 1000;

    for (const r of data || []) {
      // normaliziraj ISO ako je stariji zapis imao krivo (npr. HRV+Kazakhstan)
      const iso = normalizeISO(r.country_iso, r.country_name);
      const name = r.country_name || iso;
      const amt = Number(r.amount_eur || 0);
      if (!Number.isFinite(amt) || amt <= 0) continue;

      const ts = new Date(r.created_at).getTime();
      const dh = r.donor_hash || null;

      if (!by.has(iso)) {
        by.set(iso, {
          iso,
          name,
          total_eur: 0,
          donors24: new Set(),
          donors7: new Set(),
        });
      }
      const o = by.get(iso);
      o.total_eur += amt;
      if (dh) {
        if (ts >= since7d) o.donors7.add(dh);
        if (ts >= since24) o.donors24.add(dh);
      }
    }

    const out = Array.from(by.values())
      .map((o) => ({
        iso: o.iso,
        name: o.name,
        total_eur: Math.round(o.total_eur),
        donors_24h: o.donors24.size,
        donors_7d: o.donors7.size,
      }))
      // "Today's heat": prvo po donors_24h pa po totalu
      .sort((a, b) => {
        const d = (b.donors_24h || 0) - (a.donors_24h || 0);
        if (d !== 0) return d;
        return (b.total_eur || 0) - (a.total_eur || 0);
      });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(out),
    };
  } catch (e) {
    return { statusCode: 500, body: `Stats error: ${e.message}` };
  }
};
