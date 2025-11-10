// GET /.netlify/functions/leaders
// Vraća top countries leaderboard (24h, 7d, all-time) sortirano po broju donora
const { createClient } = require("@supabase/supabase-js");
const { createRateLimiter } = require("./utils/rateLimit");
const { createLogger } = require("./utils/logger");

const supa = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_PUBLIC,
  { auth: { persistSession: false } }
);

// Rate limiter: 200 requests per minute per IP
const rateLimiter = createRateLimiter({
  maxRequests: 200,
  windowMs: 60000, // 1 minute
});

const logger = createLogger({ function: "leaders" });

exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || Date.now().toString();
  const log = createLogger({ function: "leaders", requestId });

  try {
    // Rate limiting
    if (event.httpMethod === "GET") {
      const rateLimitResult = rateLimiter(event);
      if (rateLimitResult) {
        log.warn("Rate limit exceeded", { ip: event.headers['x-forwarded-for'] });
        return rateLimitResult;
      }
    }

    log.info("Leaders request received");
    // Dohvati sve payments
    const { data, error } = await supa()
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50000);

    if (error) {
      log.error("Supabase query error", error);
      throw error;
    }

    log.info("Data fetched from Supabase", { recordCount: data?.length });

    const now = Date.now();
    const since24 = now - 24 * 60 * 60 * 1000;
    const since7d = now - 7 * 24 * 60 * 60 * 1000;

    // Mapping ISO kodova na pravilne nazive (isti kao u stats.js)
    const countryNames = {
      'HRV': 'Croatia', 'DEU': 'Germany', 'FRA': 'France', 'ITA': 'Italy', 'ESP': 'Spain', 'POL': 'Poland',
      'GBR': 'United Kingdom', 'USA': 'United States', 'CAN': 'Canada', 'MEX': 'Mexico', 'BRA': 'Brazil',
      'ARG': 'Argentina', 'CHL': 'Chile', 'COL': 'Colombia', 'PER': 'Peru', 'VEN': 'Venezuela',
      'CHN': 'China', 'JPN': 'Japan', 'IND': 'India', 'PAK': 'Pakistan', 'BGD': 'Bangladesh',
      'IDN': 'Indonesia', 'PHL': 'Philippines', 'VNM': 'Vietnam', 'THA': 'Thailand', 'MYS': 'Malaysia',
      'SGP': 'Singapore', 'KOR': 'South Korea', 'PRK': 'North Korea', 'MNG': 'Mongolia',
      'KAZ': 'Kazakhstan', 'UZB': 'Uzbekistan', 'KGZ': 'Kyrgyzstan', 'TJK': 'Tajikistan',
      'TKM': 'Turkmenistan', 'AFG': 'Afghanistan', 'IRN': 'Iran', 'IRQ': 'Iraq', 'SYR': 'Syria',
      'LBN': 'Lebanon', 'JOR': 'Jordan', 'ISR': 'Israel', 'SAU': 'Saudi Arabia', 'YEM': 'Yemen',
      'OMN': 'Oman', 'ARE': 'United Arab Emirates', 'QAT': 'Qatar', 'KWT': 'Kuwait', 'BHR': 'Bahrain',
      'EGY': 'Egypt', 'LBY': 'Libya', 'TUN': 'Tunisia', 'DZA': 'Algeria', 'MAR': 'Morocco',
      'SDN': 'Sudan', 'SSD': 'South Sudan', 'ETH': 'Ethiopia', 'ERI': 'Eritrea', 'DJI': 'Djibouti',
      'SOM': 'Somalia', 'KEN': 'Kenya', 'UGA': 'Uganda', 'TZA': 'Tanzania', 'RWA': 'Rwanda',
      'BDI': 'Burundi', 'COD': 'Democratic Republic of the Congo', 'COG': 'Republic of the Congo',
      'CAF': 'Central African Republic', 'TCD': 'Chad', 'CMR': 'Cameroon', 'NGA': 'Nigeria',
      'NER': 'Niger', 'MLI': 'Mali', 'BFA': 'Burkina Faso', 'SEN': 'Senegal', 'MRT': 'Mauritania',
      'GMB': 'Gambia', 'GNB': 'Guinea-Bissau', 'GIN': 'Guinea', 'SLE': 'Sierra Leone',
      'LBR': 'Liberia', 'CIV': 'Ivory Coast', 'GHA': 'Ghana', 'TGO': 'Togo', 'BEN': 'Benin',
      'GNQ': 'Equatorial Guinea', 'GAB': 'Gabon', 'STP': 'Sao Tome and Principe', 'AGO': 'Angola',
      'ZMB': 'Zambia', 'ZWE': 'Zimbabwe', 'BWA': 'Botswana', 'NAM': 'Namibia', 'LSO': 'Lesotho',
      'SWZ': 'Swaziland', 'ZAF': 'South Africa', 'MDG': 'Madagascar', 'MUS': 'Mauritius',
      'SYC': 'Seychelles', 'COM': 'Comoros', 'MWI': 'Malawi', 'MOZ': 'Mozambique',
      'AUS': 'Australia', 'NZL': 'New Zealand', 'FJI': 'Fiji', 'PNG': 'Papua New Guinea',
      'SLB': 'Solomon Islands', 'VUT': 'Vanuatu', 'NCL': 'New Caledonia', 'WSM': 'Samoa',
      'TON': 'Tonga', 'KIR': 'Kiribati', 'TUV': 'Tuvalu', 'NRU': 'Nauru', 'MHL': 'Marshall Islands',
      'FSM': 'Micronesia', 'PLW': 'Palau', 'NLD': 'Netherlands', 'BEL': 'Belgium', 'CHE': 'Switzerland',
      'AUT': 'Austria', 'SWE': 'Sweden', 'NOR': 'Norway', 'DNK': 'Denmark', 'FIN': 'Finland',
      'PRT': 'Portugal', 'GRC': 'Greece', 'TUR': 'Turkey', 'UKR': 'Ukraine', 'RUS': 'Russia',
      'ROU': 'Romania', 'BGR': 'Bulgaria', 'HUN': 'Hungary', 'CZE': 'Czech Republic', 'SVK': 'Slovakia',
      'SVN': 'Slovenia', 'BIH': 'Bosnia and Herzegovina', 'SRB': 'Serbia', 'MNE': 'Montenegro',
      'MKD': 'Macedonia', 'ALB': 'Albania', 'XKX': 'Kosovo', 'LTU': 'Lithuania', 'LVA': 'Latvia',
      'EST': 'Estonia', 'BLR': 'Belarus', 'MDA': 'Moldova', 'GEO': 'Georgia', 'ARM': 'Armenia',
      'AZE': 'Azerbaijan', 'ISL': 'Iceland', 'IRL': 'Ireland', 'LUX': 'Luxembourg', 'MLT': 'Malta',
      'CYP': 'Cyprus'
    };

    // Grupiraj po zemljama
    const byCountry = new Map();

    for (const payment of (data || [])) {
      const iso = (payment.country_iso || "UNK").toUpperCase().slice(0, 3);
      const name = countryNames[iso] || payment.country_name || iso;
      const donor_hash = payment.donor_hash;
      const amount_eur = Number(payment.amount_eur || 0);
      const ts = new Date(payment.created_at).getTime();

      if (!byCountry.has(iso)) {
        byCountry.set(iso, {
          country_iso: iso,
          country_name: name,
          donors_24h: new Set(),
          donors_7d: new Set(),
          donors_all: new Set(),
          total_eur: 0,
          total_eur_24h: 0,
          total_eur_7d: 0
        });
      }

      const country = byCountry.get(iso);
      country.total_eur += amount_eur;

      if (donor_hash) {
        country.donors_all.add(donor_hash);
        
        if (ts >= since7d) {
          country.donors_7d.add(donor_hash);
          country.total_eur_7d += amount_eur;
        }
        
        if (ts >= since24) {
          country.donors_24h.add(donor_hash);
          country.total_eur_24h += amount_eur;
        }
      }
    }

    // Pretvori u array i sortiraj
    const allCountries = Array.from(byCountry.values()).map(c => ({
      country_iso: c.country_iso,
      country_name: c.country_name,
      unique_donors: c.donors_all.size,
      total_eur: Math.round(c.total_eur)
    }));

    // Leaders 24h - sortiraj po donors_24h, pa po total_eur_24h
    const leaders_24h = Array.from(byCountry.values())
      .map(c => ({
        country_iso: c.country_iso,
        country_name: c.country_name,
        unique_donors: c.donors_24h.size,
        total_eur: Math.round(c.total_eur_24h)
      }))
      .filter(c => c.unique_donors > 0)
      .sort((a, b) => {
        const donorsDiff = b.unique_donors - a.unique_donors;
        if (donorsDiff !== 0) return donorsDiff;
        return b.total_eur - a.total_eur;
      })
      .slice(0, 20);

    // Leaders 7d - sortiraj po donors_7d, pa po total_eur_7d
    const leaders_7d = Array.from(byCountry.values())
      .map(c => ({
        country_iso: c.country_iso,
        country_name: c.country_name,
        unique_donors: c.donors_7d.size,
        total_eur: Math.round(c.total_eur_7d)
      }))
      .filter(c => c.unique_donors > 0)
      .sort((a, b) => {
        const donorsDiff = b.unique_donors - a.unique_donors;
        if (donorsDiff !== 0) return donorsDiff;
        return b.total_eur - a.total_eur;
      })
      .slice(0, 20);

    // Leaders all-time - sortiraj po donors_all, pa po total_eur
    const leaders_all = Array.from(byCountry.values())
      .map(c => ({
        country_iso: c.country_iso,
        country_name: c.country_name,
        unique_donors: c.donors_all.size,
        total_eur: Math.round(c.total_eur)
      }))
      .filter(c => c.unique_donors > 0)
      .sort((a, b) => {
        const donorsDiff = b.unique_donors - a.unique_donors;
        if (donorsDiff !== 0) return donorsDiff;
        return b.total_eur - a.total_eur;
      })
      .slice(0, 20);

    log.info("Leaders processed", {
      countriesCount: byCountry.size,
      leaders24hCount: leaders_24h.length,
      leaders7dCount: leaders_7d.length,
      leadersAllCount: leaders_all.length,
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leaders_24h,
        leaders_7d,
        leaders_all
      })
    };
  } catch (e) {
    log.error("Leaders error", e);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: e.message,
        requestId
      })
    };
  }
};


