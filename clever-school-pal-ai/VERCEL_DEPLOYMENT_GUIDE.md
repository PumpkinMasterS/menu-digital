# Vercel Deployment Guide

## Overview
This guide explains how to deploy two separate projects:
1. **Landing Page** (`site` folder) → `connectai.pt`
2. **Main Webapp** (root folder) → `app.connectai.pt`

## Prerequisites
- Vercel CLI installed: `npm i -g vercel`
- Vercel account created
- Domain `connectai.pt` registered and accessible

## Step 1: Deploy Landing Page (connectai.pt)

### 1.1 Navigate to site folder
```bash
cd site
```

### 1.2 Deploy to Vercel
```bash
vercel --prod
```

### 1.3 Configure project settings
- **Project Name**: `connectai-landing`
- **Framework**: Static Site
- **Root Directory**: `.` (current directory)
- **Build Command**: Leave empty (static files)
- **Output Directory**: `.` (current directory)

### 1.4 Add custom domain
```bash
vercel domains add connectai.pt
```

## Step 2: Deploy Main Webapp (app.connectai.pt)

### 2.1 Navigate to project root
```bash
cd ..
```

### 2.2 Deploy to Vercel
```bash
vercel --prod
```

### 2.3 Configure project settings
- **Project Name**: `connectai-webapp`
- **Framework**: Vite
- **Root Directory**: `.` (current directory)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2.4 Add custom domain
```bash
vercel domains add app.connectai.pt
```

## Step 3: Configure DNS Settings

### 3.1 For connectai.pt (Landing Page)
Add these DNS records in your domain registrar:
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### 3.2 For app.connectai.pt (Webapp)
Add these DNS records in your domain registrar:
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

## Step 4: Environment Variables (Webapp Only)

Set environment variables for the webapp:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

Values:
- `VITE_SUPABASE_URL`: `https://nsaodmuqjtabfblrrdqv.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NTY3NjAsImV4cCI6MjA2MzIzMjc2MH0.UpuMCwfwPs33g8dG60DU0kXmJqu2DoVrhXvL0igRPyE`

## Step 5: Alternative Deployment via Vercel Dashboard

### 5.1 Landing Page Deployment
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub: `https://github.com/PumpkinMasterS/clever-school-pal-ai`
4. Configure:
   - **Project Name**: `connectai-landing`
   - **Framework Preset**: Other
   - **Root Directory**: `site`
   - **Build Command**: Leave empty
   - **Output Directory**: `.`
5. Deploy
6. Go to Project Settings → Domains
7. Add `connectai.pt`

### 5.2 Webapp Deployment
1. Click "New Project" again
2. Import the same repository
3. Configure:
   - **Project Name**: `connectai-webapp`
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy
6. Go to Project Settings → Domains
7. Add `app.connectai.pt`

## Step 6: Verification

### 6.1 Test deployments
- Visit `https://connectai.pt` → Should show landing page
- Visit `https://app.connectai.pt` → Should show webapp

### 6.2 Check SSL certificates
Both domains should automatically get SSL certificates from Vercel.

## Step 7: Continuous Deployment

Both projects will automatically redeploy when you push changes to the main branch on GitHub.

## Troubleshooting

### Domain not working
1. Check DNS propagation: `nslookup connectai.pt`
2. Wait up to 48 hours for DNS propagation
3. Verify CNAME records are correct

### Build failures
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify environment variables are set correctly

### SSL issues
1. SSL certificates are automatically provisioned
2. If issues persist, contact Vercel support

## File Structure
```
clever-school-pal-ai/
├── site/                    # Landing page (connectai.pt)
│   ├── vercel.json         # Landing page config
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── src/                     # Webapp source (app.connectai.pt)
├── dist/                    # Webapp build output
├── vercel.json             # Webapp config
├── package.json
└── vite.config.ts
```

## Summary
- **Landing Page**: Static site deployment from `site` folder
- **Webapp**: Vite React app deployment from root folder
- **Domains**: Custom domains with automatic SSL
- **CI/CD**: Automatic deployments from GitHub