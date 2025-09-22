exports.handler = async () => {
  const ok = (k) => Boolean(process.env[k]);
  return {
    statusCode: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify({
      SUPABASE_URL: ok("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: ok("SUPABASE_SERVICE_ROLE_KEY"),
      STRIPE_SECRET_KEY: ok("STRIPE_SECRET_KEY"),
      STRIPE_WEBHOOK_SECRET: ok("STRIPE_WEBHOOK_SECRET"),
      SITE_BASE_URL: ok("SITE_BASE_URL")
    })
  };
};
