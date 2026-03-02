-- WhatsApp contacts: user's numbers to open in WhatsApp Web / app
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_user_id ON public.whatsapp_contacts(user_id);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_contacts_all_own" ON public.whatsapp_contacts FOR ALL USING (auth.uid() = user_id);
