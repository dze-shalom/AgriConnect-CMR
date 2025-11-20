# Cloud Account Setup Guide

**Date:** 2025-10-21  
**Phase:** 1  
**Time Required:** ~1 hour

## Overview
This guide walks through setting up all free cloud services needed for AgriConnect.

## Prerequisites
- Valid email address (professional recommended)
- Strong password manager
- GitHub account
- Stable internet connection

## Account Setup Checklist

### 1. Supabase (Database & Auth)

**Purpose:** PostgreSQL database + authentication  
**Free Tier:** 500MB database, 50MB file storage, 2GB bandwidth

**Steps:**
1. Go to: https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended)
4. Create organization: "AgriConnect Ltd"
5. Create project:
   - Name: `agriconnect-production`
   - Password: [Generate strong password]
   - Region: `Europe (Frankfurt)` or nearest
6. Wait 2-3 minutes for provisioning
7. Save credentials:
   - Project URL
   - Anon key
   - Service role key
8. ✅ Done - verify you can access dashboard

**Verification:**
- [ ] Can log into Supabase dashboard
- [ ] Project shows as "Active"
- [ ] Credentials saved in credentials.md

---

### 2. HiveMQ Cloud (MQTT Broker)

**Purpose:** Cloud MQTT broker for real-time messaging  
**Free Tier:** 100 concurrent connections

**Steps:**
1. Go to: https://console.hivemq.cloud
2. Sign up with business email
3. Verify email
4. Create cluster:
   - Name: `agriconnect-mqtt`
   - Plan: `Free`
   - Region: `EU-Central (Frankfurt)`
5. Wait 2-3 minutes
6. Access Management → Create credentials:
   - Username: `gateway_client`
   - Password: [Generate strong password]
   - Permissions: All topics (#)
7. Save credentials:
   - Cluster URL
   - Port (8883)
   - Username
   - Password
8. ✅ Done

**Verification:**
- [ ] Cluster status is "Running"
- [ ] Can see cluster URL
- [ ] Credentials created and saved

---

### 3. Vercel (Dashboard Hosting)

**Purpose:** Host web dashboard  
**Free Tier:** Unlimited personal projects

**Steps:**
1. Go to: https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel
4. Skip project import for now
5. ✅ Done - account ready for deployment

**Verification:**
- [ ] Account created
- [ ] GitHub connected
- [ ] Ready to deploy projects

---

### 4. GitHub (Version Control)

**Purpose:** Code repository and collaboration

**Steps:**
1. Go to: https://github.com
2. Sign up if needed
3. Create new repository:
   - Name: `agriconnect-platform`
   - Visibility: `Private`
   - Initialize with README: ✓
   - .gitignore: `Arduino`
4. Clone locally:
```bash
   git clone https://github.com/[username]/agriconnect-platform.git
```
5. ✅ Done

**Verification:**
- [ ] Repository created
- [ ] Cloned to local computer
- [ ] Can commit and push

---

### 5. Mapbox (Maps - Optional for Phase 1)

**Purpose:** Interactive maps  
**Free Tier:** 50,000 map views/month

**Steps:**
1. Go to: https://mapbox.com
2. Sign up with email
3. Verify email
4. Go to Account → Access Tokens
5. Copy default public token
6. Save token
7. ✅ Done (will use in Phase 2)

---

## Post-Setup Tasks

**Immediate:**
1. Fill in `credentials.md` with all saved information
2. Store backup in password manager
3. Test login to each service
4. Take screenshot of each dashboard

**Within 24 hours:**
5. Enable 2FA on all accounts (security)
6. Add backup email addresses
7. Review free tier limits
8. Set up usage alerts

## Troubleshooting

**Issue: Supabase project won't create**
- Solution: Check internet connection, try different browser, wait 5 minutes

**Issue: HiveMQ cluster stuck "Creating"**
- Solution: Wait up to 5 minutes, refresh page, contact support if >10 minutes

**Issue: Vercel won't connect to GitHub**
- Solution: Revoke and re-authorize in GitHub settings

## Next Steps
After all accounts are set up:
1. ✅ Review credentials.md - all fields filled
2. → Proceed to database schema design
3. → Configure MQTT topics
4. → Update gateway firmware

## Support
- Supabase: https://supabase.com/docs
- HiveMQ: https://console.hivemq.cloud/support
- Vercel: https://vercel.com/docs
