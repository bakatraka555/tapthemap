const Stripe = require("stripe");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supa = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

const MAP = {
  croatia: "HRV",
  germany: "DEU",
  france: "FRA",
  italy: "ITA",
  spain: "ESP",
  poland: "POL",
  "united kingdom": "GBR",
  england: "GBR",
  netherlands: "NLD",
  belgium: "BEL",
  switzerland: "CHE",
  austria: "AUT",
  sweden: "SWE",
  norway: "NOR",
  denmark: "DNK",
  finland: "FIN",
  portugal: "PRT",
  greece: "GRC",
  turkey: "TUR",
  ukraine: "UKR",
  russia: "RUS",
  "russian federation": "RUS",
  romania: "ROU",
  bulgaria: "BGR",
  hungary: "HUN",
  "czech republic": "CZE",
  slovakia: "SVK",
  slovenia: "SVN",
  "bosnia and herzegovina": "BIH",
  serbia: "SRB",
  montenegro: "MNE",
  macedonia: "MKD",
  albania: "ALB",
  kosovo: "XKX",
  lithuania: "LTU",
  latvia: "LVA",
  estonia: "EST",
  belarus: "BLR",
  moldova: "MDA",
  georgia: "GEO",
  armenia: "ARM",
  azerbaijan: "AZE",
  iceland: "ISL",
  ireland: "IRL",
  luxembourg: "LUX",
  malta: "MLT",
  cyprus: "CYP",
  usa: "USA",
  "united states": "USA",
  "united states of america": "USA",
  canada: "CAN",
  mexico: "MEX",
  brazil: "BRA",
  argentina: "ARG",
  chile: "CHL",
  colombia: "COL",
  peru: "PER",
  venezuela: "VEN",
  ecuador: "ECU",
  bolivia: "BOL",
  paraguay: "PRY",
  uruguay: "URY",
  guatemala: "GTM",
  honduras: "HND",
  "el salvador": "SLV",
  nicaragua: "NIC",
  "costa rica": "CRI",
  panama: "PAN",
  cuba: "CUB",
  jamaica: "JAM",
  haiti: "HTI",
  "dominican republic": "DOM",
  "puerto rico": "PRI",
  china: "CHN",
  japan: "JPN",
  india: "IND",
  pakistan: "PAK",
  bangladesh: "BGD",
  indonesia: "IDN",
  philippines: "PHL",
  vietnam: "VNM",
  thailand: "THA",
  myanmar: "MMR",
  malaysia: "MYS",
  singapore: "SGP",
  "south korea": "KOR",
  "north korea": "PRK",
  mongolia: "MNG",
  kazakhstan: "KAZ",
  uzbekistan: "UZB",
  kyrgyzstan: "KGZ",
  tajikistan: "TJK",
  turkmenistan: "TKM",
  afghanistan: "AFG",
  iran: "IRN",
  iraq: "IRQ",
  syria: "SYR",
  lebanon: "LBN",
  jordan: "JOR",
  israel: "ISR",
  "saudi arabia": "SAU",
  "kingdom of saudi arabia": "SAU",
  ksa: "SAU",
  yemen: "YEM",
  oman: "OMN",
  "united arab emirates": "ARE",
  qatar: "QAT",
  kuwait: "KWT",
  bahrain: "BHR",
  "sri lanka": "LKA",
  nepal: "NPL",
  bhutan: "BTN",
  maldives: "MDV",
  egypt: "EGY",
  libya: "LBY",
  tunisia: "TUN",
  algeria: "DZA",
  morocco: "MAR",
  sudan: "SDN",
  "south sudan": "SSD",
  ethiopia: "ETH",
  eritrea: "ERI",
  djibouti: "DJI",
  somalia: "SOM",
  kenya: "KEN",
  uganda: "UGA",
  tanzania: "TZA",
  rwanda: "RWA",
  burundi: "BDI",
  "democratic republic of the congo": "COD",
  "republic of the congo": "COG",
  "central african republic": "CAF",
  chad: "TCD",
  cameroon: "CMR",
  nigeria: "NGA",
  niger: "NER",
  mali: "MLI",
  "burkina faso": "BFA",
  senegal: "SEN",
  mauritania: "MRT",
  gambia: "GMB",
  "guinea-bissau": "GNB",
  guinea: "GIN",
  "sierra leone": "SLE",
  liberia: "LBR",
  "ivory coast": "CIV",
  ghana: "GHA",
  togo: "TGO",
  benin: "BEN",
  "equatorial guinea": "GNQ",
  gabon: "GAB",
  "sao tome and principe": "STP",
  angola: "AGO",
  zambia: "ZMB",
  zimbabwe: "ZWE",
  botswana: "BWA",
  namibia: "NAM",
  lesotho: "LSO",
  swaziland: "SWZ",
  "south africa": "ZAF",
  madagascar: "MDG",
  mauritius: "MUS",
  seychelles: "SYC",
  comoros: "COM",
  malawi: "MWI",
  mozambique: "MOZ",
  australia: "AUS",
  "new zealand": "NZL",
  fiji: "FJI",
  "papua new guinea": "PNG",
  "solomon islands": "SLB",
  vanuatu: "VUT",
  "new caledonia": "NCL",
  samoa: "WSM",
  tonga: "TON",
  kiribati: "KIR",
  tuvalu: "TUV",
  nauru: "NRU",
  "marshall islands": "MHL",
  micronesia: "FSM",
  palau: "PLW"
};

