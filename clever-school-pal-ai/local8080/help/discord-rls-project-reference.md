# Discord RLS Option A — Project Reference

This document summarizes the files, tables, migrations, verification scripts, and procedures implemented to enforce and validate the Discord RLS Option A model in this project.

## Option A model
- Only service_role (Supabase service key) and authenticated users with JWT role = super_admin have ALL access to Discord tables.
- All other roles (including teachers/directors) have no direct R/W access to these tables.

## Discord tables covered
- discord_interactions
- discord_guilds
- discord_channels
- discord_users
- discord_bot_config

## Key files
- supabase/migrations/20250817110000_update_discord_rls_option_a.sql — initial Option A policy creation
- supabase/migrations/20250817113000_force_recreate_discord_rls_option_a.sql — force re-create Option A baseline
- supabase/migrations/20250817114000_create_rls_introspection_views.sql — creates public views v_rls_status and v_pg_policies for REST-based RLS introspection
- supabase/migrations/20250817115000_cleanup_discord_rls_option_a.sql — removes legacy policies to converge to Option A only
- supabase/migrations/20250823120000_force_recreate_discord_rls_option_a_v2.sql — force re-create (v2) to ensure state convergence
- verify-discord-rls-option-a.cjs — verification script using service-role and REST fallbacks (v_rls_status / v_pg_policies)
- local8080/help/discord-rls-option-a.md — narrative guide for Discord RLS Option A

## What the migrations do
1) 20250817110000_update_discord_rls_option_a.sql
   - Drops legacy policies and creates two policies per table:
     - <table>_service_role_all: FOR ALL with USING/WITH CHECK = service_role
     - <table>_super_admin_manage: FOR ALL with USING/WITH CHECK = authenticated + JWT role super_admin
   - Enables RLS on all Discord tables.

2) 20250817113000_force_recreate_discord_rls_option_a.sql
   - Drops and recreates the Option A policies for the five Discord tables.

3) 20250817114000_create_rls_introspection_views.sql
   - Creates public views v_rls_status and v_pg_policies to safely expose RLS status/policies over REST.
   - Grants SELECT on those views to authenticated and service_role.

4) 20250817115000_cleanup_discord_rls_option_a.sql
   - Removes any extra/legacy policies that are not part of Option A.

5) 20250823120000_force_recreate_discord_rls_option_a_v2.sql
   - Force re-creates the two Option A policies per table to ensure exact state.

## Verification process
- Run: node verify-discord-rls-option-a.cjs
- The script checks each of the five tables for:
  - RLS enabled = YES
  - Exactly two policies present: _service_role_all and _super_admin_manage
- If direct introspection of pg_* catalog tables is blocked, it uses REST with the helper views v_rls_status and v_pg_policies.

## Deploy steps
1) supabase db push — to apply migrations to the linked remote project.
2) node verify-discord-rls-option-a.cjs — to confirm RLS status and policies.

## Notes
- Teachers/directors continue to use the app normally, but they do not have special DB-level access to Discord tables. Super Admins and service_role own management via Option A.
- If any drift occurs (new or legacy policies appear), re-run the v2 force-recreate migration and then re-verify.