# 🖨️ Twin Pizza Print Server - Installation Guide

## Quick Setup (Restaurant PC)

### Step 1: Install Node.js
1. Download Node.js from: https://nodejs.org/
2. Install it (click Next, Next, Finish)
3. Restart the PC

### Step 2: Copy the print-server folder
Copy the entire `print-server` folder to the restaurant PC (e.g., to `C:\TwinPizza\print-server`)

### Step 3: Configure the .env file
Make sure the `.env` file contains:
```
SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co
SUPABASE_ANON_KEY=your_key_here
PRINTER_IP=192.168.1.200
PRINTER_PORT=9100
```

### Step 4: Install dependencies
Open Command Prompt in the print-server folder and run:
```
npm install
```

### Step 5: Start the server
Double-click `start-print-server.bat` or run:
```
npm start
```

---

## 🔄 Auto-Start on Windows Boot

### Option A: Startup Folder (Easiest)
1. Press `Win + R`, type `shell:startup`, press Enter
2. Create a shortcut to `start-print-server.bat` in this folder
3. The print server will now start automatically when Windows boots

### Option B: Task Scheduler (More Reliable)
1. Open Task Scheduler
2. Create Basic Task → Name: "Twin Pizza Print Server"
3. Trigger: "When the computer starts"
4. Action: Start a program → Browse to `start-print-server.bat`
5. Check "Run with highest privileges"
6. Finish

---

## 🔧 Troubleshooting

### Server doesn't start
- Make sure Node.js is installed: `node --version`
- Make sure dependencies are installed: `npm install`

### Orders don't print
- Check printer is ON and connected to network
- Verify printer IP is correct in `.env` file
- Test printer connection: Open browser → http://192.168.1.200

### Need help?
Contact support or check the server logs in the terminal.
