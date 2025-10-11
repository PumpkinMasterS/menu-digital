# Environment Configuration Guide

## Frontend Environment Variables

Create a `.env.local` file in your project root with these variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://nsaodmuqjtabfblrrdqv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NTY3NjAsImV4cCI6MjA2MzIzMjc2MH0.UpuMCwfwPs33g8dG60DU0kXmJqu2DoVrhXvL0igRPyE

# Development Configuration
VITE_APP_ENV=development
VITE_ENABLE_MOCK_AUTH=true
VITE_DEBUG_MODE=true

# AI Configuration (optional - for display purposes)
VITE_AI_MODEL=Llama-4-Scout-109B-Instruct
VITE_EMBEDDING_MODEL=E5-Mistral-7B-Instruct
```

## Backend Environment Variables (Supabase Edge Functions)

Update your `supabase/.env` file (or create it):

```env
# Supabase Configuration
SUPABASE_URL=https://nsaodmuqjtabfblrrdqv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY1Njc2MCwiZXhwIjoyMDYzMjMyNzYwfQ.5q7JE1V3wD2722I5b4FJ7js4P61jZ3JtnpdA5So2FhY
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NTY3NjAsImV4cCI6MjA2MzIzMjc2MH0.UpuMCwfwPs33g8dG60DU0kXmJqu2DoVrhXvL0igRPyE

# OpenRouter Configuration (IA Provider)
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# AI Model Configuration (OpenRouter)
AI_MODEL=meta-llama/llama-3.1-70b-instruct
EMBEDDING_MODEL=snowflake/snowflake-arctic-embed-l

# WhatsApp Configuration
WHATSAPP_TOKEN=your-webhook-verify-token
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

# Optional: Additional configuration
DEFAULT_MAX_TOKENS=512
DEFAULT_TEMPERATURE=0.3
DEFAULT_TOP_P=0.9
RESPONSE_CACHE_TTL=3600
```

## Security Notes

### Frontend (Safe for Browser)
- ✅ `VITE_SUPABASE_ANON_KEY`: Safe to expose, protected by Row Level Security
- ✅ `VITE_SUPABASE_URL`: Public endpoint URL
- ⚠️ All `VITE_*` variables are exposed in the browser

### Backend (Server-Only)
- 🔒 `SUPABASE_SERVICE_ROLE_KEY`: **NEVER expose to frontend** - bypasses RLS
- 🔒 `OPENROUTER_API_KEY`: Keep secret, for server-side AI requests only
- 🔒 `WHATSAPP_ACCESS_TOKEN`: WhatsApp API credentials

## Setup Steps

1. **Frontend Setup**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your values
   npm run dev
   ```

2. **Backend Setup**:
   ```bash
   cd supabase
   cp env.example .env
   # Edit .env with your values
   supabase functions deploy --env-file .env
   ```

3. **Verify Configuration**:
   - Frontend should connect to Supabase without errors
   - Check browser console for successful authentication
   - Test storage bucket creation
   - Verify edge functions are working

## Troubleshooting

### Common Issues

1. **Storage Bucket Errors**: Ensure you have the correct permissions and the bucket name is unique
2. **Authentication Issues**: Check that your anon key is correct and RLS policies are configured
3. **Environment Variables Not Loading**: Ensure `.env.local` is in the project root and variables start with `VITE_`

### Debug Mode

Enable debug logging by setting:
```env
VITE_DEBUG_MODE=true
```

This will show detailed logs in the browser console for:
- 🔐 Authentication events
- 📦 Storage operations  
- 🗄️ Database queries
- 🤖 AI requests