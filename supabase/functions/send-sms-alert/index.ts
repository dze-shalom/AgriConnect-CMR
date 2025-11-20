// Supabase Edge Function for sending SMS alerts via Twilio
// Deploy: supabase functions deploy send-sms-alert

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || ''
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || ''
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface SMSAlertRequest {
  alertType: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  recipientPhone: string
  farmId: string
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    // Parse request body
    const { alertType, severity, message, recipientPhone, farmId }: SMSAlertRequest = await req.json()

    // Validate inputs
    if (!alertType || !message || !recipientPhone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(recipientPhone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Prepare SMS content
    const severityEmoji = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    }[severity] || '📢'

    const smsBody = `${severityEmoji} AgriConnect Alert\n\n${alertType}\n${message}\n\nFarm: ${farmId}\n${new Date().toLocaleString()}`

    // Truncate message if too long (SMS limit is 160 chars for single, 1600 for concatenated)
    const truncatedMessage = smsBody.length > 1600
      ? smsBody.substring(0, 1597) + '...'
      : smsBody

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

    const formData = new URLSearchParams()
    formData.append('To', recipientPhone)
    formData.append('From', TWILIO_PHONE_NUMBER)
    formData.append('Body', truncatedMessage)

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
      },
      body: formData
    })

    const twilioData = await twilioResponse.json()

    if (!twilioResponse.ok) {
      // Log failed SMS to database
      await supabase
        .from('sms_alerts_log')
        .insert({
          alert_type: alertType,
          severity,
          message: truncatedMessage,
          recipient_phone: recipientPhone,
          farm_id: farmId,
          sent_at: new Date().toISOString(),
          delivery_status: 'failed',
          error_message: twilioData.message || 'Unknown error'
        })

      throw new Error(`Twilio API error: ${twilioData.message || 'Unknown error'}`)
    }

    // Log successful SMS to database
    const { error: logError } = await supabase
      .from('sms_alerts_log')
      .insert({
        alert_type: alertType,
        severity,
        message: truncatedMessage,
        recipient_phone: recipientPhone,
        farm_id: farmId,
        sent_at: new Date().toISOString(),
        delivery_status: twilioData.status === 'queued' || twilioData.status === 'sent' ? 'sent' : 'pending',
        twilio_sid: twilioData.sid
      })

    if (logError) {
      console.error('Failed to log SMS alert:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioData.sid,
        status: twilioData.status,
        message: 'SMS alert sent successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
