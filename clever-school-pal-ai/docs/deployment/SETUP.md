# Connect AI - Setup Guide

## Overview

Connect AI is an AI-powered educational platform that integrates WhatsApp bots with content management for schools. This guide will help you set up the complete system.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   External      │
│   (React)       │◄──►│   (Database +   │◄──►│   Services      │
│                 │    │   Edge Functions)│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                │
                                                ├─ Ollama (AI)
                                                ├─ WhatsApp API
                                                └─ ngrok (tunnel)
```

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- WhatsApp Business API access
- Ollama installed locally
- ngrok account (for local development)

## Step 1: Database Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and API keys
3. Enable the `vector` extension in SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 1.2 Run Database Migrations

Execute the migration file `supabase/migrations/20240120000001_add_ai_features.sql` in your Supabase SQL Editor.

This will create:

- Vector embeddings support
- Chat logs table
- Bot configuration table
- Semantic search functions
- Proper indexes and RLS policies

## Step 2: Local AI Setup (Ollama)

### 2.1 Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

### 2.2 Download Required Models

```bash
# Download the AI model for responses
ollama pull mistral:7b

# Download the embedding model
ollama pull mxbai-embed-large
```

### 2.3 Start Ollama Server

```bash
ollama serve
```

The server will run on `http://localhost:11434`

### 2.4 Expose Ollama via ngrok

```bash
# Install ngrok if not already installed
npm install -g ngrok

# Create tunnel to Ollama
ngrok http 11434
```

Copy the public URL (e.g., `https://abc123.ngrok-free.app`)

## Step 3: Environment Configuration

### 3.1 Create Supabase Environment File

Create `supabase/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Ollama Configuration (use ngrok URL)
OLLAMA_API_URL=https://your-ngrok-url.ngrok-free.app

# WhatsApp Configuration
WHATSAPP_TOKEN=your-webhook-verify-token
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

# Optional: Additional configuration
AI_MODEL=mistral:7b
EMBEDDING_MODEL=mxbai-embed-large
```

### 3.2 Update Frontend Configuration

Update `src/integrations/supabase/client.ts` with your Supabase credentials.

## Step 4: Deploy Edge Functions

### 4.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 4.2 Login and Link Project

```bash
supabase login
supabase link --project-ref your-project-ref
```

### 4.3 Deploy Functions

```bash
# Deploy all Edge Functions
supabase functions deploy generate-content-embedding --env-file ./supabase/.env
supabase functions deploy ai-query --env-file ./supabase/.env
supabase functions deploy whatsapp-webhook --env-file ./supabase/.env
```

## Step 5: WhatsApp Integration

### 5.1 Set Up WhatsApp Business API

1. Create a Meta Developer account
2. Create a WhatsApp Business app
3. Get your access token and phone number ID
4. Configure webhook URL: `https://your-project.supabase.co/functions/v1/whatsapp-webhook`

### 5.2 Configure Webhook

In Meta Developer Console:

- Webhook URL: `https://your-project.supabase.co/functions/v1/whatsapp-webhook`
- Verify Token: Use the same value as `WHATSAPP_TOKEN` in your env file
- Subscribe to `messages` events

## Step 6: Frontend Setup

### 6.1 Install Dependencies

```bash
npm install
```

### 6.2 Start Development Server

```bash
npm run dev
```

### 6.3 Access the Application

Open `http://localhost:5173` and login with:

- Email: `admin@educonnect.com`
- Password: `admin123`

## Step 7: Initial Configuration

### 7.1 Create School Data

1. Go to "Escolas" and create your first school
2. Add classes (turmas) to the school
3. Add subjects (disciplinas) for each class
4. Add students with their WhatsApp phone numbers

### 7.2 Configure Bot Settings

1. Go to "Bot IA" in the sidebar
2. Configure:
   - WhatsApp phone number and access token
   - Ollama URL (your ngrok URL)
   - AI model settings
   - Response parameters

### 7.3 Add Content

1. Go to "Materiais" (Contents)
2. Create educational content for your subjects
3. Content will automatically be vectorized for AI search

## Step 8: Testing

### 8.1 Test AI Functionality

1. Go to "Bot IA" → "Testes" tab
2. Enter a test phone number and question
3. Verify the AI responds correctly

### 8.2 Test WhatsApp Integration

1. Send a message from a registered student's WhatsApp to your bot number
2. Check that the bot responds with relevant content

## Troubleshooting

### Common Issues

1. **Embedding Generation Fails**

   - Check if Ollama is running
   - Verify ngrok tunnel is active
   - Check OLLAMA_API_URL in environment

2. **WhatsApp Messages Not Received**

   - Verify webhook URL is correct
   - Check webhook verification token
   - Ensure WhatsApp Business API is properly configured

3. **Database Errors**
   - Check if vector extension is enabled
   - Verify RLS policies are correctly set
   - Ensure migrations have been run

### Logs and Debugging

- Check Supabase Edge Function logs in the dashboard
- Monitor ngrok traffic for Ollama requests
- Use browser developer tools for frontend issues

## Production Deployment

### Frontend Deployment

The frontend can be deployed to:

- Vercel (recommended)
- Netlify
- Any static hosting service

### Backend Considerations

- Use a production Ollama deployment instead of ngrok
- Set up proper monitoring and logging
- Configure backup strategies for your database
- Implement proper security measures

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Implement proper authentication in production
- Regularly update dependencies
- Monitor for unusual activity

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Supabase and Ollama documentation
3. Check the project's GitHub issues

---

## Quick Start Checklist

- [ ] Supabase project created and configured
- [ ] Database migrations executed
- [ ] Ollama installed and models downloaded
- [ ] ngrok tunnel created for Ollama
- [ ] Environment variables configured
- [ ] Edge Functions deployed
- [ ] WhatsApp Business API configured
- [ ] Frontend running locally
- [ ] School, classes, and students created
- [ ] Bot configuration completed
- [ ] Content added and vectorized
- [ ] End-to-end testing completed

Once all items are checked, your Connect AI platform should be fully operational!
