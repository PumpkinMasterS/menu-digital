-- Pending flows state table for WhatsApp image model selection
-- Allows keeping short-lived conversational state (e.g., choose model 1/2/3) with TTL

CREATE TABLE IF NOT EXISTS public.whatsapp_pending_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    flow_type TEXT NOT NULL CHECK (flow_type IN ('image_model_selection')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled','expired')),
    state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_pending_flows_phone_expires
  ON public.whatsapp_pending_flows(phone_number, expires_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_pending_flows_expires_at
  ON public.whatsapp_pending_flows(expires_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_pending_flows_status
  ON public.whatsapp_pending_flows(status);

-- Ensure only one pending flow per phone_number/flow_type at a time
CREATE UNIQUE INDEX IF NOT EXISTS uidx_whatsapp_pending_flows_unique_pending
  ON public.whatsapp_pending_flows(phone_number, flow_type)
  WHERE status = 'pending';

-- Enable RLS (service role will bypass; no public client access expected)
ALTER TABLE public.whatsapp_pending_flows ENABLE ROW LEVEL SECURITY;

-- Super admin can access everything
CREATE POLICY "Super admin full access to whatsapp_pending_flows" ON public.whatsapp_pending_flows
  FOR ALL USING (is_super_admin());

-- Optional read for analytics by school users (safe, does not allow write)
CREATE POLICY "School users can read their whatsapp_pending_flows" ON public.whatsapp_pending_flows
  FOR SELECT USING (
    NOT is_super_admin()
  );

COMMENT ON TABLE public.whatsapp_pending_flows IS 'Short-lived conversational state for WhatsApp flows (e.g., image model selection)';
COMMENT ON COLUMN public.whatsapp_pending_flows.state_data IS 'Arbitrary JSON payload (e.g., imageUrl, caption, messageId, selectedModel)';