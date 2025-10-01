// GET /.netlify/functions/stats
// Agregira po zemlji: total_eur + donors_24h + donors_7d (ALL vrijeme)
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_PUBLIC, {
    auth: { persistSession: false }
  });

exports.handler = async () => {
  try {
    const { data, error } = await supa()
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50000);

    if (error) throw error;
    
    console.log('Stats: Raw data from Supabase:', data?.length, 'records');
    console.log('Stats: Latest 3 records:', data?.slice(0, 3));
    console.log('Stats: Sample record with donor_hash:', data?.find(r => r.donor_hash));

    const by = new Map();
    const now = Date.now();
    const since24 = now - 24*60*60*1000;
    const since7d = now - 7*24*60*60*1000;

    // Mapping ISO kodova na pravilne nazive
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
      'FSM': 'Micronesia', 'PLW': 'Palau'
    };

    for (const r of (data||[])) {
      const iso = (r.country_iso || "UNK").toUpperCase().slice(0,3);
      const name = countryNames[iso] || r.country_name || iso; // Koristi mapping umesto baze
      const amt  = Number(r.amount_eur || 0);
      const ts   = new Date(r.created_at).getTime();
      const dh   = r.donor_hash || null;

      if (!by.has(iso)) by.set(iso, {
        iso, name, total_eur: 0,
        donors24: new Set(), donors7: new Set(), allDonors: new Set()
      });
      const o = by.get(iso);
      o.total_eur += amt;
      if (dh) {
        o.allDonors.add(dh); // Dodaj sve donore
        console.log(`Adding donor ${dh} to ${iso}, total donors now: ${o.allDonors.size}`);
      }
      if (ts >= since7d && dh) o.donors7.add(dh);
      if (ts >= since24 && dh) o.donors24.add(dh);
    }

    const out = Array.from(by.values()).map(o => ({
      iso: o.iso,
      name: o.name,
      total_eur: Math.round(o.total_eur),
      donors_24h: o.donors24.size,
      donors_7d: o.donors7.size,
      total_donors: o.allDonors.size
    }))
    // default sortiranje za "Today's heat": po donors_24h pa total
    .sort((a,b)=>{
      const d = (b.donors_24h||0) - (a.donors_24h||0);
      if (d !== 0) return d;
      return (b.total_eur||0) - (a.total_eur||0);
    });

    console.log('Stats: Final output:', out);
    console.log('Stats: Sample country with donors:', out.find(c => c.total_eur > 0));
    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 500, body: `Stats error: ${e.message}` };
  }
};
