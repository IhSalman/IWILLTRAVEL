-- WanderPlan AI - Complete Schema
-- Updated to match Replication Guide

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  travel_style TEXT,
  preferences JSONB,
  saved_destinations TEXT[],
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create cities table (formerly destinations)
CREATE TABLE IF NOT EXISTS public.cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  country_id TEXT NOT NULL,
  continent_id TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  cost_per_day NUMERIC NOT NULL,
  internet_speed INTEGER NOT NULL,
  safety_score INTEGER NOT NULL,
  temperature INTEGER NOT NULL,
  best_for TEXT NOT NULL,
  vibes TEXT[] DEFAULT '{}',
  best_season TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create itineraries table
CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city_id TEXT NOT NULL,           -- FK to cities or 'custom' sentinel
  title TEXT NOT NULL,
  content JSONB NOT NULL,          -- Full AI JSON
  days INTEGER DEFAULT 5,
  budget TEXT,
  travel_style TEXT,
  traveler_type TEXT DEFAULT 'single',
  status TEXT DEFAULT 'planned',
  is_public BOOLEAN DEFAULT false,
  shared_link_token UUID,
  start_date DATE,
  end_date DATE,
  interests TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create traveler_preferences table
CREATE TABLE IF NOT EXISTS public.traveler_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  travel_identities TEXT[],
  travel_interests TEXT[],
  travel_pace TEXT,
  budget_comfort TEXT,
  preferred_accommodation TEXT[],
  transport_comfort TEXT[],
  travel_companions TEXT[],
  travel_motivations TEXT[],
  planning_style TEXT,
  travel_goals_notes TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create translation_history table
CREATE TABLE IF NOT EXISTS public.translation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  translation_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create community_posts table
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL,        -- trip_experience | itinerary_snapshot | visa_experience | micro_tip
  destination_city TEXT,
  destination_country TEXT,
  -- Trip experience fields
  travel_duration_days INTEGER,
  budget_range TEXT,
  highlights TEXT,
  challenges TEXT,
  -- Visa fields
  nationality TEXT,
  visa_type TEXT,
  application_channel TEXT,
  processing_time_days INTEGER,
  visa_issues TEXT,
  visa_tips TEXT,
  -- Micro tip fields
  tip_category TEXT,
  tip_text TEXT,
  -- Itinerary snapshot
  itinerary_type TEXT,
  itinerary_content JSONB,
  -- AI-generated tags
  ai_tags JSONB,
  ai_travel_style TEXT,
  ai_season TEXT,
  ai_destination_type TEXT,
  -- Engagement
  helpful_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ai_usage_logs table
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_estimate NUMERIC,
  request_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create affiliate_clicks table
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Cities are viewable by everyone." ON public.cities FOR SELECT USING (true);

CREATE POLICY "Users can view all itineraries." ON public.itineraries FOR SELECT USING (true);
CREATE POLICY "Users can insert their own itineraries." ON public.itineraries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own itineraries." ON public.itineraries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own itineraries." ON public.itineraries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences." ON public.traveler_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences." ON public.traveler_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences." ON public.traveler_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own translation history." ON public.translation_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own translation history." ON public.translation_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Community posts are viewable by everyone." ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own community posts." ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own community posts." ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own community posts." ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage logs." ON public.ai_usage_logs FOR SELECT USING (auth.uid() = user_id);

-- Create a trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
