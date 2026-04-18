# 🍕 Twin Pizza Hub - POS Electron App - SETUP GUIDE

Complete setup and launch guide for the Desktop POS system.

## ✅ What's Been Completed

Your Electron POS system is now fully built with:

- ✅ **Full Product Catalog** - Browse all products by category
- ✅ **Product Customization Wizards** - Multi-step wizards for pizzas, soufflets, makloubs, etc.
- ✅ **Shopping Cart** - Add/remove products, adjust quantities
- ✅ **Checkout System** - Customer info, payment method selection
- ✅ **Thermal Printer Integration** - ESC/POS network printer support
- ✅ **WhatsApp Integration** - Automatic order confirmations
- ✅ **Order Notifications** - Full-screen order alerts
- ✅ **Database Connection** - Live product data from Supabase
- ✅ **Cash Drawer** - Automatic drawer opening for cash payments

## 📋 Pre-Installation Requirements

### System Requirements
- **Windows 10/11** (64-bit recommended)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** - Comes with Node.js
- **Printer** (optional) - USB or network thermal printer

### Network
- Internet connection required (for Supabase sync)
- For network printer: Must be on same network

## 🚀 QUICK START (Recommended)

### Option 1: Double-Click Start (Easiest)
1. Go to: `electron-app/` folder
2. Double-click: `START-POS.bat`
3. Wait for app to launch (first time may take 10-20 seconds)

### Option 2: Command Line Start
```bash
cd electron-app
npm start
```

### Option 3: Development Mode (with DevTools)
```bash
cd electron-app
npm run dev
```
This shows console logs and React DevTools for debugging.

## 📦 First-Time Installation

If the app doesn't start on first double-click:

1. **Install dependencies:**
   ```bash
   cd electron-app
   npm install
   ```

2. **Verify Node.js:**
   ```bash
   node --version  # Should be v18+
   npm --version   # Should be 8+
   ```

3. **Try starting again:**
   ```bash
   npm start
   ```

## 🖨️ Printer Configuration

### For Network/Ethernet Printer

1. **Find printer IP:**
   - Print network configuration page from printer
   - Or check your router's DHCP client list
   - Or use: `nmap 192.168.1.0/24` to scan network

2. **Configure in app:**
   - Edit `electron-app\.env` file:
     ```
     PRINTER_IP=192.168.1.200
     PRINTER_PORT=9100
     ```

3. **Test connection:**
   - From command line: `ping 192.168.1.200`
   - Should respond with successful ping

4. **Restart app** after changing IP

### For USB Printer

Currently the app uses network printing. To add USB support:
1. Install USB driver from printer manufacturer
2. Modify `src/main.js` line ~570
3. Replace `sendToPrinter()` to use `escpos-usb` instead of `net`

## 💬 WhatsApp Setup (Important!)

### First Launch
1. App starts → Terminal shows "📱 QR CODE RECEIVED!"
2. Open WhatsApp on your phone
3. Go to: **Settings → Linked devices → Link a device**
4. **Scan the QR code** shown in the terminal
5. ✅ WhatsApp will show as "Connected" in app

### Troubleshooting WhatsApp
- **No QR appears?** Make sure you're running in dev mode or check terminal
- **Can't scan?** Take screenshot of terminal and try again
- **Still disconnected?** Kill app, delete `%APPDATA%/electron-app/whatsapp-auth/`, restart

## 🧾 How to Use the POS

### 1. **Browse Products**
   - Left sidebar: Click category
   - Grid shows products
   - Click product → Wizard opens

### 2. **Customize Products**
   - Multi-step wizard for pizzas, soufflets, etc.
   - Select: Size → Base/Meat → Options → Supplements → Notes → Quantity
   - See price update in real-time

### 3. **Manage Cart**
   - Click "🛒 Panier" to view cart
   - Adjust quantities with ±
   - Remove items with ✕

### 4. **Checkout**
   - Enter customer name
   - Enter phone number
   - Select payment method (Cash/Card)
   - Click "Valider"
   - ✅ Ticket prints automatically
   - ✅ WhatsApp message sent automatically
   - ✅ Drawer opens (if cash payment)

## 🔧 Troubleshooting

### App won't start
```bash
# Delete and reinstall node_modules
cd electron-app
rmdir /s /q node_modules
npm install
npm start
```

### Printer not printing
- Ping printer: `ping 192.168.1.200`
- Check IP is correct in `.env`
- Verify printer is turned on
- Check firewall isn't blocking port 9100

### WhatsApp messages not sending
- Check if status is "Connected" (green dot in header)
- Verify phone number format: should be `06XX` or `+336XX`
- Check internet connection
- Messages may take 10+ seconds to send

### Products not loading
- Check internet connection
- Verify Supabase is online
- Try restarting app

## 📱 Mobile-Friendly

The POS works on tablets/mobile too:
- Rotate screen for landscape (recommended for smaller displays)
- Touch-friendly buttons
- Same features as desktop

## 🔐 Security Notes

- ⚠️ **Database credentials** are in code (already public Supabase key)
- ⚠️ Keep `.env` file private (contains printer IP)
- ✅ **IPC Communication** is sandboxed and secure
- ✅ **No payment processing** - cash/card payments handled manually

## 📊 Performance Tips

- **First load** takes 5-10 seconds (normal, Supabase sync)
- **Subsequent loads** are instant
- **Large product catalogs** (1000+ items) may need pagination
- Keep **app window size** reasonable for best UI

## 🛠️ Development

### Enable DevTools
```bash
npm run dev
```
Then press `Ctrl+Shift+I` to open DevTools

### Check Console Logs
- Main process logs: Terminal/Command Prompt
- Renderer logs: DevTools Console

### Modify Source Code
Files in `electron-app/src/renderer/` reload live when developing with `npm run dev`

## 📚 Key Files

- **UI Logic:** `src/renderer/pos-simple.html` (main interface)
- **Styling:** `src/renderer/styles/pos.css`
- **Wizards:** `src/renderer/js/pos-wizard.js`
- **Main Process:** `src/main.js` (Electron/IPC)
- **Database:** `src/services/supabase.js`
- **Printer:** `src/services/printer.js`

## 🚢 Building for Distribution

To create installer:
```bash
npm run build
```

Output: `dist/Twin\ Pizza\ Hub.exe` (installable)

## ❓ FAQ

**Q: Can I customize the logo?**
A: Replace `assets/icon.png` with your logo

**Q: How do I add new products?**
A: Products sync from Supabase database automatically

**Q: Can I use this on Mac?**
A: Code supports macOS but installer only builds for Windows (modify `package.json` build section)

**Q: How do I add new payment methods?**
A: Edit payment options in checkout form in `pos-simple.html`

**Q: Can multiple terminals share data?**
A: Yes! All terminals connect to same Supabase database

## 📞 Support

If you encounter issues:
1. Check the **Troubleshooting** section above
2. Review terminal/console logs
3. Ensure all prerequisites are installed
4. Try the **quick reset**: delete `node_modules` + `npm install`

## 🎉 You're All Set!

Your POS system is ready to use. Double-click `START-POS.bat` and start taking orders!

---

**Last Updated:** March 2026  
**App Version:** 1.0.0  
**Electron Version:** 34+
