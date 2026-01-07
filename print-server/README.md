# Twin Pizza Local Print Server 🍕🖨️

A local Node.js server that connects to Supabase in real-time and automatically prints orders to your thermal printer.

## Setup

### 1. Install dependencies

```bash
cd print-server
npm install
```

### 2. Configure environment

Create a `.env` file in the `print-server` folder:

```bash
# Copy the example
cp .env.example .env
```

Then edit `.env` with your values:

```env
# Your Supabase project URL
SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co

# Your Supabase anon key (get from Supabase Dashboard > Settings > API)
SUPABASE_ANON_KEY=your-anon-key-here

# Your printer IP and port
PRINTER_IP=192.168.123.100
PRINTER_PORT=9100
```

### 3. Run the server

```bash
npm start
```

You'll see:

```
╔════════════════════════════════════════════════════════╗
║           🍕 TWIN PIZZA PRINT SERVER 🍕               ║
╠════════════════════════════════════════════════════════╣
║  Printer: 192.168.123.100  Port: 9100                  ║
║  Status: Waiting for orders...                         ║
╚════════════════════════════════════════════════════════╝

✅ Connected to Supabase real-time!
👂 Listening for new orders...
```

## Running as a background service

### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create a new task that runs `npm start` in the `print-server` folder
3. Set it to run at startup

### Using PM2 (recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start server.js --name "twin-print"

# Auto-start on boot
pm2 startup
pm2 save
```

## Troubleshooting

### Printer not responding

1. Check the printer is powered on
2. Verify IP: `ping 192.168.123.100`
3. Check port: `telnet 192.168.123.100 9100`

### Orders not printing

1. Check Supabase connection in console
2. Verify your `SUPABASE_ANON_KEY` is correct
3. Make sure Realtime is enabled on the `orders` table in Supabase
