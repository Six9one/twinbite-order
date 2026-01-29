
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import open from 'open';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (from .env in the same folder)
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing SUPABASE credentials in .env');
}

// Initialize Supabase client
const supabase = SUPABASE_URL ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Initialize Express and Socket.IO
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = 3000;

// Serve static files from 'public' directory
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

// ==========================================
// API ENDPOINTS FOR CONTROL
// ==========================================

// Bot control
app.post('/api/bot/start', (req, res) => {
    startBot();
    res.json({ success: true, message: 'Bot starting...' });
});

app.post('/api/bot/stop', (req, res) => {
    stopBot();
    res.json({ success: true, message: 'Bot stopped' });
});

app.post('/api/bot/restart', (req, res) => {
    stopBot();
    setTimeout(startBot, 2000);
    res.json({ success: true, message: 'Bot restarting...' });
});

// Printer control
app.post('/api/printer/start', (req, res) => {
    startPrinter();
    res.json({ success: true, message: 'Printer starting...' });
});

app.post('/api/printer/stop', (req, res) => {
    stopPrinter();
    res.json({ success: true, message: 'Printer stopped' });
});

app.post('/api/printer/restart', (req, res) => {
    stopPrinter();
    setTimeout(startPrinter, 2000);
    res.json({ success: true, message: 'Printer restarting...' });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        bot: !!botProcess,
        printer: !!printerProcess
    });
});

// Store logs in memory for new connections
const MAX_LOGS = 100;
const logs = {
    bot: [],
    printer: []
};

// ==========================================
// HEARTBEAT & LOG SYNC TO SUPABASE
// ==========================================

async function syncStatusToSupabase(serverName, isOnline, lastLog = null) {
    if (!supabase) return;

    try {
        const updateData = {
            server_name: serverName,
            is_online: isOnline,
            last_heartbeat: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (lastLog) {
            updateData.last_log = lastLog.message || lastLog;
        }

        const { error } = await supabase
            .from('system_status')
            .upsert(updateData, { onConflict: 'server_name' });

        if (error) console.error(`❌ Sync error for ${serverName}:`, error.message);
    } catch (err) {
        // Silently fail to avoid crashing the local bridge
    }
}

function addLog(source, type, message) {
    const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        type, // 'info', 'error', 'success', 'warning'
        message: message.trim()
    };

    logs[source].push(logEntry);
    if (logs[source].length > MAX_LOGS) logs[source].shift();

    io.emit('log', { source, ...logEntry });

    // Sync to Supabase periodically (only important logs or highlights)
    if (type === 'error' || type === 'success' || type === 'highlight') {
        syncStatusToSupabase(source === 'bot' ? 'whatsapp' : 'printer', true, logEntry);
    }
}

// Emit status to all clients
function emitStatus() {
    io.emit('status', {
        bot: !!botProcess,
        printer: !!printerProcess
    });
}

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('Frontend connected');
    socket.emit('history', logs);
    socket.emit('status', { bot: !!botProcess, printer: !!printerProcess });

    socket.on('getStatus', () => {
        socket.emit('status', { bot: !!botProcess, printer: !!printerProcess });
    });
});

// ==========================================
// SERVICE MANAGEMENT
// ==========================================

let botProcess = null;
let printerProcess = null;

function startBot() {
    if (botProcess) {
        addLog('bot', 'warning', 'Bot already running.');
        return;
    }

    const botPath = join(__dirname, '../whatsapp-bot-python/bot.py');
    const pythonCmd = 'python';

    addLog('bot', 'info', `🚀 Lancement du Bot WhatsApp...`);

    botProcess = spawn(pythonCmd, ['-u', botPath], {
        cwd: join(__dirname, '../whatsapp-bot-python'),
        stdio: ['pipe', 'pipe', 'pipe']
    });

    botProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        let type = 'info';
        if (msg.includes('ERROR')) type = 'error';
        if (msg.includes('WARN')) type = 'warning';
        if (msg.includes('OK') || msg.includes('succes') || msg.includes('Connecte')) type = 'success';
        addLog('bot', type, msg);
    });

    botProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('DevTools listening') || msg.includes('gpu_device')) return;
        addLog('bot', 'error', msg);
    });

    botProcess.on('close', (code) => {
        addLog('bot', 'error', `Processus Bot arrêté (Code: ${code})`);
        botProcess = null;
        emitStatus();
        syncStatusToSupabase('whatsapp', false);
        // Auto-restart if it crashed (non-zero exit code)
        if (code !== 0 && code !== null) {
            addLog('bot', 'warning', 'Relance automatique du bot après crash...');
            setTimeout(startBot, 5000);
        }
    });

    emitStatus();
    syncStatusToSupabase('whatsapp', true);
}

