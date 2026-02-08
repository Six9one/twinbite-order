// Absolutely minimal test - only electron
const electron = require('electron');

console.log('Electron type:', typeof electron);
console.log('Electron keys:', Object.keys(electron).slice(0, 20));
console.log('app type:', typeof electron.app);
console.log('ipcMain type:', typeof electron.ipcMain);
console.log('BrowserWindow type:', typeof electron.BrowserWindow);

if (typeof electron.app === 'undefined') {
    console.error('\n❌ ERROR: electron.app is undefined');
    console.error('This means electron module is not loading correctly.');
    console.error('Electron value:', electron);
    process.exit(1);
}

console.log('\n✅ Electron loaded correctly!');

electron.app.whenReady().then(() => {
    console.log('✅ App ready!');
    electron.app.quit();
});
