# 💖 TapTheMap - Light Up Your Country

**Send hearts to light up your country on the interactive global map. Support your nation, compete with others worldwide, and watch your country glow in real-time.**

**Live at:** [tapthemap.world](https://tapthemap.world)

---

## 🌟 Features

### ✅ **Interactive 3D Globe**
- Real-time country highlighting
- Country selection and donation
- Visual feedback for donations

### ✅ **Leaderboards**
- Top countries (24h, 7d, all-time)
- Unique donors tracking
- Total donations per country

### ✅ **Payment System**
- Stripe Checkout integration
- PayPal support
- Multiple payment methods
- Captain referral program (25% commission)

### ✅ **Real-time Statistics**
- Today's heat (24h donations)
- 7-day statistics
- All-time statistics
- Unique donors per country

### ✅ **Security & Performance**
- Rate limiting (IP-based)
- Structured logging
- Retry logic for critical operations
- Error handling with request ID tracking

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | HTML + CSS (Tailwind) + Vanilla JS |
| **Hosting** | Netlify (static site + Functions) |
| **Backend** | Netlify Functions (serverless) |
| **Database** | Supabase (PostgreSQL) |
| **Payments** | Stripe Checkout |
| **3D Globe** | Globe.gl + Three.js |
| **Node Version** | 18 |

---

## 📁 Project Structure

```
tapthemap/
├── index.html              # Main frontend page
├── netlify.toml            # Netlify configuration
├── package.json            # Dependencies
├── netlify/
│   └── functions/
│       ├── checkout.js     # Stripe checkout session creation
│       ├── webhook.js      # Stripe webhook handler
│       ├── stats.js        # Statistics aggregation
│       ├── leaders.js      # Leaderboard endpoint
│       ├── captains.js     # Captain referral stats
│       ├── ping.js         # Health check
│       ├── dbcheck.js      # Database connection check
│       ├── envcheck.js     # Environment variables check
│       ├── diag.js         # Diagnostic endpoint
│       └── utils/
│           ├── rateLimit.js # Rate limiting utility
│           ├── logger.js    # Structured logging utility
│           └── retry.js     # Retry logic utility
├── privacy.html            # Privacy Policy
├── terms.html              # Terms of Service
└── README.md               # This file
```

---

## 🚀 Quick Start

### **1. Prerequisites**
- Node.js 18+
- npm or yarn
- Netlify account
- Supabase account
- Stripe account

### **2. Clone Repository**
```bash
git clone https://github.com/bakatraka555/tapthemap.git
cd tapthemap
```

### **3. Install Dependencies**
```bash
npm install
```

### **4. Environment Variables**

Create `.env` file (for local development) or set in Netlify:

```env
# Site
SITE_BASE_URL=https://tapthemap.world

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_PUBLIC=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Security
REF_HASH_SALT=your_random_salt_string

# Optional
DEBUG_TOKEN=your_debug_token
LOG_LEVEL=INFO
```

### **5. Run Locally**
```bash
# Start Netlify dev server
npm run dev

# Or
npx netlify dev
```

### **6. Stripe Webhook (Local Development)**
```bash
# In another terminal, after netlify dev starts
stripe listen --forward-to http://localhost:8888/.netlify/functions/webhook
```

---

## 📡 API Endpoints

### **GET** `/api/stats`
Returns statistics for all countries (24h, 7d, all-time).

**Response:**
```json
[
  {
    "iso": "HRV",
    "name": "Croatia",
    "total_eur": 1000,
    "donors_24h": 15,
    "donors_7d": 45,
    "total_donors": 120
  }
]
```

**Rate Limit:** 200 requests/minute per IP

---

### **GET** `/api/leaders`
Returns top countries leaderboard (24h, 7d, all-time).

**Response:**
```json
{
  "leaders_24h": [
    {
      "country_iso": "HRV",
      "country_name": "Croatia",
      "unique_donors": 15,
      "total_eur": 500
    }
  ],
  "leaders_7d": [...],
  "leaders_all": [...]
}
```

**Rate Limit:** 200 requests/minute per IP

---

### **POST** `/api/checkout`
Creates a Stripe Checkout session.

**Request:**
```json
{
  "country_iso": "HRV",
  "country_name": "Croatia",
  "amount_eur": 10,
  "ref": "@captain_handle",
  "handle": "@captain_handle"
}
```

**Response:**
```json
{
  "id": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

**Rate Limit:** 50 requests/minute per IP

---

### **POST** `/api/webhook`
Stripe webhook handler (internal use only).

**Rate Limit:** N/A (Stripe only)

---

### **GET** `/api/captains`
Returns top captains (referral program stats).

**Response:**
```json
[
  {
    "ref": "@captain_handle",
    "total_earned": 250.50,
    "total_donations": 1000,
    "unique_donors": 45,
    "top_countries": ["HRV", "DEU", "FRA"]
  }
]
```

**Rate Limit:** 200 requests/minute per IP

---

### **GET** `/api/ping`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🗄️ Database Schema

### **Table: `payments`**
```sql
CREATE TABLE public.payments (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  country_iso VARCHAR(3) NOT NULL,
  country_name VARCHAR(255),
  amount_eur DECIMAL(10, 2) NOT NULL,
  amount_cents INTEGER NOT NULL,
  ref VARCHAR(64),
  donor_hash VARCHAR(64),
  stripe_pi VARCHAR(255) UNIQUE,
  influencer_ref VARCHAR(64),
  commission_rate DECIMAL(5, 4) DEFAULT 0.25,
  commission_amount DECIMAL(10, 2)
);
```

### **Indexes:**
```sql
CREATE INDEX idx_payments_country_iso ON payments(country_iso);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_donor_hash ON payments(donor_hash);
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_pi);
CREATE INDEX idx_payments_influencer_ref ON payments(influencer_ref);
```

---

## 🔐 Security

### **Rate Limiting**
- IP-based rate limiting
- Configurable limits per endpoint
- Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

### **Logging**
- Structured JSON logging
- Request ID tracking
- Function context tracking
- Log levels (DEBUG, INFO, WARN, ERROR)

### **Retry Logic**
- Exponential backoff for critical operations
- Configurable retries
- Network error handling
- 5xx error handling

### **Error Handling**
- Request ID in error responses
- Proper HTTP headers
- CORS headers
- Content-Type headers

---

## 🚀 Deployment

### **Netlify Deploy**

1. **Connect GitHub Repository**
   - Go to Netlify Dashboard
   - Click "New site from Git"
   - Select GitHub repository
   - Select branch: `main`

2. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add all required environment variables
   - Set `SUPABASE_SERVICE_ROLE_KEY` in Functions scope only

3. **Configure Stripe Webhook**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://tapthemap.world/.netlify/functions/webhook`
   - Select events: `checkout.session.completed`
   - Copy webhook secret to environment variables

