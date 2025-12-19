# Network Printer Setup for Automatic Order Printing

This document explains how to configure automatic order printing when new orders are placed in Supabase.

## Overview

The system supports two printing modes:

1. **Browser Printing** (Default): Uses the TV Dashboard's browser to print via `window.print()`. Works with any printer connected to the computer.

2. **Network Printing**: Sends print commands directly to a thermal printer via its IP address using ESC/POS protocol. Supports automatic retry if the printer is unavailable.

## Architecture

```
New Order Created in Supabase
         │
         ▼
    Real-time Event (PostgreSQL)
         │
         ├──────────────────────┐
         ▼                      ▼
   TV Dashboard           Database Trigger
  (Client-side)          (print_jobs table)
         │
         ▼
  Auto-print enabled?
         │
    ┌────┴────┐
    ▼         ▼
  Network   Browser
  Printing  Printing
    │
    ▼
Edge Function: print-order
    │
    ▼
Direct TCP to Printer IP:9100
    │
    ├── Success → Log to print_jobs
    │
    └── Failure → Retry (3x with 5s delay)
                    │
                    └── Fallback to Browser
```

## Configuration

### 1. Supabase Edge Function Secrets

Set the following environment variables in your Supabase project:

```bash
# Navigate to your Supabase dashboard > Edge Functions > Secrets
# Add the following secrets:

PRINTER_IP=192.168.1.100    # Your printer's network IP address
PRINTER_PORT=9100           # Default port for ESC/POS printers (usually 9100)
```

To set secrets via CLI:
```bash
supabase secrets set PRINTER_IP=192.168.1.100
supabase secrets set PRINTER_PORT=9100
```

### 2. Database Migration

Run the migration to create the `print_jobs` tracking table and trigger:

```bash
supabase db push
```

Or apply the migration manually:
```bash
supabase migration up
```

### 3. Deploy the Edge Function

```bash
supabase functions deploy print-order
```

### 4. TV Dashboard Configuration

1. Open the TV Dashboard (`/tv`)
2. Click the **Printer icon** (🖨️) to enable auto-print
3. When auto-print is enabled, a **WiFi icon** appears - click it to toggle between:
   - **Cyan (enabled)**: Network printing (direct to printer IP)
   - **Gray (disabled)**: Browser printing

## Supported Printers

The network printing feature uses ESC/POS commands and is compatible with:

- Epson TM-T series (TM-T20, TM-T88, etc.)
- Star Micronics TSP series
- Most 80mm thermal receipt printers with Ethernet/WiFi

### Requirements

- Printer must be on the same network as your Supabase Edge Functions (or publicly accessible)
- Printer must accept raw TCP connections on port 9100 (default ESC/POS port)

## Error Handling

The system includes robust error handling:

1. **Automatic Retry**: If the printer is unavailable, the system retries 3 times with exponential backoff (5s, 10s, 15s delays)

2. **Fallback to Browser**: If network printing fails after all retries, the TV Dashboard falls back to browser printing

3. **Print Job Logging**: All print attempts are logged in the `print_jobs` table for debugging:
   - `status`: 'pending', 'success', or 'failed'
   - `attempts`: Number of print attempts
   - `error_message`: Error details if failed

## Troubleshooting

### Printer not responding

1. Verify the printer IP is correct: `ping 192.168.1.100`
2. Check if port 9100 is open: `telnet 192.168.1.100 9100`
3. Ensure the printer is powered on and connected to the network

### Print quality issues

The ESC/POS formatting is optimized for 80mm thermal printers. If text is cut off or misaligned:

1. Check your printer's paper width setting
2. Adjust `ticketSettings` in the Edge Function

### Debugging

Check the Supabase Edge Function logs:
```bash
supabase functions logs print-order
```

Check the `print_jobs` table for failed print attempts:
```sql
SELECT * FROM print_jobs WHERE status = 'failed' ORDER BY created_at DESC;
```

## API Usage

You can also trigger prints manually via the API:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/print-order' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "orderId": "uuid-of-order"
  }'
```

Or with order number:
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/print-order' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "orderNumber": "TW-2024-001"
  }'
```
