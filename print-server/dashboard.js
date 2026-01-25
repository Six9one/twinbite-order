
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
    // We don't exit here to allow local dashboard to work anyway
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

// Store logs in memory for new connections
const MAX_LOGS = 100;
const logs = {
    bot: [],
    printer: []
};

function addLog(source, type, message) {
    const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        type, // 'info', 'error', 'success', 'warning'
        message: message.trim()
    };

    logs[source].push(logEntry);
    if (logs[source].length > MAX_LOGS) logs[source].shift();

    io.emit('log', { source, ...logEntry });
}

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('Frontend connected');
    socket.emit('history', logs);
});

// ==========================================
// SERVICE MANAGEMENT
// ==========================================

let botProcess = null;
let printerProcess = null;

function startBot() {
    if (botProcess) {
        addLog('bot', 'warning', 'Bot already running. Use stop/restart.');
        return;
    }

    const botPath = join(__dirname, '../whatsapp-bot-python/bot.py');
    const pythonCmd = 'python'; // Always use global python for stability

    addLog('bot', 'info', `🚀 Starting WhatsApp Bot...`);

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
        addLog('bot', 'error', `Bot process exited with code ${code}`);
        botProcess = null;
    });
}

function stopBot() {
    if (botProcess) {
        addLog('bot', 'warning', '⏹️ Stopping WhatsApp Bot...');
        botProcess.kill();
        botProcess = null;
    } else {
        addLog('bot', 'info', 'Bot is not running.');
    }
}

function startPrinter() {
    if (printerProcess) {
        addLog('printer', 'warning', 'Printer server already running.');
        return;
    }

    addLog('printer', 'info', `🚀 Starting Print Server...`);

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
        addLog('printer', 'error', `Print Server exited with code ${code}`);
        printerProcess = null;
    });
}

function stopPrinter() {
    if (printerProcess) {
        addLog('printer', 'warning', '⏹️ Stopping Print Server...');
        printerProcess.kill();
        printerProcess = null;
    } else {
        addLog('printer', 'info', 'Printer server is not running.');
    }
}

// ==========================================
// REMOTE COMMAND LISTENER (SUPABASE)
// ==========================================

if (supabase) {
    console.log('✅ Remote command listener active (Supabase Realtime)');

    supabase
        .channel('remote-commands')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'system_remote_commands' },
            async (payload) => {
                const { id, server_name, command } = payload.new;
                console.log(`📥 Received Remote Command: [${server_name}] ${command}`);

                // Update status to processing
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
                    }

                    // Complete
                    await supabase
                        .from('system_remote_commands')
                        .update({ status: 'completed', updated_at: new Date() })
                        .eq('id', id);

                    console.log(`✅ Command ${id} executed successfully`);
                } catch (error) {
                    console.error('❌ Command execution failed:', error);
                    await supabase
                        .from('system_remote_commands')
                        .update({
                            status: 'failed',
                            error_message: error.message,
                            updated_at: new Date()
                        })
                        .eq('id', id);
                }
            }
        )
        .subscribe();
} else {
    console.warn('⚠️ Supabase not configured. Remote commands will not work.');
}

// ==========================================
// STARTUP
// ==========================================

// Initial Start
startBot();
startPrinter();

httpServer.listen(PORT, () => {
    console.log(`\n==========================================`);
    console.log(`Dashboard running at http://localhost:${PORT}`);
    console.log(`==========================================\n`);
    // open(`http://localhost:${PORT}`); // Auto-open disabled for remote-friendly stability
});

// Cleanup on exit
process.on('SIGINT', () => {
    stopBot();
    stopPrinter();
    process.exit();
});
