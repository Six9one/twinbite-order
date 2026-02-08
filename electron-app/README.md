# Twin Pizza Hub - Electron App

All-in-one desktop application for Twin Pizza.

## Features

- 🍕 Full admin panel integrated
- 💬 WhatsApp messaging (auto-retry on failure)
- 🖨️ Direct thermal printer support
- 🔔 Full-screen order notifications (5 seconds)
- ⭐ Customer loyalty lookup
- 📊 Live stats and status indicators

## Installation

```bash
cd electron-app
npm install
```

## Development

Run in dev mode (connects to your existing Vite dev server):

```bash
# First, start the web app in another terminal
cd ..
npm run dev

# Then start Electron
npm start -- --dev
```

## Production Build

```bash
npm run build
```

This creates a Windows installer in `dist/` folder.

## Requirements

- Node.js 18+
- Windows 10/11
- USB thermal printer (for direct printing)
