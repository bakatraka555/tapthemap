-- TapTheMap Database Schema
-- Clean start - no foreign keys, no constraints

-- Countries table (reference)
create table if not exists public.countries (
  iso3 text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- Influencers table (revenue sharing)
create table if not exists public.influencers (
  id bigserial primary key,
  handle text unique not null,
  name text not null,
  email text not null,
  paypal_email text,
  commission_rate numeric default 0.25,
  total_earned numeric default 0,
  status text default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Payments table (main data)
create table if not exists public.payments (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  country_iso text not null,
  country_name text not null,
  amount_eur numeric not null,
  amount_cents integer not null,
  currency text default 'EUR',
  ref text,
  email text,
  stripe_session_id text,
  stripe_pi text unique not null,
  donor_hash text not null,
  -- Revenue sharing columns
  influencer_ref text,
  commission_rate numeric default 0.25,
  commission_amount numeric default 0
);

-- Indexes for performance
create index if not exists idx_payments_created_at on public.payments (created_at);
create index if not exists idx_payments_country_iso on public.payments (country_iso);
create index if not exists idx_payments_donor_hash on public.payments (donor_hash);
create index if not exists idx_payments_stripe_pi on public.payments (stripe_pi);
create index if not exists idx_payments_ref on public.payments (ref);
create index if not exists idx_payments_influencer_ref on public.payments (influencer_ref);

-- Influencers indexes
create index if not exists idx_influencers_handle on public.influencers (handle);
create index if not exists idx_influencers_status on public.influencers (status);
create index if not exists idx_influencers_created_at on public.influencers (created_at);

-- Insert all countries at once
insert into public.countries (iso3, name) values
('HRV', 'Croatia'),('DEU', 'Germany'),('FRA', 'France'),('ITA', 'Italy'),('ESP', 'Spain'),('POL', 'Poland'),('GBR', 'United Kingdom'),('NLD', 'Netherlands'),('BEL', 'Belgium'),('CHE', 'Switzerland'),('AUT', 'Austria'),('SWE', 'Sweden'),('NOR', 'Norway'),('DNK', 'Denmark'),('FIN', 'Finland'),('PRT', 'Portugal'),('GRC', 'Greece'),('TUR', 'Turkey'),('UKR', 'Ukraine'),('RUS', 'Russia'),('ROU', 'Romania'),('BGR', 'Bulgaria'),('HUN', 'Hungary'),('CZE', 'Czech Republic'),('SVK', 'Slovakia'),('SVN', 'Slovenia'),('BIH', 'Bosnia and Herzegovina'),('SRB', 'Serbia'),('MNE', 'Montenegro'),('MKD', 'Macedonia'),('ALB', 'Albania'),('XKX', 'Kosovo'),('LTU', 'Lithuania'),('LVA', 'Latvia'),('EST', 'Estonia'),('BLR', 'Belarus'),('MDA', 'Moldova'),('GEO', 'Georgia'),('ARM', 'Armenia'),('AZE', 'Azerbaijan'),('ISL', 'Iceland'),('IRL', 'Ireland'),('LUX', 'Luxembourg'),('MLT', 'Malta'),('CYP', 'Cyprus'),('USA', 'United States'),('CAN', 'Canada'),('MEX', 'Mexico'),('BRA', 'Brazil'),('ARG', 'Argentina'),('CHL', 'Chile'),('COL', 'Colombia'),('PER', 'Peru'),('VEN', 'Venezuela'),('ECU', 'Ecuador'),('BOL', 'Bolivia'),('PRY', 'Paraguay'),('URY', 'Uruguay'),('GTM', 'Guatemala'),('HND', 'Honduras'),('SLV', 'El Salvador'),('NIC', 'Nicaragua'),('CRI', 'Costa Rica'),('PAN', 'Panama'),('CUB', 'Cuba'),('JAM', 'Jamaica'),('HTI', 'Haiti'),('DOM', 'Dominican Republic'),('PRI', 'Puerto Rico'),('CHN', 'China'),('JPN', 'Japan'),('IND', 'India'),('PAK', 'Pakistan'),('BGD', 'Bangladesh'),('IDN', 'Indonesia'),('PHL', 'Philippines'),('VNM', 'Vietnam'),('THA', 'Thailand'),('MMR', 'Myanmar'),('MYS', 'Malaysia'),('SGP', 'Singapore'),('KOR', 'South Korea'),('PRK', 'North Korea'),('MNG', 'Mongolia'),('KAZ', 'Kazakhstan'),('UZB', 'Uzbekistan'),('KGZ', 'Kyrgyzstan'),('TJK', 'Tajikistan'),('TKM', 'Turkmenistan'),('AFG', 'Afghanistan'),('IRN', 'Iran'),('IRQ', 'Iraq'),('SYR', 'Syria'),('LBN', 'Lebanon'),('JOR', 'Jordan'),('ISR', 'Israel'),('SAU', 'Saudi Arabia'),('YEM', 'Yemen'),('OMN', 'Oman'),('ARE', 'United Arab Emirates'),('QAT', 'Qatar'),('KWT', 'Kuwait'),('BHR', 'Bahrain'),('LKA', 'Sri Lanka'),('NPL', 'Nepal'),('BTN', 'Bhutan'),('MDV', 'Maldives'),('EGY', 'Egypt'),('LBY', 'Libya'),('TUN', 'Tunisia'),('DZA', 'Algeria'),('MAR', 'Morocco'),('SDN', 'Sudan'),('SSD', 'South Sudan'),('ETH', 'Ethiopia'),('ERI', 'Eritrea'),('DJI', 'Djibouti'),('SOM', 'Somalia'),('KEN', 'Kenya'),('UGA', 'Uganda'),('TZA', 'Tanzania'),('RWA', 'Rwanda'),('BDI', 'Burundi'),('COD', 'Democratic Republic of the Congo'),('COG', 'Republic of the Congo'),('CAF', 'Central African Republic'),('TCD', 'Chad'),('CMR', 'Cameroon'),('NGA', 'Nigeria'),('NER', 'Niger'),('MLI', 'Mali'),('BFA', 'Burkina Faso'),('SEN', 'Senegal'),('MRT', 'Mauritania'),('GMB', 'Gambia'),('GNB', 'Guinea-Bissau'),('GIN', 'Guinea'),('SLE', 'Sierra Leone'),('LBR', 'Liberia'),('CIV', 'Ivory Coast'),('GHA', 'Ghana'),('TGO', 'Togo'),('BEN', 'Benin'),('GNQ', 'Equatorial Guinea'),('GAB', 'Gabon'),('STP', 'Sao Tome and Principe'),('AGO', 'Angola'),('ZMB', 'Zambia'),('ZWE', 'Zimbabwe'),('BWA', 'Botswana'),('NAM', 'Namibia'),('LSO', 'Lesotho'),('SWZ', 'Swaziland'),('ZAF', 'South Africa'),('MDG', 'Madagascar'),('MUS', 'Mauritius'),('SYC', 'Seychelles'),('COM', 'Comoros'),('MWI', 'Malawi'),('MOZ', 'Mozambique'),('AUS', 'Australia'),('NZL', 'New Zealand'),('FJI', 'Fiji'),('PNG', 'Papua New Guinea'),('SLB', 'Solomon Islands'),('VUT', 'Vanuatu'),('NCL', 'New Caledonia'),('WSM', 'Samoa'),('TON', 'Tonga'),('KIR', 'Kiribati'),('TUV', 'Tuvalu'),('NRU', 'Nauru'),('MHL', 'Marshall Islands'),('FSM', 'Micronesia'),('PLW', 'Palau')
on conflict (iso3) do nothing;

-- Enable Row Level Security (optional)
-- alter table public.payments enable row level security;
-- alter table public.countries enable row level security;

-- Create policies (optional)
-- create policy "Allow public read access" on public.countries for select using (true);
-- create policy "Allow public read access" on public.payments for select using (true);