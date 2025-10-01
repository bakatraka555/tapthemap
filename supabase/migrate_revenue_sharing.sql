-- TapTheMap Revenue Sharing Migration
-- Run this in Supabase SQL Editor to add revenue sharing support

-- 1. Add revenue sharing columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS influencer_ref text,
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0;

-- 2. Create influencers table
CREATE TABLE IF NOT EXISTS public.influencers (
  id bigserial PRIMARY KEY,
  handle text UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  paypal_email text,
  commission_rate numeric DEFAULT 0.25,
  total_earned numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_influencer_ref ON public.payments (influencer_ref);
CREATE INDEX IF NOT EXISTS idx_influencers_handle ON public.influencers (handle);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON public.influencers (status);
CREATE INDEX IF NOT EXISTS idx_influencers_created_at ON public.influencers (created_at);

-- 4. Add comments for documentation
COMMENT ON TABLE public.influencers IS 'Influencers for revenue sharing program';
COMMENT ON COLUMN public.influencers.handle IS 'Unique influencer handle (e.g., travel_croatia)';
COMMENT ON COLUMN public.influencers.commission_rate IS 'Commission rate (0.25 = 25%)';
COMMENT ON COLUMN public.influencers.total_earned IS 'Total commission earned';
COMMENT ON COLUMN public.influencers.status IS 'Status: active, inactive, suspended';

COMMENT ON COLUMN public.payments.influencer_ref IS 'Reference to influencer who referred this donation';
COMMENT ON COLUMN public.payments.commission_rate IS 'Commission rate for this transaction';
COMMENT ON COLUMN public.payments.commission_amount IS 'Commission amount for this transaction';

-- 5. Success message
SELECT 'Revenue sharing migration completed successfully!' as message;

