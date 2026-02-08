const { app, BrowserWindow, ipcMain } = require('electron');

console.log('TEST: app =', typeof app);
console.log('TEST: BrowserWindow =', typeof BrowserWindow);
console.log('TEST: ipcMain =', typeof ipcMain);

if (!app) {
    console.error('ERROR: app is undefined!');
    process.exit(1);
}

app.whenReady().then(() => {
    console.log('App is ready!');
    const win = new BrowserWindow({ width: 400, height: 300 });
    win.loadURL('data:text/html,<h1>Electron Works!</h1>');
});

app.on('window-all-closed', () => app.quit());
