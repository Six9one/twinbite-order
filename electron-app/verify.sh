#!/bin/bash
# Verification script for Twin Pizza POS Electron App

echo "🍕 Twin Pizza POS - Verification Checklist"
echo "=========================================="
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  ✅ Node.js installed: $NODE_VERSION"
else
    echo "  ❌ Node.js not found. Install from nodejs.org"
    exit 1
fi

# Check npm
echo "✓ Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "  ✅ npm installed: $NPM_VERSION"
else
    echo "  ❌ npm not found"
    exit 1
fi

# Check node_modules
echo "✓ Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "  ✅ node_modules exists"
else
    echo "  ⚠️  node_modules not found - running npm install..."
    npm install
fi

# Check key files
echo "✓ Checking key files..."
if [ -f "src/main.js" ]; then
    echo "  ✅ src/main.js found"
else
    echo "  ❌ src/main.js not found"
    exit 1
fi

if [ -f "src/preload.js" ]; then
    echo "  ✅ src/preload.js found"
else
    echo "  ❌ src/preload.js not found"
    exit 1
fi

if [ -f "src/renderer/pos-simple.html" ]; then
    echo "  ✅ src/renderer/pos-simple.html found"
else
    echo "  ❌ src/renderer/pos-simple.html not found"
    exit 1
fi

if [ -f "src/renderer/styles/pos.css" ]; then
    echo "  ✅ src/renderer/styles/pos.css found"
else
    echo "  ❌ src/renderer/styles/pos.css not found"
    exit 1
fi

if [ -f "src/renderer/js/pos-wizard.js" ]; then
    echo "  ✅ src/renderer/js/pos-wizard.js found"
else
    echo "  ❌ src/renderer/js/pos-wizard.js not found"
    exit 1
fi

# Check package.json
echo "✓ Checking package.json..."
if grep -q '"electron"' package.json; then
    echo "  ✅ Electron dependency found"
else
    echo "  ❌ Electron not in package.json"
    exit 1
fi

if grep -q '"@supabase/supabase-js"' package.json; then
    echo "  ✅ Supabase dependency found"
else
    echo "  ❌ Supabase not in package.json"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ All checks passed! System is ready."
echo "=========================================="
echo ""
echo "To start the app:"
echo "  npm start       (production)"
echo "  npm run dev     (development with DevTools)"
echo ""
