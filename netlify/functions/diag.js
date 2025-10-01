import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const handler = async (event) => {
  const token = event.queryStringParameters?.token || '';
  if (!process.env.DEBUG_TOKEN || token !== process.env.DEBUG_TOKEN) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const { error } = await supabase.from('payments').insert({
    country_iso: 'TST',
    country_name: 'Testland',
    amount_eur: 1,
    amount_cents: 100,
    currency: 'EUR',
    ref: 'diag',
    email: null,
    stripe_session_id: 'diag',
    stripe_pi: 'diag',
    donor_hash: 'diag-'+Date.now()
  });

  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 200, body: 'Inserted diag row' };
};
