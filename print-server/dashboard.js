
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import open from 'open';
import fs from 'fs';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    // Send history
    socket.emit('history', logs);
});

// ==========================================
// SERVICE MANAGEMENT
// ==========================================

// 1. WhatsApp Bot
const botPath = join(__dirname, '../whatsapp-bot-python/bot.py');
const pythonPath = join(__dirname, '../whatsapp-bot-python/venv/Scripts/python.exe'); // Try venv first

// Fallback to global python if venv doesn't exist OR if we force it
// We prioritize 'python' command because venv seems corrupted/locked
const pythonCmd = 'python'; // Always use global python for stability

console.log(`Starting WhatsApp Bot with: ${pythonCmd}`);

const botProcess = spawn(pythonCmd, ['-u', botPath], {
    cwd: join(__dirname, '../whatsapp-bot-python'),
    stdio: ['pipe', 'pipe', 'pipe'] // Pipe stdio to capture output
});

botProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log(`[BOT] ${msg}`);

    // Classify logs based on content
    let type = 'info';
    if (msg.includes('ERROR')) type = 'error';
    if (msg.includes('WARN')) type = 'warning';
    if (msg.includes('OK') || msg.includes('succes') || msg.includes('Connecte')) type = 'success';

    addLog('bot', type, msg);
});

botProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    // Filter out harmless Chrome noise
    if (msg.includes('DevTools listening') || msg.includes('gpu_device')) return;

    addLog('bot', 'error', msg);
});

botProcess.on('close', (code) => {
    addLog('bot', 'error', `Bot process exited with code ${code}`);
});


// 2. Print Server (Internal to this process, but we'll import logic)
// We will run the print server logic directly here by importing it, 
// OR simpler: spawn it as a child too to keep isolation strong.
// Spawning is safer to avoid context pollution and easier to restart.

const printerProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: true }
});

printerProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log(`[PRINTER] ${msg}`);

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
});


// 3. Start Web Server
httpServer.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
    // Open the dashboard automatically
    open(`http://localhost:${PORT}`);
});

// Cleanup on exit
process.on('SIGINT', () => {
    botProcess.kill();
    printerProcess.kill();
    process.exit();
});
