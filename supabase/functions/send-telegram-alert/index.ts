// Supabase Edge Function for sending Telegram alerts
// Deploy: supabase functions deploy send-telegram-alert

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface TelegramAlertRequest {
  alertType: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  sensorData?: any
  chatId?: string
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
    const { alertType, severity, message, sensorData, chatId, farmId }: TelegramAlertRequest = await req.json()

    // Validate inputs
    if (!alertType || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Use provided chatId or default from env
    const targetChatId = chatId || TELEGRAM_CHAT_ID

    if (!targetChatId) {
      return new Response(
        JSON.stringify({ error: 'No chat ID provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Format message with severity indicator
    const severityEmoji = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    }[severity] || '📢'

    let telegramMessage = `${severityEmoji} <b>AgriConnect Alert</b>\n\n`
    telegramMessage += `<b>${alertType}</b>\n`
    telegramMessage += `${message}\n\n`

    // Add sensor data if available
    if (sensorData) {
      telegramMessage += `<b>Sensor Readings:</b>\n`
      if (sensorData.air_temperature) telegramMessage += `🌡️ Temperature: ${sensorData.air_temperature.toFixed(1)}°C\n`
      if (sensorData.air_humidity) telegramMessage += `💧 Humidity: ${sensorData.air_humidity.toFixed(1)}%\n`
      if (sensorData.soil_moisture) telegramMessage += `🌱 Soil Moisture: ${sensorData.soil_moisture}\n`
      if (sensorData.battery_level) telegramMessage += `🔋 Battery: ${sensorData.battery_level}%\n`
      telegramMessage += `\n`
    }

    telegramMessage += `<i>Farm: ${farmId}</i>\n`
    telegramMessage += `<i>${new Date().toLocaleString()}</i>`

    // Send message via Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: telegramMessage,
        parse_mode: 'HTML'
      })
    })

    const telegramData = await telegramResponse.json()

    if (!telegramResponse.ok) {
      // Log failed message to database
      await supabase
        .from('telegram_alerts_log')
        .insert({
          alert_type: alertType,
          severity,
          message: telegramMessage,
          chat_id: targetChatId,
          farm_id: farmId,
          sent_at: new Date().toISOString(),
          delivery_status: 'failed',
          error_message: telegramData.description || 'Unknown error'
        })

      throw new Error(`Telegram API error: ${telegramData.description || 'Unknown error'}`)
    }

    // Log successful message to database
    const { error: logError } = await supabase
      .from('telegram_alerts_log')
      .insert({
        alert_type: alertType,
        severity,
        message: telegramMessage,
        chat_id: targetChatId,
        farm_id: farmId,
        sent_at: new Date().toISOString(),
        delivery_status: 'sent',
        telegram_message_id: telegramData.result?.message_id
      })

    if (logError) {
      console.error('Failed to log Telegram alert:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: telegramData.result?.message_id,
        message: 'Telegram alert sent successfully'
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
