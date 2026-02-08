// Test if Baileys loads
try {
    console.log('Testing Baileys load...');
    const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
    console.log('✅ Baileys loaded successfully!');
    console.log('makeWASocket type:', typeof makeWASocket);
    console.log('useMultiFileAuthState type:', typeof useMultiFileAuthState);
} catch (error) {
    console.error('❌ Baileys load error:', error);
}
