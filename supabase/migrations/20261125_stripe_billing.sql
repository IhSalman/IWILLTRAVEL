-- Stripe billing: link users to Stripe customers/subscriptions and make webhooks idempotent.

ALTER TABLE public.user_subscriptions
    ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- upsert(..., onConflict: 'user_id') needs a unique constraint on user_id.
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_id_key
    ON public.user_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS user_subscriptions_stripe_sub_idx
    ON public.user_subscriptions (stripe_subscription_id);

-- One row per processed Stripe event (primary key blocks double-processing).
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-only table: no client access.
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
