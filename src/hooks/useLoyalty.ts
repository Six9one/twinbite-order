import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LoyaltyInfo {
    id: string;
    customer_phone: string;
    customer_name: string | null;
    total_points: number;
    total_purchases: number;
    soufflet_count: number;
    pizza_count: number;
    texmex_count: number;
    free_items_redeemed: number;
    pending_rewards: any[];
}

export interface LoyaltyRule {
    id: string;
    rule_name: string;
    product_type: string;
    points_required: number;
    reward_type: string;
    reward_value: number;
    is_active: boolean;
    description: string | null;
}

export interface PendingReward {
    type: string;
    count: number;
    description: string;
}

export function useLoyaltyPoints(phoneNumber: string | null) {
    const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
    const [rules, setRules] = useState<LoyaltyRule[]>([]);
    const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (phoneNumber && phoneNumber.length >= 10) {
            fetchLoyaltyInfo(phoneNumber);
            fetchRules();
        } else {
            setLoyaltyInfo(null);
            setPendingRewards([]);
        }
    }, [phoneNumber]);

    const fetchLoyaltyInfo = async (phone: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('loyalty_points' as any)
                .select('*')
                .eq('customer_phone', phone)
                .maybeSingle();

            if (!error && data) {
                setLoyaltyInfo(data as unknown as LoyaltyInfo);
                calculatePendingRewards(data as unknown as LoyaltyInfo);
            } else {
                setLoyaltyInfo(null);
                setPendingRewards([]);
            }
        } catch (error) {
            console.error('Error fetching loyalty info:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRules = async () => {
        try {
            const { data, error } = await supabase
                .from('loyalty_rules' as any)
                .select('*')
                .eq('is_active', true);

            if (!error && data) {
                setRules(data as unknown as LoyaltyRule[]);
            }
        } catch (error) {
            console.error('Error fetching loyalty rules:', error);
        }
    };

    const calculatePendingRewards = (info: LoyaltyInfo) => {
        const rewards: PendingReward[] = [];

        // Check for each product type
        const souffletRule = rules.find(r => r.product_type === 'soufflet');
        const pizzaRule = rules.find(r => r.product_type === 'pizza');

        if (souffletRule && info.soufflet_count >= souffletRule.points_required) {
            const freeCount = Math.floor(info.soufflet_count / souffletRule.points_required);
            if (freeCount > info.free_items_redeemed) {
                rewards.push({
                    type: 'soufflet',
                    count: freeCount - (info.pending_rewards?.filter((r: any) => r.type === 'soufflet').length || 0),
                    description: `${freeCount} soufflé(s) gratuit(s) disponible(s)`
                });
            }
        }

        if (pizzaRule && info.pizza_count >= pizzaRule.points_required) {
            const freeCount = Math.floor(info.pizza_count / pizzaRule.points_required);
            rewards.push({
                type: 'pizza',
                count: freeCount,
                description: `${freeCount} pizza(s) gratuite(s) disponible(s)`
            });
        }

        setPendingRewards(rewards);
    };

    // Recalculate rewards when rules change
    useEffect(() => {
        if (loyaltyInfo) {
            calculatePendingRewards(loyaltyInfo);
        }
    }, [rules, loyaltyInfo]);

    const getProgressForType = (type: 'soufflet' | 'pizza' | 'texmex'): { current: number; required: number; progress: number } => {
        const rule = rules.find(r => r.product_type === type);
        const required = rule?.points_required || 10;

        let current = 0;
        if (loyaltyInfo) {
            switch (type) {
                case 'soufflet':
                    current = loyaltyInfo.soufflet_count % required;
                    break;
                case 'pizza':
                    current = loyaltyInfo.pizza_count % required;
                    break;
                case 'texmex':
                    current = loyaltyInfo.texmex_count % required;
                    break;
            }
        }

        return {
            current,
            required,
            progress: Math.min((current / required) * 100, 100)
        };
    };

    return {
        loyaltyInfo,
        rules,
        pendingRewards,
        loading,
        getProgressForType,
        refetch: () => phoneNumber && fetchLoyaltyInfo(phoneNumber)
    };
}

// Function to update loyalty points after an order
export async function updateLoyaltyAfterOrder(
    customerPhone: string,
    customerName: string,
    items: any[]
): Promise<void> {
    try {
        // Count items by type
        let pizzaCount = 0;
        let souffletCount = 0;
        let texmexCount = 0;

        items.forEach(item => {
            const category = item.item?.category || '';
            const quantity = item.quantity || 1;

            if (category === 'pizzas') {
                pizzaCount += quantity;
            } else if (category === 'soufflets') {
                souffletCount += quantity;
            } else if (category === 'texmex') {
                texmexCount += quantity;
            }
        });

        // Check if customer exists
        const { data: existing } = await supabase
            .from('loyalty_points' as any)
            .select('*')
            .eq('customer_phone', customerPhone)
            .maybeSingle();

        if (existing) {
            // Update existing customer
            await supabase
                .from('loyalty_points' as any)
                .update({
                    customer_name: customerName,
                    total_purchases: (existing as any).total_purchases + 1,
                    pizza_count: (existing as any).pizza_count + pizzaCount,
                    soufflet_count: (existing as any).soufflet_count + souffletCount,
                    texmex_count: (existing as any).texmex_count + texmexCount,
                    total_points: (existing as any).total_points + pizzaCount + souffletCount + texmexCount,
                    last_order_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('customer_phone', customerPhone);
        } else {
            // Create new customer
            await supabase
                .from('loyalty_points' as any)
                .insert({
                    customer_phone: customerPhone,
                    customer_name: customerName,
                    total_purchases: 1,
                    pizza_count: pizzaCount,
                    soufflet_count: souffletCount,
                    texmex_count: texmexCount,
                    total_points: pizzaCount + souffletCount + texmexCount,
                    last_order_at: new Date().toISOString(),
                });
        }
    } catch (error) {
        console.error('Error updating loyalty points:', error);
    }
}
