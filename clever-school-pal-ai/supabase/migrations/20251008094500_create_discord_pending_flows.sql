-- Pending flows state table for Discord image model selection
-- Mirrors whatsapp_pending_flows structure for short-lived conversational state

CREATE TABLE IF NOT EXISTS public.discord_pending_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Discord user id
    guild_id TEXT, -- Discord guild id (nullable for DMs)
    channel_id TEXT NOT NULL, -- Discord channel id
    flow_type TEXT NOT NULL CHECK (flow_type IN ('image_model_selection')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled','expired')),
    state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discord_pending_flows_user_channel_expires
  ON public.discord_pending_flows(user_id, channel_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_discord_pending_flows_expires_at
  ON public.discord_pending_flows(expires_at);

CREATE INDEX IF NOT EXISTS idx_discord_pending_flows_status
  ON public.discord_pending_flows(status);

-- Ensure only one pending flow per user/channel/flow_type at a time
CREATE UNIQUE INDEX IF NOT EXISTS uidx_discord_pending_flows_unique_pending
  ON public.discord_pending_flows(user_id, channel_id, flow_type)
  WHERE status = 'pending';

-- Enable RLS (service role will bypass; no public client access expected)
ALTER TABLE public.discord_pending_flows ENABLE ROW LEVEL SECURITY;

-- Super admin can access everything
CREATE POLICY "Super admin full access to discord_pending_flows" ON public.discord_pending_flows
  FOR ALL USING (is_super_admin());

-- Optional read for analytics by school users (safe, does not allow write)
CREATE POLICY "School users can read their discord_pending_flows" ON public.discord_pending_flows
  FOR SELECT USING (
    NOT is_super_admin()
  );

COMMENT ON TABLE public.discord_pending_flows IS 'Short-lived conversational state for Discord flows (e.g., image model selection)';
COMMENT ON COLUMN public.discord_pending_flows.state_data IS 'Arbitrary JSON payload (e.g., imageUrl, caption, messageId, selectedModel)';