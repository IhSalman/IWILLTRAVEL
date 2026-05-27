-- Add telegram_users table for account linking
CREATE TABLE IF NOT EXISTS public.telegram_users (
    telegram_id BIGINT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Only service role (admin) can manage these for now, or users can view their own
CREATE POLICY "Users can view their own telegram link" ON public.telegram_users
    FOR SELECT USING (auth.uid() = user_id);
