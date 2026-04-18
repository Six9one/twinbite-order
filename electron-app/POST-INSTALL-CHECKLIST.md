# ✅ Post-Installation Checklist

Complete these steps to get your POS fully operational.

## 🚀 Initial Setup (15 minutes)

- [ ] **Download & Extract** 
  - [ ] Verify all files present in `electron-app/`
  - [ ] Check `.env` file exists

- [ ] **Install Dependencies**
  - [ ] Open Command Prompt in `electron-app/` folder
  - [ ] Run: `npm install` (wait for complete)
  - [ ] Verify no red errors

- [ ] **Test Launch**
  - [ ] Double-click `START-POS.bat`
  - [ ] Wait for app to appear (first time: 10-20 sec)
  - [ ] Verify POS interface loads

## 🖨️ Printer Setup (5 minutes)

- [ ] **Prepare Printer**
  - [ ] Turn on thermal printer
  - [ ] Verify it's connected to network
  - [ ] Load paper roll
  - [ ] Verify network is stable

- [ ] **Find Printer IP**
  - [ ] Print network config page from printer settings, OR
  - [ ] Log into router and find printer in connected devices
  - [ ] Note the IP address (e.g., 192.168.1.200)

- [ ] **Configure App**
  - [ ] Open `electron-app/.env` file with Notepad
  - [ ] Update: `PRINTER_IP=192.168.1.200` (your printer IP)
  - [ ] Save file

- [ ] **Test Printer**
  - [ ] Close and restart app
  - [ ] Go to checkout, test an order
  - [ ] Verify ticket prints correctly
  - [ ] Check formatting is correct

- [ ] **Paper & Maintenance**
  - [ ] Set up paper supply schedule
  - [ ] Test automatic paper cutting
  - [ ] Verify receipt is readable

## 💬 WhatsApp Setup (5 minutes)

- [ ] **First Launch QR Scan**
  - [ ] Start app: `npm run dev` (development mode)
  - [ ] Look in terminal for: "📱 QR CODE RECEIVED!"
  - [ ] Open WhatsApp on phone
  - [ ] Go to: Settings → Linked Devices → Link Device
  - [ ] Scan QR code from terminal
  - [ ] Wait for "✅ Connected" message

- [ ] **Test Message**
  - [ ] Go through sample order to checkout
  - [ ] Use phone number like: `0612345678`
  - [ ] Complete order
  - [ ] Verify WhatsApp message arrives on phone

- [ ] **Configure Message**
  - [ ] Optional: Edit message template in `src/main.js` line ~540
  - [ ] Customize greeting and details as needed
  - [ ] Restart app to apply changes

## 🔐 Security & Access

- [ ] **Restrict File Access**
  - [ ] Only authorized staff can run POS
  - [ ] Protect `.env` file (contains printer config)
  - [ ] Keep device physically secure

- [ ] **Backup Important Files**
  - [ ] Copy entire `electron-app/` folder to USB backup
  - [ ] Store backup in safe location
  - [ ] Test restore procedure once

- [ ] **Credential Security**
  - [ ] Database credentials are read-only (safe)
  - [ ] Don't share admin dashboard credentials via POS
  - [ ] Use separate admin accounts for management

## 👥 Staff Training (20 minutes)

- [ ] **Basic Training Session**
  - [ ] Show staff QUICK-REFERENCE.md
  - [ ] Walk through sample order together
  - [ ] Let them try 2-3 orders independently
  - [ ] Practice product customization

- [ ] **Emergency Procedures**
  - [ ] Show how to restart app (double-click START-POS.bat)
  - [ ] Explain printer troubleshooting steps
  - [ ] Provide support contact info

- [ ] **Daily Startup Checklist**
  - [ ] Print reference card (QUICK-REFERENCE.md)
  - [ ] Post near POS terminal
  - [ ] Verify app launches on startup
  - [ ] Check printer is ready

## 🧪 Functionality Testing (30 minutes)

- [ ] **Test All Product Types**
  - [ ] Add pizza and customize (size, base, toppings)
  - [ ] Add soufflet and customize (size, meat)
  - [ ] Add makloub
  - [ ] Add simple product (drink)

- [ ] **Test Cart Operations**
  - [ ] Change quantities
  - [ ] Remove items
  - [ ] View total calculation

