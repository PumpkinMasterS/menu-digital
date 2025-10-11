Discord RLS - Option A (service_role + super_admin only)

Summary
- Management access for Discord tables is restricted to:
  - service_role (bot/backend) — full access via RLS policy
  - authenticated users with JWT role = super_admin — full access via RLS policy
- All other roles (teachers, directors, etc.) have no direct access to these tables from the frontend.
- Users can still DM the bot; bot runs with service_role and logs/interacts as needed.

Affected tables
- public.discord_interactions
- public.discord_guilds
- public.discord_channels
- public.discord_users
- public.discord_bot_config

Migrations
- 20250817110000_update_discord_rls_option_a.sql
  - Drops legacy policies
  - Enables RLS on all Discord tables
  - Adds two policies per table:
    - <table>_service_role_all (FOR ALL, auth.role() = 'service_role')
    - <table>_super_admin_manage (FOR ALL, auth.role()='authenticated' AND jwt role = 'super_admin')
- 20250817113000_force_recreate_discord_rls_option_a.sql
  - Drops the Option A policies and recreates them to ensure state convergence

How to apply migrations
- Project is linked with Supabase CLI. Typical commands:
  - supabase db push
- If not linked yet:
  - supabase link (follow prompts)

Verify policies (service-role check)
- Script: verify-discord-rls-option-a.cjs
- Requirements:
  - Environment vars: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- Run:
  - node verify-discord-rls-option-a.cjs
- Expected per table:
  - RLS Enabled: YES
  - Policies: exactly two
    - <table>_service_role_all (cmd=all)
    - <table>_super_admin_manage (cmd=all)

Notes
- The policies rely on auth.role() and the JWT payload for role detection:
  - service_role granted via auth.role() = 'service_role'
  - super_admin detected via COALESCE((auth.jwt()->'app_metadata'->>'role'), (auth.jwt()->'user_metadata'->>'role')) = 'super_admin'
- Frontend users (teachers/directors) cannot read/write directly to Discord tables; all interactions should be routed through backend/bot using service_role.

Troubleshooting
- If verification shows extra or missing policies, run supabase db push to apply the latest migration.
- If still inconsistent, apply the follow-up migration again or run the SQL in Supabase SQL Editor.