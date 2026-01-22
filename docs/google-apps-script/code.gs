/**
 * Twin Pizza - Kitchen Management PWA
 * Google Apps Script Web App
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Create three tabs: "Traceability", "TempLogs", "WastedItems"
 * 3. Open Extensions > Apps Script
 * 4. Paste this code
 * 5. Deploy > New deployment > Web app
 * 6. Set "Execute as" to your account
 * 7. Set "Who has access" to "Anyone"
 * 8. Copy the Web App URL and paste it in KitchenDashboard.tsx
 */

// Get the active spreadsheet
const SS = SpreadsheetApp.getActiveSpreadsheet();

/**
 * Handle POST requests from the PWA
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result;
    
    switch (action) {
      case 'traceability':
        result = logTraceability(data);
        break;
      case 'templog':
        result = logTemperature(data);
        break;
      case 'wasted':
        result = logWastedItem(data);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'ok', 
      message: 'Twin Pizza Kitchen API is running',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Log traceability data to "Traceability" sheet
 */
function logTraceability(data) {
  const sheet = SS.getSheetByName('Traceability') || createSheet('Traceability', [
    'Date/Heure', 'Produit', 'DLC', 'N° Lot', 'Origine', 'Code-Barres'
  ]);
  
  sheet.appendRow([
    formatTimestamp(data.scannedAt),
    data.productName || '',
    data.dlc || '',
    data.lotNumber || '',
    data.origin || '',
    data.barcode || ''
  ]);
  
  return { success: true, action: 'traceability' };
}

/**
 * Log temperature data to "TempLogs" sheet
 */
function logTemperature(data) {
  const sheet = SS.getSheetByName('TempLogs') || createSheet('TempLogs', [
    'Date/Heure', 'Appareil', 'Type', 'Température (°C)', 'Statut'
  ]);
  
  const row = [
    formatTimestamp(data.timestamp),
    data.deviceName || '',
    data.deviceType === 'fridge' ? 'Réfrigérateur' : 'Congélateur',
    data.temperature,
    data.status || 'OK'
  ];
  
  sheet.appendRow(row);
  
  // Add conditional formatting for warnings
  const lastRow = sheet.getLastRow();
  if (data.status === 'WARNING') {
    sheet.getRange(lastRow, 1, 1, 5).setBackground('#FFCDD2'); // Light red
  } else {
    sheet.getRange(lastRow, 1, 1, 5).setBackground('#C8E6C9'); // Light green
  }
  
  return { success: true, action: 'templog' };
}

/**
 * Log wasted items to "WastedItems" sheet
 */
function logWastedItem(data) {
  const sheet = SS.getSheetByName('WastedItems') || createSheet('WastedItems', [
    'Date Jeté', 'Produit', 'DLC', 'N° Lot', 'Origine', 'Date Scanné'
  ]);
  
  sheet.appendRow([
    formatTimestamp(data.wastedAt),
    data.productName || '',
    data.dlc || '',
    data.lotNumber || '',
    data.origin || '',
    formatTimestamp(data.scannedAt)
  ]);
  
  return { success: true, action: 'wasted' };
}

/**
 * Create a new sheet with headers
 */
function createSheet(name, headers) {
  const sheet = SS.insertSheet(name);
  sheet.appendRow(headers);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#F97316'); // Orange
  headerRange.setFontColor('#FFFFFF');
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  return sheet;
}

/**
 * Format ISO timestamp to readable French format
 */
function formatTimestamp(isoString) {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    return Utilities.formatDate(date, 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return isoString;
  }
}

/**
 * Manual test function
 */
function testTraceability() {
  const testData = {
    action: 'traceability',
    productName: 'Mozzarella Test',
    dlc: '2026-01-25',
    lotNumber: 'L12345',
    origin: 'Italie',
    barcode: '3701234567890',
    scannedAt: new Date().toISOString()
  };
  
  const result = logTraceability(testData);
  Logger.log(result);
}

function testTemperature() {
  const testData = {
    action: 'templog',
    deviceName: 'Frigo Principal',
    deviceType: 'fridge',
    temperature: 3.5,
    status: 'OK',
    timestamp: new Date().toISOString()
  };
  
  const result = logTemperature(testData);
  Logger.log(result);
}