- [ ] **Test Checkout**
  - [ ] Enter customer name
  - [ ] Enter phone number (French format)
  - [ ] Select payment method
  - [ ] Complete order

- [ ] **Verify Integrations**
  - [ ] ✅ Ticket prints correctly
  - [ ] ✅ WhatsApp message sent to phone
  - [ ] ✅ Cash drawer opens (if payment is cash)
  - [ ] ✅ Order appears in admin dashboard

- [ ] **Status Indicators**
  - [ ] Check status lights in top-right
  - [ ] Verify colors match actual status:
    - 🟢 Green = Connected
    - 🔴 Red = Error
    - 🟡 Yellow = Connecting
  - [ ] All should be 🟢 during normal operation

## 📊 Admin Integration

- [ ] **Connect to Dashboard**
  - [ ] Open main web app: https://twinpizza.fr (or your domain)
  - [ ] Log in as admin
  - [ ] Navigate to Orders/Dashboard
  - [ ] Verify POS orders appear in real-time

- [ ] **Check Product Sync**
  - [ ] Add/modify product in admin panel
  - [ ] Restart POS app
  - [ ] Verify new product appears in POS

- [ ] **Test Live Updates**
  - [ ] Change product price in admin
  - [ ] Restart POS
  - [ ] Verify new price shown

## 🔧 Performance Optimization

- [ ] **Speed Test**
  - [ ] Measure first app load time (should be <20 sec)
  - [ ] Measure checkout completion (should be <5 sec)
  - [ ] Measure order creation (should be <2 sec)

- [ ] **Resource Check**
  - [ ] Monitor CPU usage (should stay <30%)
  - [ ] Check memory usage (should stay <500MB)
  - [ ] Verify smooth animations
  - [ ] Test with 50+ products in catalog

- [ ] **Network Stability**
  - [ ] Test with internet interruption (app should pause gracefully)
  - [ ] Verify recovery when internet returns
  - [ ] Check data consistency

## 📝 Documentation

- [ ] **Print & Post**
  - [ ] Print QUICK-REFERENCE.md for staff
  - [ ] Post SETUP-GUIDE.md in back office
  - [ ] Keep PROJECT-SUMMARY.md for records

- [ ] **Create Local Notes**
  - [ ] Document your printer IP
  - [ ] Document staff contacts for support
  - [ ] Create emergency contact sheet
  - [ ] Document any customizations made

## ⚠️ Final Checks

- [ ] **System Requirements**
  - [ ] Windows 10/11 confirmed
  - [ ] Node.js 18+ installed
  - [ ] npm installed and working
  - [ ] Sufficient disk space (500MB+)

- [ ] **Network Requirements**
  - [ ] Stable internet connection verified
  - [ ] Printer on same network
  - [ ] No firewall blocking port 9100 (printer)
  - [ ] WiFi signal strong enough

- [ ] **Hardware Requirements**
  - [ ] Monitor/touch screen working
  - [ ] Keyboard accessible
  - [ ] Printer connected and powered
  - [ ] Cash drawer connected (if applicable)

## 🎉 Go Live!

Once all items above are checked:

- ✅ System is ready for production
- ✅ Staff trained and confident
- ✅ All integrations working
- ✅ Backup procedures in place

**You're ready to start taking orders!**

---

## 📞 Ongoing Support

### Daily (Before Opening)
- [ ] Start POS app
- [ ] Verify all status indicators green
- [ ] Check printer has paper
- [ ] Do test order

### Weekly
- [ ] Review order history in dashboard
- [ ] Check for any error patterns
- [ ] Restock printer paper if needed
- [ ] Verify backup is current

### Monthly
- [ ] Review system performance
- [ ] Check database sync is working
- [ ] Update any configuration if needed
- [ ] Document any issues encountered

---

## ❓ Troubleshooting Quick Links

**Problem:** App won't start  
**Solution:** See SETUP-GUIDE.md "Troubleshooting" section

**Problem:** Printer not printing  
**Solution:** Check printer IP and firewall rules

**Problem:** WhatsApp not sending  
**Solution:** Verify QR code scanned and app shows "Connected"

**Problem:** Products not appearing  
**Solution:** Check internet, restart app

---

**Checklist Complete?** ✅ You're all set!  
**Issues Found?** 📖 Refer to SETUP-GUIDE.md

Good luck! 🍕
