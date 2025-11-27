# AgriConnect Communication Setup Guide
**WhatsApp, SMS, and Email Configuration**

---

## Overview

This guide walks you through setting up the three communication channels in AgriConnect:
- 📧 **Email Alerts** (via Resend API)
- 📱 **SMS Alerts** (via Twilio API)
- 💬 **WhatsApp Bot** (requires additional backend)

---

## 📧 Part 1: Email Alerts Setup

### Prerequisites
- Supabase project deployed
- Valid email address for receiving alerts

### Step 1: Create Resend Account

1. Go to: **https://resend.com**
2. Click "Get Started" and sign up (free tier: 100 emails/day)
3. Verify your email address
4. Complete onboarding

### Step 2: Get API Key

1. In Resend dashboard, go to **API Keys**
2. Click "Create API Key"
3. Name it: `AgriConnect Production`
4. Copy the API key (starts with `re_`)
5. **Save it securely** - you won't see it again

### Step 3: Configure Domain (Optional but Recommended)

**For Production:**
1. API Keys → Domains → Add Domain
2. Enter your domain (e.g., `agriconnect.app`)
3. Add DNS records to your domain provider
4. Verify domain

**For Testing:**
- Skip this step - use Resend's test domain
- Test emails will have "via resend.dev" in sender

### Step 4: Add API Key to Supabase

1. Go to your Supabase project: **https://supabase.com/dashboard**
2. Navigate to: **Settings** → **Edge Functions** → **Secrets**
3. Click "Add Secret"
4. Enter:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_your_actual_api_key_here`
5. Click "Save"

### Step 5: Deploy Email Edge Function

```bash
# Navigate to project directory
cd /home/user/AgriConnect-CMR

# Login to Supabase (if not already)
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the email function
supabase functions deploy send-alert-email

# Verify deployment
supabase functions list
```

### Step 6: Configure in Dashboard

1. Open AgriConnect dashboard in browser
2. Navigate to: **Settings** → **Email Alert Settings**
3. Enter your email address
4. Check "Enable Email Alerts"
5. Click "Save Settings"
6. Click "Send Test Email" button
7. Check your inbox (and spam folder)

### Verification Checklist

- [ ] Resend account created
- [ ] API key generated and saved
- [ ] API key added to Supabase secrets
- [ ] Edge function deployed successfully
- [ ] Email address configured in dashboard
- [ ] Test email received successfully

---

## 📱 Part 2: SMS Alerts Setup

### Prerequisites
- Supabase project deployed
- Phone number for receiving SMS (E.164 format)
- Credit card for Twilio verification (won't be charged initially)

### Step 1: Create Twilio Account

1. Go to: **https://www.twilio.com/try-twilio**
2. Sign up for free trial
3. Verify your email
4. Verify your phone number (you'll receive a verification code)
5. Complete the questionnaire:
   - Use case: "Alerts & Notifications"
   - Language: "JavaScript"
   - Product: "SMS"

### Step 2: Get Free Trial Credits

- Free trial includes **$15 credit**
- Enough for ~2,000 SMS messages
- Can send to verified numbers only during trial
- Upgrade to send to any number

### Step 3: Get Phone Number

1. In Twilio Console, go to: **Phone Numbers** → **Manage** → **Buy a number**
2. Select country (e.g., Cameroon +237 or USA +1)
3. Check "SMS" capability
4. Click "Search"
5. Choose a number
6. Click "Buy" (uses trial credit, no charge)
7. **Copy the phone number** (format: +1234567890)

### Step 4: Get API Credentials

1. Twilio Console → **Account** → **API keys & tokens**
2. Find and copy:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click "Show" to reveal)
3. **Save both securely**

### Step 5: Add Credentials to Supabase

1. Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**
2. Add three secrets:

**Secret 1:**
- Name: `TWILIO_ACCOUNT_SID`
- Value: `ACxxxxxxxxxxxxxxxxxxxxxx` (your Account SID)

**Secret 2:**
- Name: `TWILIO_AUTH_TOKEN`
- Value: `your_auth_token_here`

**Secret 3:**
- Name: `TWILIO_PHONE_NUMBER`
- Value: `+1234567890` (the number you purchased)

3. Click "Save" for each

### Step 6: Deploy SMS Edge Function

```bash
# Navigate to project directory
cd /home/user/AgriConnect-CMR

# Deploy the SMS function
supabase functions deploy send-sms-alert