const isoFromName = (name) => {
  if (!name) return null;
  const k = name.trim().toLowerCase();
  return MAP[k] || null;
};

const normalizeISO = (iso, name) => {
  let z = (iso || "").toUpperCase().slice(0,3);
  if (!/^[A-Z]{3}$/.test(z)) z = "";
  if (!z || (z === "HRV" && name && name.trim() !== "Croatia")) {
    const guess = isoFromName(name);
    if (guess) z = guess;
  }
  return z || "UNK";
};

const donorHash = (idLike, salt) =>
  crypto.createHash("sha256").update(salt + "::" + (idLike || "").toLowerCase().trim()).digest("hex");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const sig = event.headers["stripe-signature"];
    const whsec = process.env.STRIPE_WEBHOOK_SECRET || "";
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

    let evt;
    try {
      evt = stripe.webhooks.constructEvent(event.body, sig, whsec);
    } catch (err) {
      console.warn("WEBHOOK signature error:", err.message);
      return { statusCode: 400, body: "Signature error: " + err.message };
    }

    if (evt.type !== "checkout.session.completed") {
      return { statusCode: 200, body: "ignored" };
    }

    const session = evt.data.object;
    const meta = session.metadata || {};

    const amountCents = Number(session.amount_total || 0);
    if (!amountCents || amountCents < 100) {
      console.warn("WEBHOOK: zero/low amount_total, skip", JSON.stringify({ amountCents }));
      return { statusCode: 200, body: "skip: amount_total" };
    }
    const amount_eur = Math.round(amountCents / 100);

    const email = session.customer_details?.email || session.customer_email || "";
    const pseudoId = email || session.customer || session.id || "";
    const salt = process.env.REF_HASH_SALT || "tapthemap_default_salt";

    const country_name = meta.country_name || meta.name || "";
    const country_iso = normalizeISO(meta.country_iso, country_name);
    
    console.log("WEBHOOK metadata:", JSON.stringify({ meta, country_name, country_iso }));

    if (country_iso === "UNK") {
      console.warn("WEBHOOK: missing/unknown ISO, skip", JSON.stringify({ meta, country_name, country_iso }));
      return { statusCode: 200, body: "skip: unknown iso" };
    }

    const row = {
      created_at: new Date().toISOString(),
      country_iso,
      country_name: country_name || country_iso,
      amount_eur,
      ref: meta.ref || null,
      donor_hash: donorHash(pseudoId, salt),
      stripe_pi: String(session.payment_intent || session.id || ""),
    };

    const { error } = await supa()
      .from("payments")
      .upsert(row, { onConflict: "stripe_pi", ignoreDuplicates: true });

    if (error) {
      console.error("WEBHOOK supabase error:", error.message);
      return { statusCode: 500, body: "supabase error: " + error.message };
    }

    console.info("WEBHOOK inserted", JSON.stringify({
      iso: row.country_iso,
      eur: row.amount_eur,
      pi: row.stripe_pi,
    }));

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("WEBHOOK fatal error:", e.message);
    return { statusCode: 500, body: "webhook error: " + e.message };
  }
};
