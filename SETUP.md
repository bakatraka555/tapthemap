# 🔧 TapTheMap Setup Guide

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Netlify account (free tier works)
- Supabase account (free tier works)
- Stripe account (free tier works)
- GitHub account (optional, for deployment)

---

## 🚀 Step 1: Clone Repository

```bash
git clone https://github.com/bakatraka555/tapthemap.git
cd tapthemap
```

---

## 📦 Step 2: Install Dependencies

```bash
npm install
```

**Dependencies:**
- `@supabase/supabase-js`: Supabase client
- `stripe`: Stripe SDK
- `netlify-cli`: Netlify CLI (dev dependency)

---

## 🗄️ Step 3: Setup Supabase

### **3.1 Create Supabase Project**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: `tapthemap`
   - Database Password: (generate strong password)
   - Region: (choose closest region)
4. Click "Create new project"
5. Wait for project to be created (~2 minutes)

### **3.2 Create Database Table**

1. Go to SQL Editor in Supabase Dashboard
2. Run the following SQL:

```sql
-- Create payments table
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

-- Create indexes
CREATE INDEX idx_payments_country_iso ON payments(country_iso);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_donor_hash ON payments(donor_hash);
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_pi);
CREATE INDEX idx_payments_influencer_ref ON payments(influencer_ref);
```

### **3.3 Get API Keys**

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (e.g., `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
   - **service_role** key (e.g., `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**⚠️ Important:** Keep `service_role` key secret! It has full database access.

### **3.4 Enable Row Level Security (Optional)**

For production, enable RLS on the `payments` table:

```sql
-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policy (adjust as needed)
CREATE POLICY "Allow anonymous read access" ON public.payments
  FOR SELECT USING (true);
```

---

## 💳 Step 4: Setup Stripe

### **4.1 Create Stripe Account**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign up or log in
3. Complete account setup (if new account)

### **4.2 Get API Keys**

1. Go to Developers → API keys
2. Copy the following:
   - **Publishable key** (e.g., `pk_test_...`)
   - **Secret key** (e.g., `sk_test_...`)

**⚠️ Note:** Use test keys for development, live keys for production.

### **4.3 Setup Webhook (Production)**

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://tapthemap.world/.netlify/functions/webhook`
4. Select events: `checkout.session.completed`
5. Click "Add endpoint"
6. Copy webhook signing secret (e.g., `whsec_...`)

### **4.4 Setup Webhook (Local Development)**

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to http://localhost:8888/.netlify/functions/webhook
   ```

4. Copy webhook signing secret (displayed in terminal)

---

## 🌐 Step 5: Setup Netlify

### **5.1 Create Netlify Account**

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Sign up or log in
3. Complete account setup (if new account)

### **5.2 Connect GitHub Repository**

1. Go to Sites → Add new site → Import an existing project
2. Connect to GitHub
3. Select repository: `tapthemap`
4. Select branch: `main`
5. Configure build settings:
   - Build command: `npm install`
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
6. Click "Deploy site"

### **5.3 Set Environment Variables**

1. Go to Site settings → Environment variables
2. Add the following variables:

**Site Variables:**
```
SITE_BASE_URL=https://tapthemap.world
```

**Build Variables:**
```
NODE_VERSION=18
```

**Function Variables (All Functions):**
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_PUBLIC=your_supabase_anon_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
REF_HASH_SALT=your_random_salt_string
LOG_LEVEL=INFO
```

**Function Variables (Webhook Only):**
```
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**⚠️ Important:** 
- Set `SUPABASE_SERVICE_ROLE_KEY` only in Functions scope (not site scope)
- Use strong random string for `REF_HASH_SALT`
- Use test keys for development, live keys for production

### **5.4 Configure Custom Domain (Optional)**

1. Go to Domain settings
2. Click "Add custom domain"
3. Enter domain: `tapthemap.world`
4. Follow DNS configuration instructions
5. Wait for DNS propagation (~24 hours)

---

## 🧪 Step 6: Test Locally

### **6.1 Create `.env` File**

Create `.env` file in project root:

```env
SITE_BASE_URL=http://localhost:8888
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_PUBLIC=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
REF_HASH_SALT=your_random_salt_string
LOG_LEVEL=INFO
```

### **6.2 Start Netlify Dev**

```bash
npm run dev
```

Or:

```bash
npx netlify dev
```

### **6.3 Start Stripe Webhook (Separate Terminal)**

```bash
stripe listen --forward-to http://localhost:8888/.netlify/functions/webhook
```

### **6.4 Test Endpoints**

```bash
# Test stats endpoint
curl http://localhost:8888/.netlify/functions/stats

# Test leaders endpoint
curl http://localhost:8888/.netlify/functions/leaders

# Test checkout endpoint
curl -X POST http://localhost:8888/.netlify/functions/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "country_iso": "HRV",
    "country_name": "Croatia",
    "amount_eur": 10
  }'
