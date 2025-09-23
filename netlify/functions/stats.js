import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_PUBLIC);

function isoDateOnly(d=new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,'0');
  const day = String(d.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

export const handler = async () => {
  const today = isoDateOnly(new Date());
  const { data, error } = await supabase
    .from('payments')
    .select('country_iso, country_name, amount_cents, donor_hash, created_at')
    .gte('created_at', `${today}T00:00:00+00`);

  if (error) {
    return { statusCode: 500, body: error.message };
  }

  // Group by country
  const byCountry = {};
  for (const row of data || []) {
    const iso = row.country_iso || 'UNK';
    if (!byCountry[iso]) {
      byCountry[iso] = {
        iso: iso,
        country_iso: iso,
        country_name: row.country_name || iso,
        total_cents: 0,
        donors: new Set()
      };
    }
    byCountry[iso].total_cents += row.amount_cents || 0;
    if (row.donor_hash) {
      byCountry[iso].donors.add(row.donor_hash);
    }
  }

  // Convert to array format expected by frontend
  const items = Object.values(byCountry).map(country => ({
    iso: country.iso,
    country_iso: country.country_iso,
    country_name: country.country_name,
    total_eur: country.total_cents / 100,
    donors_24h: country.donors.size
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items)
  };
};
