// Supabase Edge Function for sending email alerts
// Deploy: supabase functions deploy send-alert-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface AlertEmailRequest {
  alertType: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  sensorData?: any
  recipientEmail: string
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
    const { alertType, severity, message, sensorData, recipientEmail, farmId }: AlertEmailRequest = await req.json()

    // Validate inputs
    if (!alertType || !message || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Log alert to database
    const { error: logError } = await supabase
      .from('alert_emails_log')
      .insert({
        alert_type: alertType,
        severity,
        message,
        recipient: recipientEmail,
        farm_id: farmId,
        sent_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to log alert:', logError)
    }

    // Prepare email content
    const emailSubject = `[${severity.toUpperCase()}] ${alertType} - ${farmId}`
    const emailBody = generateEmailHTML(alertType, severity, message, sensorData, farmId)

    // Send email via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'AgriConnect Alerts <alerts@agriconnect.app>',
        to: recipientEmail,
        subject: emailSubject,
        html: emailBody
      })
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      throw new Error(`Email send failed: ${errorData}`)
    }

    const emailData = await emailResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        messageId: emailData.id,
        message: 'Email alert sent successfully'
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

// Generate HTML email template
function generateEmailHTML(
  alertType: string,
  severity: string,
  message: string,
  sensorData: any,
  farmId: string
): string {
  const severityColor = {
    critical: '#D32F2F',
    warning: '#F57C00',
    info: '#1976D2'
  }[severity] || '#666'

  const severityIcon = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️'
  }[severity] || '📢'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgriConnect Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🌱 AgriConnect
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">
                Farm Monitoring System
              </p>
            </td>
          </tr>

          <!-- Alert Badge -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <div style="background-color: ${severityColor}; color: #ffffff; padding: 15px; border-radius: 6px; text-align: center;">
                <span style="font-size: 24px;">${severityIcon}</span>
                <h2 style="margin: 10px 0 0 0; font-size: 18px; font-weight: 600; text-transform: uppercase;">
                  ${severity} Alert
                </h2>
              </div>
            </td>
          </tr>

          <!-- Alert Details -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid ${severityColor}; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">
                  ${alertType}
                </h3>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                  ${message}
                </p>
              </div>
            </td>
          </tr>

          <!-- Sensor Data (if available) -->
          ${sensorData ? `
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Current Sensor Readings</h3>
              <table width="100%" cellpadding="10" style="border-collapse: collapse;">
                ${sensorData.air_temperature ? `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="color: #666; font-size: 14px;">🌡️ Temperature</td>
                  <td style="color: #333; font-size: 14px; font-weight: 600; text-align: right;">
                    ${sensorData.air_temperature.toFixed(1)}°C
                  </td>
                </tr>
                ` : ''}
                ${sensorData.air_humidity ? `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="color: #666; font-size: 14px;">💧 Humidity</td>
                  <td style="color: #333; font-size: 14px; font-weight: 600; text-align: right;">
                    ${sensorData.air_humidity.toFixed(1)}%
                  </td>
                </tr>
                ` : ''}
                ${sensorData.soil_moisture ? `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="color: #666; font-size: 14px;">🌱 Soil Moisture</td>
                  <td style="color: #333; font-size: 14px; font-weight: 600; text-align: right;">
                    ${sensorData.soil_moisture}
                  </td>
                </tr>
                ` : ''}
                ${sensorData.battery_level ? `
                <tr>
                  <td style="color: #666; font-size: 14px;">🔋 Battery</td>
                  <td style="color: #333; font-size: 14px; font-weight: 600; text-align: right;">
                    ${sensorData.battery_level}%
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Action Button -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="https://agriconnect.app/dashboard"
                 style="display: inline-block; background-color: #4CAF50; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                View Dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; border-top: 1px solid #eee;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #999; font-size: 12px;">
                    <strong>Farm ID:</strong> ${farmId}
                  </td>
                  <td style="color: #999; font-size: 12px; text-align: right;">
                    ${new Date().toLocaleString()}
                  </td>
                </tr>
              </table>
              <p style="margin: 15px 0 0 0; color: #999; font-size: 11px; text-align: center;">
                This is an automated alert from AgriConnect Farm Monitoring System.<br>
                To unsubscribe from alerts, please contact your farm administrator.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}
