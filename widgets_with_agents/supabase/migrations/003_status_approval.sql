-- Add status (pending | approved | declined) for approval workflow to expenses, trips, vouchers.
-- purchase_requisitions already has status; we allow 'pending', 'approved', 'declined' in addition to 'draft'/'submitted'/'rejected'.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'declined'));

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'declined'));

ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'declined'));

-- purchase_requisitions: extend status to include pending/approved/declined if needed (already has draft, submitted, approved, rejected)
-- No change: we use existing status; frontend will show Approve/Decline and set approved or declined.

COMMENT ON COLUMN public.expenses.status IS 'Workflow: pending | approved | declined';
COMMENT ON COLUMN public.trips.status IS 'Workflow: pending | approved | declined';
COMMENT ON COLUMN public.vouchers.status IS 'Workflow: pending | approved | declined';