function stopBot() {
    if (botProcess) {
        addLog('bot', 'warning', '⏹️ Arrêt du Bot WhatsApp...');
        botProcess.kill();
        botProcess = null;
        emitStatus();
        syncStatusToSupabase('whatsapp', false);
    }
}

function startPrinter() {
    if (printerProcess) {
        addLog('printer', 'warning', 'Serveur d\'impression déjà actif.');
        return;
    }

    addLog('printer', 'info', `🚀 Lancement du Serveur d'Impression...`);

    printerProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: true }
    });

    printerProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        let type = 'info';
        if (msg.includes('❌') || msg.includes('Error')) type = 'error';
        if (msg.includes('⚠️')) type = 'warning';
        if (msg.includes('✅') || msg.includes('Connected')) type = 'success';
        if (msg.includes('NEW ORDER')) type = 'highlight';
        addLog('printer', type, msg);
    });

    printerProcess.stderr.on('data', (data) => {
        addLog('printer', 'error', data.toString());
    });

    printerProcess.on('close', (code) => {
        addLog('printer', 'error', `Serveur d'Impression arrêté (Code: ${code})`);
        printerProcess = null;
        emitStatus();
        syncStatusToSupabase('printer', false);
        // Auto-restart if it crashed
        if (code !== 0 && code !== null) {
            addLog('printer', 'warning', 'Relance automatique de l\'imprimante après crash...');
            setTimeout(startPrinter, 5000);
        }
    });

    emitStatus();
    syncStatusToSupabase('printer', true);
}

function stopPrinter() {
    if (printerProcess) {
        addLog('printer', 'warning', '⏹️ Arrêt du Serveur d\'Impression...');
        printerProcess.kill();
        printerProcess = null;
        emitStatus();
        syncStatusToSupabase('printer', false);
    }
}

// ==========================================
// REMOTE COMMAND LISTENER (SUPABASE)
// ==========================================

if (supabase) {
    console.log('✅ Remote command listener active');

    supabase
        .channel('remote-commands')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'system_remote_commands' },
            async (payload) => {
                const { id, server_name, command } = payload.new;
                console.log(`📥 Commande à distance : [${server_name}] ${command}`);

                await supabase
                    .from('system_remote_commands')
                    .update({ status: 'processing', updated_at: new Date() })
                    .eq('id', id);

                try {
                    if (server_name === 'whatsapp') {
                        if (command === 'stop') stopBot();
                        else if (command === 'start') startBot();
                        else if (command === 'restart') {
                            stopBot();
                            setTimeout(startBot, 2000);
                        }
                    } else if (server_name === 'printer') {
                        if (command === 'stop') stopPrinter();
                        else if (command === 'start') startPrinter();
                        else if (command === 'restart') {
                            stopPrinter();
                            setTimeout(startPrinter, 2000);
                        }
                    } else if (server_name === 'system') {
                        if (command === 'morning_start') {
                            addLog('printer', 'highlight', '🌞 EXÉCUTION DU LANCEMENT MATINAL...');
                            startBot();
                            startPrinter();
                            // Optional: open whatsapp web
                            open('https://web.whatsapp.com');
                        } else if (command === 'open_whatsapp') {
                            open('https://web.whatsapp.com');
                            addLog('bot', 'info', '🌐 Ouverture de WhatsApp Web sur le PC local...');
                        }
                    }

                    await supabase
                        .from('system_remote_commands')
                        .update({ status: 'completed', updated_at: new Date() })
                        .eq('id', id);
                } catch (error) {
                    await supabase
                        .from('system_remote_commands')
                        .update({ status: 'failed', error_message: error.message })
                        .eq('id', id);
                }
            }
        )
        .subscribe();

    // Heartbeat Interval
    setInterval(() => {
        syncStatusToSupabase('whatsapp', !!botProcess);
        syncStatusToSupabase('printer', !!printerProcess);
    }, 15000);
}

// ==========================================
// STARTUP
// ==========================================

httpServer.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`   TWIN PIZZA - Contrôle Système`);
    console.log(`   Dashboard: http://localhost:${PORT}`);
    console.log(`${'='.repeat(50)}\n`);

    // Auto-start both services
    console.log('🚀 Démarrage automatique des services...\n');
    startBot();
    startPrinter();
});

process.on('SIGINT', () => {
    stopBot();
    stopPrinter();
    process.exit();
});
