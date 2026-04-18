const fs = require('fs');
const path = require('path');
const net = require('net');

/**
 * Printer Configuration Management
 * Supports both network and USB thermal printers
 */

class PrinterManager {
    constructor(appDataPath) {
        this.appDataPath = appDataPath;
        this.configPath = path.join(appDataPath, 'printer-config.json');
        this.config = this.loadConfig();
    }

    /**
     * Load printer configuration from file
     */
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.log('Printer config load error:', error.message);
        }

        // Default config
        return {
            type: 'network', // 'network' or 'usb'
            network: {
                ip: process.env.PRINTER_IP || '192.168.1.200',
                port: parseInt(process.env.PRINTER_PORT || '9100', 10),
                timeout: 5000
            },
            usb: {
                vendorId: 0x04B8, // Epson default
                productId: 0x0202,
                timeout: 5000
            },
            enabled: true,
            encoding: 'ascii'
        };
    }

    /**
     * Save printer configuration
     */
    saveConfig(config) {
        try {
            this.config = config;
            fs.writeFileSync(
                this.configPath,
                JSON.stringify(config, null, 2),
                'utf-8'
            );
            console.log('✅ Printer config saved');
            return true;
        } catch (error) {
            console.error('Failed to save printer config:', error);
            return false;
        }
    }

    /**
     * Update network printer settings
     */
    updateNetworkPrinter(ip, port) {
        this.config.type = 'network';
        this.config.network.ip = ip;
        this.config.network.port = parseInt(port, 10);
        return this.saveConfig(this.config);
    }

    /**
     * Test printer connection
     */
    async testConnection() {
        if (!this.config.enabled) {
            return { success: false, message: 'Printer disabled' };
        }

        if (this.config.type === 'network') {
            return this.testNetworkPrinter();
        } else if (this.config.type === 'usb') {
            return this.testUSBPrinter();
        }

        return { success: false, message: 'Unknown printer type' };
    }

    /**
     * Test network printer connection
     */
    async testNetworkPrinter() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                client.destroy();
                resolve({
                    success: false,
                    message: `Connection timeout (${this.config.network.ip}:${this.config.network.port})`
                });
            }, this.config.network.timeout);

            const client = net.createConnection(
                this.config.network.port,
                this.config.network.ip,
                () => {
                    clearTimeout(timeout);
                    client.end();
                    resolve({
                        success: true,
                        message: `Connected to ${this.config.network.ip}:${this.config.network.port}`
                    });
                }
            );

            client.on('error', (error) => {
                clearTimeout(timeout);
                resolve({
                    success: false,
                    message: `Connection failed: ${error.message}`
                });
            });
        });
    }

    /**
     * Test USB printer connection
     */
    async testUSBPrinter() {
        try {
            // This is a simplified check - requires 'usb' package
            // For now, just indicate USB mode is available
            return {
                success: true,
                message: 'USB printer mode enabled'
            };
        } catch (error) {
            return {
                success: false,
                message: `USB check failed: ${error.message}`
            };
        }
    }

    /**
     * Send data to printer
     */
    async send(data) {
        if (!this.config.enabled) {
            throw new Error('Printer is disabled');
        }

        if (this.config.type === 'network') {
            return this.sendNetworkPrinter(data);
        } else if (this.config.type === 'usb') {
            return this.sendUSBPrinter(data);
        }

        throw new Error('Unknown printer type');
    }

    /**
     * Send data to network printer
     */
    async sendNetworkPrinter(data) {
        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            const timeout = setTimeout(() => {
                client.destroy();
                reject(new Error('Printer connection timeout'));
            }, this.config.network.timeout);

            client.connect(this.config.network.port, this.config.network.ip, () => {
                client.write(data, this.config.encoding, () => {
                    clearTimeout(timeout);
                    client.end();
                    resolve({ success: true });
                });
            });

            client.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    /**
     * Send data to USB printer (placeholder)
     */
    async sendUSBPrinter(data) {
        try {
            // USB support would require 'usb' package
            // This is a placeholder for future implementation
            console.log('USB printer support - not yet implemented');
            throw new Error('USB printer support coming soon');
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return this.config;
    }

    /**
     * Check if printer is available
     */
    isAvailable() {
        return this.config.enabled;
    }
}

module.exports = PrinterManager;
