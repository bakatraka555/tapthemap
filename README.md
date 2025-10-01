# TapTheMap — Netlify + Stripe + Supabase scaffold

This is a minimal working scaffold based on your handoff notes.

## Stack
- **Hosting**: Netlify (static site + Functions, Node 18)
- **DB**: Supabase Postgres (table `public.payments`)
- **Payments**: Stripe Checkout
- **Functions**: `checkout.js`, `webhook.js`, `stats.js`, `leaders.js`, `diag.js`

## Environment variables (Netlify -> Site settings -> Environment)
- `SITE_BASE_URL` (e.g. `https://tapthemap.world`)
- `SUPABASE_URL`
- `SUPABASE_ANON_PUBLIC`
- `SUPABASE_SERVICE_ROLE_KEY` (**only** in Functions scope)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `REF_HASH_SALT`
- `DEBUG_TOKEN` (optional, for `diag`)
  
## Run locally
1. Install deps:
   ```bash
   npm i
   ```
2. Run Netlify dev:
   ```bash
   npx netlify dev
   ```
3. Stripe webhook (in another terminal, after `netlify dev` prints the local URL):
   ```bash
   stripe listen --forward-to http://localhost:8888/.netlify/functions/webhook
   ```

## Deploy
Push to your connected repo or run:
```bash
npx netlify deploy --prod
```

## Notes
- `checkout.js` creates a Stripe Checkout session. You can POST JSON like:
  ```json
  {"amount_cents": 500, "country_iso": "HRV", "country_name": "Croatia", "ref": "@handle", "email": "donor@example.com"}
  ```
- `webhook.js` verifies the signature and writes to `public.payments`.
- `stats.js` returns "today heat" aggregates.
- `leaders.js` returns simple unique-donor leaderboard (24h, 7d) per country.
- `diag.js` does a protected test insert when `DEBUG_TOKEN` matches.

> You should replace any simplistic logic with your production-grade rules, RLS, and SQL views when ready.
