// Debug what require('electron') actually returns
const electronPath = require.resolve('electron');
console.log('Electron resolved path:', electronPath);

const electron = require('electron');
console.log('Type of electron:', typeof electron);
console.log('Electron value:', electron);

// Check if we're in the main process
console.log('Process type (expected main):', process.type);
console.log('Process versions.electron:', process.versions.electron);

// Try different ways to access
if (typeof electron === 'string') {
    console.log('ERROR: electron returned a string (path), not the module!');
    console.log('This means we are NOT running inside the electron main process properly.');
} else if (electron && electron.app) {
    console.log('SUCCESS: electron.app exists');
}
