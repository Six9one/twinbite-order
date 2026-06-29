const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

contextBridge.exposeInMainWorld('twinHub', {
  // Windows
  openWindow:  (screen) => ipcRenderer.send('open-window', screen),
  getDisplays: ()       => ipcRenderer.invoke('get-displays'),

  // WhatsApp
  getWhatsAppStatus: ()                 => ipcRenderer.invoke('get-whatsapp-status'),
  sendWhatsApp:      (number, message)  => ipcRenderer.invoke('send-whatsapp', { phone: number, message }),
  onWhatsAppStatus:  (cb) => ipcRenderer.on('whatsapp-status', (_, data) => cb(data)),
  onWhatsAppQR:      (cb) => ipcRenderer.on('whatsapp-qr',    (_, qr)   => cb(qr)),

  // Printer
  getPrinterState:  ()         => ipcRenderer.invoke('get-printer-state'),
  retryPrintQueue:  ()         => ipcRenderer.invoke('retry-print-queue'),
  clearPrintQueue:  ()         => ipcRenderer.invoke('clear-print-queue'),
  updatePrinterIP:  (ip, port) => ipcRenderer.invoke('update-printer-ip', { ip, port }),
  printTicket:      (order)    => ipcRenderer.invoke('print-thermal', order),
  onPrinterStatus:  (cb) => ipcRenderer.on('printer-status', (_, state) => cb(state)),

  // Orders
  onNewOrder: (cb) => ipcRenderer.on('new-order', (_, order) => cb(order)),

  // WhatsApp message actually sent (confirmation or review)
  onWhatsAppMessageSent: (cb) => ipcRenderer.on('whatsapp-message-sent', (_, data) => cb(data)),

  // WhatsApp conversations
  getWAChats:    ()             => ipcRenderer.invoke('get-wa-chats'),
  getWAMessages: (jid)          => ipcRenderer.invoke('get-wa-messages', jid),
  sendWAMessage: (jid, text)    => ipcRenderer.invoke('send-wa-message', { jid, text }),
  onWANewMessage:(cb)           => ipcRenderer.on('wa-new-message', (_, data) => cb(data)),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  triggerUpdate:   () => ipcRenderer.invoke('trigger-update'),
  onUpdateStatus:  (cb) => {
    const listener = (_, data) => cb(data);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },

  // Freebox
  freeboxRegister: () => ipcRenderer.invoke('freebox-register'),
  freeboxCheckAuth: (trackId, appToken) => ipcRenderer.invoke('freebox-check-authorization', { trackId, appToken }),
  freeboxStatus: () => ipcRenderer.invoke('freebox-status'),
  freeboxUnregister: () => ipcRenderer.invoke('freebox-unregister'),
  onFreeboxCall: (cb) => {
    const listener = (_, data) => cb(data);
    ipcRenderer.on('freebox-call', listener);
    return () => ipcRenderer.removeListener('freebox-call', listener);
  },

  preloadPath: require('url').pathToFileURL(path.join(__dirname, 'preload.js')).href,
  platform: typeof process !== 'undefined' ? process.platform : 'win32',
  appUrl: (typeof process !== 'undefined' && process.argv && process.argv.includes('--dev')) ? 'http://localhost:8080' : 'http://localhost:3456',
});
