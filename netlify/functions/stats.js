import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_PUBLIC);

export const handler = async () => {
  const { data, error } = await supabase
    .from("country_stats")
    .select("country_iso,total_amount_cents,donors_24h,donors_7d,last_ts");
  if (error) return { statusCode: 500, body: error.message };

  const rows = (data || []).map(r => ({
    iso: r.country_iso,
    total_eur: (r.total_amount_cents / 100).toFixed(2),
    donors_24h: r.donors_24h,
    donors_7d: r.donors_7d,
    last_ts: r.last_ts
  }));
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(rows) };
};
