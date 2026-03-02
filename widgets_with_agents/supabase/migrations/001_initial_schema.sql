-- Personal Assistant: initial schema
-- All tables: id (uuid), user_id (references auth.users), created_at

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name text,
  email text,
  phone text,
  address text,
  account_no text,
  ifsc text,
  uid text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('Travel', 'Food')),
  date date NOT NULL,
  merchant text,
  amount numeric NOT NULL DEFAULT 0,
  bill_no text,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trips
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  source text,
  destination text,
  amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Custom fields (for dynamic forms)
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  field_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'date', 'number', 'email', 'textarea', 'select')),
  placeholder text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Shortcuts
CREATE TABLE IF NOT EXISTS public.shortcuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notes
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  description text,
  quantity integer NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Purchase requisitions
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pr_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  items jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Voucher sequence for VID-2026XXX
CREATE SEQUENCE IF NOT EXISTS public.voucher_seq START 1;

-- Vouchers (VID auto-generated)
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vid text NOT NULL UNIQUE,
  amount numeric NOT NULL DEFAULT 0,
  type text,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_voucher_vid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vid IS NULL OR NEW.vid = '' THEN
    NEW.vid := 'VID-2026' || lpad(nextval('public.voucher_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_voucher_vid_trigger ON public.vouchers;
CREATE TRIGGER set_voucher_vid_trigger
  BEFORE INSERT ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.set_voucher_vid();

-- Activity logs (for /view-data logs section)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  action text NOT NULL,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common filters
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON public.vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);

-- RLS: enable and policy (allow service role to bypass; for app use anon key with auth)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own rows
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "expenses_all_own" ON public.expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "trips_all_own" ON public.trips FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "custom_fields_all_own" ON public.custom_fields FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "shortcuts_all_own" ON public.shortcuts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notes_all_own" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "products_all_own" ON public.products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "purchase_requisitions_all_own" ON public.purchase_requisitions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "vouchers_all_own" ON public.vouchers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "activity_logs_all_own" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);

-- Profile insert is done by backend with service role only (no anon insert).

COMMENT ON TABLE public.profiles IS 'User profiles with UID-2026XXX';
COMMENT ON TABLE public.vouchers IS 'Vouchers with auto VID-2026XXX';
