// GET /.netlify/functions/captains
// Vraća top captains (influencers) s podacima o njihovim followerima i zastavicama
const { createClient } = require("@supabase/supabase-js");

const supa = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_PUBLIC, {
    auth: { persistSession: false }
  }
);

exports.handler = async () => {
  try {
    // Dohvati sve payments s influencer_ref
    const { data: payments, error: paymentsError } = await supa()
      .from("payments")
      .select("*")
      .not("influencer_ref", "is", null)
      .order("created_at", { ascending: false })
      .limit(50000);

    if (paymentsError) throw paymentsError;
    
    console.log('Captains: Raw payments data:', payments?.length, 'records');

    // Grupiraj po influencer_ref
    const byInfluencer = new Map();
    
    for (const payment of (payments || [])) {
      const influencer_ref = payment.influencer_ref;
      const country_iso = payment.country_iso;
      const amount_eur = Number(payment.amount_eur || 0);
      const donor_hash = payment.donor_hash;
      
      if (!byInfluencer.has(influencer_ref)) {
        byInfluencer.set(influencer_ref, {
          handle: influencer_ref,
          total_earned: 0,
          total_donations: 0,
          total_donors: new Set(),
          countries: new Set(),
          country_flags: new Map() // country_iso -> count
        });
      }
      
      const influencer = byInfluencer.get(influencer_ref);
      influencer.total_earned += amount_eur * 0.25; // 25% commission
      influencer.total_donations += amount_eur;
      influencer.total_donors.add(donor_hash);
      influencer.countries.add(country_iso);
      
      // Broji zastavice po zemljama
      if (!influencer.country_flags.has(country_iso)) {
        influencer.country_flags.set(country_iso, 0);
      }
      influencer.country_flags.set(country_iso, influencer.country_flags.get(country_iso) + 1);
    }

    // Pretvori u array i sortiraj po total_earned
    const captains = Array.from(byInfluencer.values()).map(influencer => ({
      handle: influencer.handle,
      total_earned: Math.round(influencer.total_earned * 100) / 100,
      total_donations: influencer.total_donations,
      total_donors: influencer.total_donors.size,
      countries_count: influencer.countries.size,
      country_flags: Array.from(influencer.country_flags.entries())
        .map(([iso, count]) => ({ iso, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) // Top 5 zastavica
    })).sort((a, b) => b.total_earned - a.total_earned);

    console.log('Captains: Processed', captains.length, 'captains');
    console.log('Captains: Top 3:', captains.slice(0, 3));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(captains)
    };
  } catch (e) {
    console.error("Captains error:", e);
    return { statusCode: 500, body: `Captains error: ${e.message}` };
  }
};
