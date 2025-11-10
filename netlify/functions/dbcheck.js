const { createClient } = require("@supabase/supabase-js");
exports.handler = async () => {
  try {
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
    const { count, error } = await supa
      .from("payments")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return { statusCode: 200, headers: { "content-type":"application/json", "cache-control":"no-store" },
      body: JSON.stringify({ ok:true, payments_count: count }) };
  } catch (e) {
    return { statusCode: 500, body: `dbcheck error: ${e.message}` };
  }
};