```

---

## 🚀 Step 7: Deploy to Production

### **7.1 Push to GitHub**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### **7.2 Netlify Auto-Deploy**

Netlify will automatically deploy when you push to `main` branch.

### **7.3 Manual Deploy (Optional)**

```bash
npx netlify deploy --prod
```

### **7.4 Verify Deployment**

1. Go to Netlify Dashboard → Deploys
2. Check deploy status
3. Visit your site: `https://tapthemap.world`

---

## 🔍 Step 8: Verify Setup

### **8.1 Test Production Endpoints**

```bash
# Test stats endpoint
curl https://tapthemap.world/.netlify/functions/stats

# Test leaders endpoint
curl https://tapthemap.world/.netlify/functions/leaders

# Test checkout endpoint
curl -X POST https://tapthemap.world/.netlify/functions/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "country_iso": "HRV",
    "country_name": "Croatia",
    "amount_eur": 10
  }'
```

### **8.2 Test Payment Flow**

1. Go to `https://tapthemap.world`
2. Select a country
3. Enter donation amount
4. Click "Donate"
5. Complete Stripe checkout (use test card: `4242 4242 4242 4242`)
6. Verify payment in Stripe Dashboard
7. Verify payment in Supabase Database

### **8.3 Check Logs**

```bash
# View Netlify function logs
netlify logs --function leaders
netlify logs --function stats
netlify logs --function checkout
netlify logs --function webhook
```

---

## 🐛 Troubleshooting

### **Problem: Database Connection Error**

**Solution:**
1. Check `SUPABASE_URL` and `SUPABASE_ANON_PUBLIC` in environment variables
2. Verify database is accessible in Supabase Dashboard
3. Check network connectivity

### **Problem: Stripe Webhook Not Working**

**Solution:**
1. Check `STRIPE_WEBHOOK_SECRET` in environment variables
2. Verify webhook endpoint URL in Stripe Dashboard
3. Check Netlify function logs
4. Test webhook locally with Stripe CLI

### **Problem: Payment Not Recorded**

**Solution:**
1. Check webhook logs in Netlify
2. Verify Stripe webhook events in Stripe Dashboard
3. Check database for duplicate payments (stripe_pi unique constraint)
4. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Functions scope

### **Problem: Rate Limit Exceeded**

**Solution:**
1. Wait for rate limit window to reset
2. Increase limits in `netlify/functions/utils/rateLimit.js`
3. Check IP address (rate limiting is per IP)

### **Problem: Function Timeout**

**Solution:**
1. Check function execution time in Netlify logs
2. Optimize database queries
3. Increase function timeout in `netlify.toml`:

```toml
[functions]
  node_bundler = "esbuild"
  timeout = 30
```

---

## 📊 Monitoring

### **Netlify Analytics**

1. Go to Netlify Dashboard → Analytics
2. Enable Analytics (may require paid plan)
3. Monitor site traffic and performance

### **Stripe Dashboard**

1. Go to Stripe Dashboard → Payments
2. Monitor successful payments
3. Check webhook events
4. View customer data

### **Supabase Dashboard**

1. Go to Supabase Dashboard → Table Editor
2. View payments table
3. Monitor database performance
4. Check query performance

---

## 🔐 Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set only in Functions scope
- [ ] `REF_HASH_SALT` is a strong random string
- [ ] Stripe webhook secret is set correctly
- [ ] Environment variables are not committed to Git
- [ ] Row Level Security (RLS) is enabled on database (optional)
- [ ] Rate limiting is configured correctly
- [ ] Logging is configured correctly
- [ ] Error handling is in place

---

## ✅ Setup Complete!

Your TapTheMap installation is now complete! 🎉

**Next Steps:**
1. Test all endpoints
2. Test payment flow
3. Monitor logs
4. Customize frontend (if needed)
5. Deploy to production

---

## 📞 Support

For setup support, please contact:
- **Website:** https://tapthemap.world
- **GitHub:** https://github.com/bakatraka555/tapthemap
- **Netlify:** https://app.netlify.com/projects/tapthemap

---

**Last Updated:** 2024-01-01

