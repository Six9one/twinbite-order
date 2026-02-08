const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Status
    getStatus: () => ipcRenderer.invoke('get-status'),

    // Orders & Stats
    getOrders: (dateFilter) => ipcRenderer.invoke('get-orders', dateFilter),
    getStats: (dateFilter) => ipcRenderer.invoke('get-stats', dateFilter),

    // Printing
    printTicket: (orderData) => ipcRenderer.invoke('print-ticket', orderData),

    // WhatsApp
    sendWhatsApp: (phone, message) => ipcRenderer.invoke('send-whatsapp', { phone, message }),

    // Notifications
    showOrderNotification: (orderData) => ipcRenderer.invoke('show-order-notification', orderData),

    // Loyalty
    getLoyalty: (phone) => ipcRenderer.invoke('get-loyalty', phone),

    // Event listeners
    onWhatsAppQR: (callback) => ipcRenderer.on('whatsapp-qr', (event, qr) => callback(qr)),
    onWhatsAppStatus: (callback) => ipcRenderer.on('whatsapp-status', (event, status) => callback(status)),
    onPlaySound: (callback) => ipcRenderer.on('play-sound', () => callback()),
    onPrintViaBrowser: (callback) => ipcRenderer.on('print-via-browser', (event, orderData) => callback(orderData)),
    onOrderData: (callback) => ipcRenderer.on('order-data', (event, orderData) => callback(orderData)),
    onNewOrder: (callback) => ipcRenderer.on('new-order', (event, orderData) => callback(orderData)),

    // Platform info
    platform: process.platform
});

console.log('🍕 Twin Pizza Hub preload ready');
