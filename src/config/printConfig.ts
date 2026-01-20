// Print Server Configuration
// Used for direct thermal printing from admin panels

// Get the print server URL based on environment
// When on the same PC as print-server: localhost
// When on phone/other device: use the PC's network IP
export const PRINT_SERVER_URL =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : 'http://192.168.1.100:3001'; // Update this to your Pizza PC's local IP

// Print HACCP ticket directly to thermal printer
export async function printHACCPDirect(data: {
    productName: string;
    categoryName: string;
    categoryColor: string;
    actionDate: string;
    dlcDate: string;
    storageTemp: string;
    operator: string;
    dlcHours: number;
    actionLabel: string;
}): Promise<boolean> {
    try {
        const response = await fetch(`${PRINT_SERVER_URL}/print-haccp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Print error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to connect to print server:', error);
        return false;
    }
}
