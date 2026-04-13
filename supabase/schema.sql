-- ========================================
-- Localution - Multi-tenant SaaS Schema
-- Database: Supabase PostgreSQL
-- ========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 1. PROFILES TABLE (extends auth.users)
-- ========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT,
  business_category TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ========================================
-- 2. STORES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  phone TEXT,
  main_keyword TEXT,
  sub_keywords TEXT[],
  tone TEXT,
  naver_place_url TEXT,
  naver_blog_url TEXT,
  cover_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_created_at ON public.stores(created_at);
CREATE INDEX IF NOT EXISTS idx_stores_category ON public.stores(category);

-- RLS Policies for stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stores"
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create stores"
  ON public.stores
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stores"
  ON public.stores
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own stores"
  ON public.stores
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ========================================
-- 3. REVIEWS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('naver', 'baemin', 'coupang', 'google')),
  customer_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  ai_reply TEXT,
  replied BOOLEAN DEFAULT FALSE,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON public.reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_platform ON public.reviews(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_replied ON public.reviews(replied);

-- RLS Policies for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews for their stores"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reviews for their stores"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reviews for their stores"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete reviews for their stores"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- 4. CUSTOMERS TABLE (CRM)
-- ========================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  visit_count INTEGER DEFAULT 0,
  total_spent NUMERIC(12, 2) DEFAULT 0.00,
  tags TEXT[],
  last_visit TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON public.customers(last_visit);

-- RLS Policies for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers for their stores"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create customers for their stores"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update customers for their stores"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete customers for their stores"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- 5. QR_SCANS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  device_info TEXT,
  led_to_review BOOLEAN DEFAULT FALSE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_qr_scans_store_id ON public.qr_scans(store_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON public.qr_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_scans_led_to_review ON public.qr_scans(led_to_review);

-- RLS Policies for qr_scans
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view qr_scans for their stores"
  ON public.qr_scans
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create qr_scans for their stores"
  ON public.qr_scans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update qr_scans for their stores"
  ON public.qr_scans
  FOR UPDATE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete qr_scans for their stores"
  ON public.qr_scans
  FOR DELETE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- 6. EXPENSES TABLE (Accounting)
-- ========================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_expenses_store_id ON public.expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses(created_at);

-- RLS Policies for expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses for their stores"
  ON public.expenses
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expenses for their stores"
  ON public.expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expenses for their stores"
  ON public.expenses
  FOR UPDATE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete expenses for their stores"
  ON public.expenses
  FOR DELETE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- 7. TRIGGER: Auto-create profile on user signup
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 8. UPDATED_AT TRIGGER FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables with updated_at column
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_stores_updated ON public.stores;
CREATE TRIGGER on_stores_updated
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
