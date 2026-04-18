# Twin Pizza Hub - POS Electron App

Modern point-of-sale (POS) system for Twin Pizza restaurants built with Electron, React, and Supabase.

## Features

✅ **Full POS System**
- Product catalog with categories
- Shopping cart with real-time updates
- Quick checkout system
- Customer information collection

✅ **Automatic Integrations**
- Thermal printer ticket printing (ESC/POS)
- WhatsApp order confirmation messages
- Cash drawer opening
- Real-time order notifications

✅ **Multi-Platform**
- Windows installer (.exe)
- All-in-one desktop application
- Responsive design for different screen sizes

## Installation & Setup

### Prerequisites
- Node.js 18+ (https://nodejs.org/)
- Windows 10/11
- USB thermal printer (optional, for printing)

### Installation Steps

1. **Navigate to app folder:**
   ```bash
   cd electron-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (optional):**
   - Copy `.env.example` to `.env`
   - Edit printer IP address if needed
   ```
   PRINTER_IP=192.168.1.200
   PRINTER_PORT=9100
   ```

## Running the App

### Development Mode
```bash
npm run dev
```
This starts Electron with dev tools open. Good for testing/debugging.

### Production Mode
```bash
npm start
```
Runs the packaged application.

### Quick Start (Windows)
Simply double-click: `START-POS.bat`

## Building the Installer

To create a Windows installer (.exe):

```bash
npm run build
```

This generates an installer in the `dist/` folder.

## Configuration

### Printer Setup

**Ethernet/Network Printer:**
1. Find your printer's IP address (check printer settings or router)
2. Set `PRINTER_IP` in `.env` or `electron-app/src/main.js`
3. Ensure printer is accessible on network (ping test)

**USB Printer:**
Currently uses network connection. For USB support, modify `sendToPrinter()` in `src/main.js` to use `escpos-usb` package instead of `net`.

### WhatsApp Integration

The app uses Baileys for WhatsApp messaging:
1. First launch will show QR code in terminal
2. Scan QR with WhatsApp mobile app
3. WhatsApp status will change to "Connected" in app
4. Automatic messages will now send to customers

### Supabase Connection

Database credentials are hardcoded in `src/services/supabase.js`:
- URL: https://hsylnrzxeyqxczdalurj.supabase.co
- Already configured - no action needed

## File Structure

```
electron-app/
├── src/
│   ├── main.js              # Main Electron process
│   ├── preload.js           # Secure IPC bridge
│   ├── services/
│   │   └── supabase.js      # Database client
│   └── renderer/
│       ├── pos-simple.html  # Main POS interface
│       ├── notification.html # Order notification window
│       └── styles/
│           └── pos.css      # POS styling
├── assets/
│   └── icon.ico            # App icon
├── package.json            # Dependencies
└── START-POS.bat           # Windows startup script
```

## Troubleshooting

### "Module not found" Error
```bash
# Reinstall dependencies
rm -r node_modules
npm install
```

### Printer not printing
- Check printer IP address: `ping 192.168.1.200`
- Verify printer is on same network
- Check firewall settings
- Try different port (default 9100)

### WhatsApp not connecting
- QR code should appear in terminal on first run
- Scan with WhatsApp mobile app
- Internet connection required
- Wait 10+ seconds for full sync

### Database connection error
- Check internet connection
- Verify Supabase credentials in `src/services/supabase.js`
- Check if database is online

## IPC Commands (API)

Available Electron IPC commands in `src/preload.js`:

```javascript
// Status
await window.electronAPI.getStatus()

// Products/Categories
await window.electronAPI.getProducts()
await window.electronAPI.getCategories()

// Orders
await window.electronAPI.createOrder(orderData)
await window.electronAPI.getOrders(dateFilter)

// Printing
await window.electronAPI.printTicket(orderData)
await window.electronAPI.openCashDrawer()

// WhatsApp
await window.electronAPI.sendWhatsApp(phone, message)

// Notifications
await window.electronAPI.showOrderNotification(orderData)

// Events
window.electronAPI.onWhatsAppQR(callback)
window.electronAPI.onWhatsAppStatus(callback)
window.electronAPI.onNewOrder(callback)
```

## Development

### Starting Development Server
```bash
npm run dev
```

### Hot Reload
Changes to HTML/CSS reload automatically. For JS changes, restart the app.

### Debugging
Press `Ctrl+Shift+I` to open dev tools when app is running.

## Building for Production

```bash
# Build installer
npm run build

# Creates installer in dist/ folder
```

## License
MIT

## Support
Contact Twin Pizza team for support
