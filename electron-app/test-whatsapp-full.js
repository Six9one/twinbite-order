// Full test of WhatsApp QR generation
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');

async function testWhatsApp() {
    console.log('🚀 Starting WhatsApp test...');

    try {
        const authPath = path.join(__dirname, 'test-wa-auth');
        console.log('📁 Auth path:', authPath);

        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        console.log('✅ Auth state loaded');

        console.log('📱 Creating WhatsApp socket...');
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,  // This should print QR in console!
            browser: ['Test', 'Desktop', '1.0.0']
        });
        console.log('✅ Socket created');

        sock.ev.on('connection.update', (update) => {
            console.log('🔄 Connection update:', JSON.stringify(update, null, 2));

            if (update.qr) {
                console.log('\n================================');
                console.log('📱 QR CODE STRING:', update.qr.substring(0, 50) + '...');
                console.log('================================\n');
            }

            if (update.connection === 'close') {
                console.log('❌ Connection closed');
                const reason = update.lastDisconnect?.error?.output?.statusCode;
                console.log('Reason:', reason);
                process.exit(0);
            }

            if (update.connection === 'open') {
                console.log('✅✅✅ CONNECTED!');
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // Keep running
        console.log('⏳ Waiting for events... (Press Ctrl+C to exit)');

    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    }
}

testWhatsApp();