# Verify deployment
supabase functions list
```

### Step 7: Verify Phone Number (Trial Accounts Only)

If using trial account, verify recipient phone numbers:

1. Twilio Console → **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Click "Add a new number"
3. Enter your phone number (E.164 format: +237670123456)
4. Choose "Text Message" verification
5. Enter the code you receive
6. Repeat for any other numbers that should receive alerts

### Step 8: Configure in Dashboard

1. Open AgriConnect dashboard
2. Navigate to: **Settings** → **SMS Alert Settings**
3. Enter phone number in E.164 format: `+237670000000`
4. Check "Enable SMS Alerts"
5. Click "Save Settings"
6. Click "Send Test SMS" button
7. Check your phone for test message

### Verification Checklist

- [ ] Twilio account created
- [ ] Phone number purchased
- [ ] Account SID and Auth Token copied
- [ ] All three secrets added to Supabase
- [ ] Edge function deployed successfully
- [ ] Recipient phone verified (if trial account)
- [ ] Phone number configured in dashboard
- [ ] Test SMS received successfully

### Cost Optimization Tips

- **SMS only for critical alerts** (low battery, sensor failure, critical temps)
- **Use email for routine alerts** (daily summaries, warnings)
- **Typical costs:**
  - USA: ~$0.0075/SMS
  - Cameroon: ~$0.04/SMS
  - Europe: ~$0.01-0.02/SMS
- **Upgrade when ready:** Remove trial restrictions, send to any number

---

## 💬 Part 3: WhatsApp Bot Setup

### Current Status

⚠️ **WhatsApp integration requires additional backend infrastructure** that is not currently deployed.

The WhatsApp bot code exists in the dashboard but operates in **simulation mode** only:
- ✅ UI is functional
- ✅ Commands are processed
- ✅ Responses are generated
- ❌ No actual WhatsApp messages are sent
- ❌ Messages appear as dashboard notifications only

### Options for Real WhatsApp Integration

#### Option A: Meta WhatsApp Business API (Official, Free, Complex)

**Pros:**
- Official Meta solution
- Free messaging (first 1,000/month)
- Full feature access

**Cons:**
- Requires business verification
- Complex setup process
- Approval can take weeks
- Need webhook server infrastructure

**Requirements:**
1. Facebook Business Account
2. Meta Developer Account
3. Verified business information
4. Approved WhatsApp Business API access
5. Server to handle webhooks (Node.js/Python)
6. SSL certificate for webhook URL

**Setup Process:**
1. Apply at: https://business.facebook.com/wa/manage/home
2. Complete business verification
3. Wait for WhatsApp API approval
4. Set up webhook server
5. Configure Meta app credentials
6. Build `/api/whatsapp/send` endpoint
7. Test with sandbox number
8. Deploy to production

**Estimated Time:** 2-4 weeks (including approval)

---

#### Option B: Twilio WhatsApp API (Easier, Paid)

**Pros:**
- Faster setup (hours vs weeks)
- Same Twilio account as SMS
- Good documentation
- Reliable infrastructure

**Cons:**
- Cost per message (~$0.005/message)
- Still requires backend API

**Requirements:**
1. Twilio account (already have from SMS setup)
2. Node.js backend server
3. Public URL for webhooks

**Setup Process:**

1. **Enable WhatsApp in Twilio:**
   - Twilio Console → Messaging → Try it Out → Send a WhatsApp message
   - Join sandbox: Send code to WhatsApp number
   - Or request production WhatsApp number

2. **Create Backend API** (needs separate server):

```javascript
// Example Node.js endpoint: /api/whatsapp/send
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.post('/api/whatsapp/send', async (req, res) => {
  const { to, message } = req.body;

  try {
    const result = await client.messages.create({
      from: 'whatsapp:+14155238886', // Twilio WhatsApp number
      to: `whatsapp:${to}`,
      body: message
    });

    res.json({ success: true, sid: result.sid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

3. **Deploy backend server:**
   - Use Vercel, Heroku, Railway, or VPS
   - Set environment variables
   - Get public URL

4. **Update Dashboard Config:**
   - Edit `dashboard/public/js/whatsapp-bot.js`
   - Change API endpoint from `/api/whatsapp/send` to your server URL

5. **Test:**
   - Open dashboard
   - Enable WhatsApp bot in settings
   - Send test command
   - Verify WhatsApp message received

**Cost:** ~$0.005 per message (200 messages = $1)

---

#### Option C: Keep Simulation Mode (No Setup Required)

**Best for:**
- Testing and development
- Demos and presentations
- When WhatsApp integration is not critical

**Current Behavior:**
- All WhatsApp commands work
- Responses shown as dashboard notifications
- No actual messages sent
- No backend required

**To Use:**
1. Dashboard → Settings → WhatsApp Bot
2. Enable WhatsApp integration
3. Enter phone number (for simulation)
4. Commands will process and show results in notifications

---

### Recommendation

**Short-term (Next 1-2 weeks):**
- ✅ Set up Email alerts (free, easy)
- ✅ Set up SMS alerts (trial credit, moderate)
- ⏸️ Keep WhatsApp in simulation mode

**Medium-term (1-2 months):**
- If WhatsApp is critical → Use Twilio WhatsApp API
- Build simple Node.js backend
- Deploy on Vercel/Railway (free tier)

**Long-term (3+ months):**
- Apply for Meta WhatsApp Business API
- Build production webhook infrastructure
- Migrate from Twilio to free Meta solution

---

## 🔧 Troubleshooting

### Email Issues

**Test email not received:**
- Check spam/junk folder
- Verify RESEND_API_KEY is correct in Supabase
- Check Supabase Edge Function logs
- Verify domain is verified (if using custom domain)

**"Failed to send email" error:**
- Check Resend dashboard for error logs
- Verify API key hasn't expired
- Check free tier limits (100/day)
- Try from Resend dashboard directly

### SMS Issues

**Test SMS not received:**
- Verify phone number format (E.164: +237670000000)
- Check if number is verified (trial accounts only)
- Verify all three Twilio secrets in Supabase
- Check Twilio console logs

**"Invalid phone number" error:**
- Must use E.164 format (+country code + number)
- No spaces, dashes, or parentheses
- Example: +237670123456 (not 670-123-456)

**SMS sent but not received:**
- Trial accounts can only send to verified numbers
- Check Twilio console → Logs → Messages
- Verify delivery status
- Check phone carrier spam filtering

### WhatsApp Issues

**Commands not working:**
- WhatsApp is in simulation mode - this is expected
- Check browser console for errors
- Verify WhatsApp bot is enabled in settings

**Want real WhatsApp messages:**
- Follow Option B (Twilio) or Option C (Meta) above
- Backend API required - not included by default

---

## 📊 Testing All Services

### Email Alert Test
```bash
# From dashboard:
Settings → Email Alerts → Send Test Email
# Expected: Email received with sensor data
```

### SMS Alert Test
```bash
# From dashboard:
Settings → SMS Alerts → Send Test SMS
# Expected: SMS received with alert message
```

### WhatsApp Bot Test
```bash
# From dashboard:
Settings → WhatsApp → Enable
# Type: "status"
# Expected: Dashboard notification with farm status
```

---

## 🎯 Next Steps

1. **Email:** Follow Part 1 → Test → Enable critical alerts
2. **SMS:** Follow Part 2 → Test → Enable critical alerts only (cost management)
3. **WhatsApp:**
   - Use simulation mode for now
   - Plan backend deployment if needed
   - Apply for Meta API if long-term need

---

## 📚 Additional Resources

- **Resend Docs:** https://resend.com/docs
- **Twilio SMS Docs:** https://www.twilio.com/docs/sms
- **Twilio WhatsApp Docs:** https://www.twilio.com/docs/whatsapp
- **Meta WhatsApp API:** https://developers.facebook.com/docs/whatsapp
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions

---

## 💡 Cost Estimates

### Email (Resend)
- **Free Tier:** 100 emails/day = 3,000/month
- **Paid Tier:** $20/month = 50,000 emails
- **Typical Usage:** 50-100 emails/month (alerts only)
- **Monthly Cost:** $0 (free tier sufficient)

### SMS (Twilio)
- **Free Trial:** $15 credit (~2,000 SMS in Cameroon)
- **Pay-as-you-go:** ~$0.04/SMS (Cameroon)
- **Typical Usage:** 30-50 critical alerts/month
- **Monthly Cost:** ~$2-3 after trial

### WhatsApp (Twilio)
- **Cost:** ~$0.005/message
- **Typical Usage:** 100 messages/month
- **Monthly Cost:** ~$0.50

### WhatsApp (Meta - Official)
- **Cost:** Free for first 1,000 conversations/month
- **Typical Usage:** Well under 1,000
- **Monthly Cost:** $0 (if approved)

---

**Total Monthly Cost Estimate:** $2-5 (mainly SMS)
**Setup Time:** 1-2 hours (Email + SMS only)

---

*Last Updated: 2025-11-27*
*AgriConnect Platform v1.0*
