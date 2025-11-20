# MQTT Configuration - AgriConnect

## HiveMQ Cloud Connection

**Broker:** [Your cluster URL from credentials.md]  
**Port:** 8883 (TLS)  
**Protocol:** MQTT 3.1.1  
**Client ID Format:** `gateway_{gateway_id}`

## Gateway Credentials

Each gateway has unique credentials:
- **Username:** `gateway_client` (or unique per gateway)
- **Password:** [Stored securely in gateway firmware]

## Connection Settings

**Keep-alive:** 60 seconds  
**Clean session:** false (persist subscriptions)  
**Auto-reconnect:** true  
**Max reconnect delay:** 60 seconds

## TLS/SSL Configuration

**CA Certificate:** Let's Encrypt (built into ESP32)  
**Client Certificate:** Not required (username/password auth)  
**TLS Version:** 1.2 or higher

## Last Will and Testament (LWT)

**Topic:** `agriconnect/status/{gateway_id}`  
**Payload:**
```json
{
  "gatewayId": "GW-CM-BUE-001",
  "status": "offline",
  "timestamp": "2025-10-21T14:30:00Z"
}
```
**QoS:** 1  
**Retained:** Yes

This automatically publishes when gateway disconnects unexpectedly.

## Subscription List (Gateway)

Gateways subscribe to:
1. `agriconnect/commands/{gateway_id}` - General commands
2. `agriconnect/commands/{gateway_id}/#` - All field node commands

## Notes

- Keep MQTT credentials separate from code (use config file)
- Never commit MQTT passwords to Git
- Rotate passwords every 6 months