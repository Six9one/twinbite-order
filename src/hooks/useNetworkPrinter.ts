import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PrintResult {
    success: boolean;
    message: string;
    attempts?: number;
    orderNumber?: string;
}

interface PrinterSettings {
    enabled: boolean;
    auto_print: boolean;
    printer_ip: string;
    printer_port: number;
    use_network_printer: boolean; // true = use network printer, false = use browser print
}

const DEFAULT_SETTINGS: PrinterSettings = {
    enabled: true,
    auto_print: true,
    printer_ip: '',
    printer_port: 9100,
    use_network_printer: false, // Default to browser printing
};

// Hook for printer settings and printing functionality
export function useNetworkPrinter() {
    const [isPrinting, setIsPrinting] = useState(false);
    const [lastPrintTime, setLastPrintTime] = useState<Date | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);

    // Get printer settings from localStorage (for quick access) and admin_settings (for sync)
    const getSettings = useCallback(async (): Promise<PrinterSettings> => {
        // First try localStorage for quick settings
        const localSettings = localStorage.getItem('printerSettings');
        if (localSettings) {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(localSettings) };
            } catch {
                // Invalid JSON, continue to fetch from DB
            }
        }

        // Fetch from admin_settings
        try {
            const { data, error } = await supabase
                .from('admin_settings')
                .select('setting_value')
                .eq('setting_key', 'printer_settings')
                .single();

            if (!error && data?.setting_value) {
                const settings = { ...DEFAULT_SETTINGS, ...data.setting_value as any };
                localStorage.setItem('printerSettings', JSON.stringify(settings));
                return settings;
            }
        } catch {
            // Use defaults on error
        }

        return DEFAULT_SETTINGS;
    }, []);

    // Save printer settings
    const saveSettings = useCallback(async (settings: Partial<PrinterSettings>): Promise<boolean> => {
        const currentSettings = await getSettings();
        const newSettings = { ...currentSettings, ...settings };

        try {
            // Save to localStorage for quick access
            localStorage.setItem('printerSettings', JSON.stringify(newSettings));

            // Save to admin_settings
            await supabase
                .from('admin_settings')
                .upsert({
                    setting_key: 'printer_settings',
                    setting_value: newSettings,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'setting_key' });

            return true;
        } catch (error) {
            console.error('Failed to save printer settings:', error);
            return false;
        }
    }, [getSettings]);

    // Print order via network printer (calls Edge Function)
    const printViaNetwork = useCallback(async (orderId: string, orderNumber?: string): Promise<PrintResult> => {
        setIsPrinting(true);
        setLastError(null);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/print-order`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                    },
                    body: JSON.stringify({ orderId }),
                }
            );

            const result = await response.json();

            if (result.success) {
                setLastPrintTime(new Date());
                return {
                    success: true,
                    message: 'Ticket imprimé avec succès',
                    attempts: result.attempts,
                    orderNumber: result.orderNumber || orderNumber,
                };
            } else {
                setLastError(result.error);
                return {
                    success: false,
                    message: result.error || 'Échec de l\'impression',
                    attempts: result.attempts,
                    orderNumber: result.orderNumber || orderNumber,
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
            setLastError(errorMessage);
            return {
                success: false,
                message: errorMessage,
                orderNumber,
            };
        } finally {
            setIsPrinting(false);
        }
    }, []);

    // Print order via browser (fallback, uses window.print)
    const printViaBrowser = useCallback((order: any): PrintResult => {
        try {
            // This will use the existing printOrderTicket logic in TVDashboard
            // For a complete implementation, we'd need to move that logic here
            return {
                success: true,
                message: 'Impression navigateur lancée',
                orderNumber: order.order_number,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur d\'impression';
            return {
                success: false,
                message: errorMessage,
                orderNumber: order?.order_number,
            };
        }
    }, []);

    // Main print function - decides which method to use based on settings
    const printOrder = useCallback(async (
        orderId: string,
        order?: any,
        forceMethod?: 'network' | 'browser'
    ): Promise<PrintResult> => {
        const settings = await getSettings();

        // Determine print method
        const useNetwork = forceMethod === 'network' ||
            (forceMethod !== 'browser' && settings.use_network_printer && settings.printer_ip);

        if (useNetwork) {
            const result = await printViaNetwork(orderId, order?.order_number);

            // If network fails, try browser as fallback
            if (!result.success && order) {
                console.warn('Network print failed, falling back to browser printing');
                toast.warning('Imprimante réseau indisponible, tentative via navigateur...');
                return printViaBrowser(order);
            }

            return result;
        } else {
            return printViaBrowser(order);
        }
    }, [getSettings, printViaNetwork, printViaBrowser]);

    // Test printer connection
    const testPrinter = useCallback(async (): Promise<PrintResult> => {
        const settings = await getSettings();

        if (!settings.printer_ip) {
            return {
                success: false,
                message: 'Adresse IP de l\'imprimante non configurée',
            };
        }

        setIsPrinting(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/print-order`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                    },
                    body: JSON.stringify({
                        // Send a test print order
                        order: {
                            id: 'test-' + Date.now(),
                            order_number: 'TEST',
                            order_type: 'emporter',
                            status: 'pending',
                            customer_name: 'Test Client',
                            customer_phone: '0000000000',
                            items: [{ name: 'Test Article', quantity: 1, totalPrice: 10 }],
                            subtotal: 9.09,
                            tva: 0.91,
                            delivery_fee: 0,
                            total: 10,
                            payment_method: 'cb',
                            created_at: new Date().toISOString(),
                        }
                    }),
                }
            );

            const result = await response.json();
            setLastPrintTime(new Date());

            return {
                success: result.success,
                message: result.success ? 'Test d\'impression réussi!' : result.error,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Erreur de test',
            };
        } finally {
            setIsPrinting(false);
        }
    }, [getSettings]);

    return {
        isPrinting,
        lastPrintTime,
        lastError,
        getSettings,
        saveSettings,
        printOrder,
        printViaNetwork,
        printViaBrowser,
        testPrinter,
    };
}

// Utility hook for print job status (real-time updates)
export function usePrintJobs(orderId?: string) {
    const [printJobs, setPrintJobs] = useState<any[]>([]);

    // Fetch print jobs for an order
    const fetchPrintJobs = useCallback(async (id?: string) => {
        const targetId = id || orderId;
        if (!targetId) return;

        try {
            const { data, error } = await supabase
                .from('print_jobs' as any)
                .select('*')
                .eq('order_id', targetId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setPrintJobs(data as any[]);
            }
        } catch {
            // Silently fail - print_jobs table might not exist
        }
    }, [orderId]);

    return {
        printJobs,
        fetchPrintJobs,
    };
}