4. **Deploy**
   - Push to `main` branch (auto-deploy)
   - Or run: `npx netlify deploy --prod`

### **Supabase Setup**

1. **Create Database**
   - Go to Supabase Dashboard
   - Create new project
   - Run SQL schema (see Database Schema section)

2. **Set Row Level Security (RLS)**
   - Enable RLS on `payments` table
   - Create policies as needed

3. **Get API Keys**
   - Go to Project settings → API
   - Copy URL and keys to environment variables

---

## 🧪 Testing

### **Local Testing**
```bash
# Start Netlify dev
npm run dev

# Test endpoints
curl http://localhost:8888/.netlify/functions/stats
curl http://localhost:8888/.netlify/functions/leaders
curl -X POST http://localhost:8888/.netlify/functions/checkout \
  -H "Content-Type: application/json" \
  -d '{"country_iso":"HRV","amount_eur":10}'
```

### **Production Testing**
```bash
# Test endpoints
curl https://tapthemap.world/.netlify/functions/stats
curl https://tapthemap.world/.netlify/functions/leaders

# Test rate limiting
for i in {1..250}; do
  curl https://tapthemap.world/.netlify/functions/leaders
done
```

---

## 📊 Monitoring

### **Netlify Logs**
```bash
# View function logs
netlify logs --function leaders
netlify logs --function stats
netlify logs --function checkout
netlify logs --function webhook
```

### **Stripe Dashboard**
- Go to Stripe Dashboard → Payments
- Monitor successful payments
- Check webhook events

### **Supabase Dashboard**
- Go to Supabase Dashboard → Table Editor
- View payments table
- Monitor database performance

---

## 🐛 Troubleshooting

### **Problem: Rate Limit Exceeded**
**Solution:** Wait for rate limit window to reset, or increase limits in `rateLimit.js`

### **Problem: Webhook Not Working**
**Solution:** 
1. Check Stripe webhook secret in environment variables
2. Verify webhook endpoint URL in Stripe Dashboard
3. Check Netlify function logs

### **Problem: Database Connection Error**
**Solution:**
1. Check Supabase URL and keys in environment variables
2. Verify database is accessible
3. Check Supabase dashboard for errors

### **Problem: Payment Not Recorded**
**Solution:**
1. Check webhook logs in Netlify
2. Verify Stripe webhook events in Stripe Dashboard
3. Check database for duplicate payments (stripe_pi unique constraint)

---

## 📝 License

Proprietary. All rights reserved.

---

## 🤝 Contributing

This is a private project. Not open source.

---

## 📞 Support

- **Website:** https://tapthemap.world
- **GitHub:** https://github.com/bakatraka555/tapthemap
- **Netlify:** https://app.netlify.com/projects/tapthemap

---

## 🎯 Roadmap

### **v1 (Current)**
- ✅ Rate limiting
- ✅ Structured logging
- ✅ Retry logic
- ⏳ UI for today heat (map)
- ⏳ Leaderboard UI improvements

### **v2 (Planned)**
- ⏳ RLS + SECURITY DEFINER views
- ⏳ Referral @handle validation
- ⏳ Basic anti-spam
- ⏳ Advanced analytics

---

**Made with ❤️ for global community**
