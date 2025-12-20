import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LoyaltyReward {
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    type: 'free_item' | 'discount' | 'percentage';
    value: number; // discount amount or item ID
    isActive: boolean;
}

interface LoyaltyTransaction {
    id: string;
    type: 'earn' | 'redeem';
    points: number;
    description: string;
    createdAt: Date;
    orderId?: string;
}

interface LoyaltyCustomer {
    id: string;
    phone: string;
    name: string;
    points: number;
    totalSpent: number;
    totalOrders: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    joinedAt: Date;
}

interface LoyaltyContextType {
    // State
    customer: LoyaltyCustomer | null;
    isLoading: boolean;
    rewards: LoyaltyReward[];
    transactions: LoyaltyTransaction[];

    // Actions
    lookupCustomer: (phone: string) => Promise<LoyaltyCustomer | null>;
    registerCustomer: (phone: string, name: string) => Promise<LoyaltyCustomer | null>;
    earnPoints: (orderId: string, amount: number, description?: string) => Promise<boolean>;
    redeemReward: (rewardId: string) => Promise<{ success: boolean; discount?: number }>;
    getRewards: () => LoyaltyReward[];
    getTier: (points: number) => 'bronze' | 'silver' | 'gold' | 'platinum';
    getNextTier: (currentTier: string) => { name: string; pointsNeeded: number } | null;
    logout: () => void;
}

// Tier thresholds
const TIERS = {
    bronze: 0,
    silver: 500,
    gold: 1500,
    platinum: 5000
};

// Default rewards
const DEFAULT_REWARDS: LoyaltyReward[] = [
    {
        id: 'free-drink',
        name: 'Boisson Gratuite',
        description: 'Une boisson au choix offerte',
        pointsCost: 50,
        type: 'free_item',
        value: 0,
        isActive: true
    },
    {
        id: 'free-frites',
        name: 'Frites Gratuites',
        description: 'Une portion de frites offerte',
        pointsCost: 75,
        type: 'free_item',
        value: 0,
        isActive: true
    },
    {
        id: 'discount-5',
        name: 'Réduction 5€',
        description: '5€ de réduction sur votre commande',
        pointsCost: 100,
        type: 'discount',
        value: 5,
        isActive: true
    },
    {
        id: 'discount-10',
        name: 'Réduction 10€',
        description: '10€ de réduction sur votre commande',
        pointsCost: 180,
        type: 'discount',
        value: 10,
        isActive: true
    },
    {
        id: 'free-pizza',
        name: 'Pizza Gratuite',
        description: 'Une pizza Senior gratuite',
        pointsCost: 250,
        type: 'free_item',
        value: 0,
        isActive: true
    },
    {
        id: 'percent-15',
        name: '-15% sur la commande',
        description: '15% de réduction sur toute la commande',
        pointsCost: 300,
        type: 'percentage',
        value: 15,
        isActive: true
    }
];

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined);

export function LoyaltyProvider({ children }: { children: ReactNode }) {
    const [customer, setCustomer] = useState<LoyaltyCustomer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
    const [rewards, setRewards] = useState<LoyaltyReward[]>(DEFAULT_REWARDS);

    // Load saved customer from localStorage
    useEffect(() => {
        const savedPhone = localStorage.getItem('twinpizza-loyalty-phone');
        if (savedPhone) {
            lookupCustomer(savedPhone);
        }
    }, []);

    // Fetch rewards from database
    useEffect(() => {
        const fetchRewards = async () => {
            try {
                const { data, error } = await supabase
                    .from('loyalty_rewards')
                    .select('*')
                    .eq('is_active', true)
                    .order('points_cost', { ascending: true });

                if (!error && data && data.length > 0) {
                    setRewards(data.map(r => ({
                        id: r.id,
                        name: r.name,
                        description: r.description,
                        pointsCost: r.points_cost,
                        type: r.type as 'free_item' | 'discount' | 'percentage',
                        value: r.value,
                        isActive: r.is_active
                    })));
                }
            } catch (e) {
                console.error('Failed to fetch rewards:', e);
            }
        };

        fetchRewards();
    }, []);

    const getTier = (points: number): 'bronze' | 'silver' | 'gold' | 'platinum' => {
        if (points >= TIERS.platinum) return 'platinum';
        if (points >= TIERS.gold) return 'gold';
        if (points >= TIERS.silver) return 'silver';
        return 'bronze';
    };

    const getNextTier = (currentTier: string): { name: string; pointsNeeded: number } | null => {
        const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
        const currentIndex = tierOrder.indexOf(currentTier);

        if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
            return null; // Already at max tier
        }

        const nextTierName = tierOrder[currentIndex + 1];
        const currentPoints = customer?.points || 0;
        const pointsNeeded = TIERS[nextTierName as keyof typeof TIERS] - currentPoints;

        return {
            name: nextTierName.charAt(0).toUpperCase() + nextTierName.slice(1),
            pointsNeeded: Math.max(0, pointsNeeded)
        };
    };

    const lookupCustomer = async (phone: string): Promise<LoyaltyCustomer | null> => {
        setIsLoading(true);
        try {
            // Normalize phone number
            const normalizedPhone = phone.replace(/\s+/g, '').replace(/^(\+33|0033)/, '0');

            const { data, error } = await supabase
                .from('loyalty_customers')
                .select('*')
                .eq('phone', normalizedPhone)
                .single();

            if (error || !data) {
                setIsLoading(false);
                return null;
            }

            const customerData: LoyaltyCustomer = {
                id: data.id,
                phone: data.phone,
                name: data.name,
                points: data.points,
                totalSpent: data.total_spent,
                totalOrders: data.total_orders,
                tier: getTier(data.points),
                joinedAt: new Date(data.created_at)
            };

            setCustomer(customerData);
            localStorage.setItem('twinpizza-loyalty-phone', normalizedPhone);

            // Fetch transactions
            const { data: txData } = await supabase
                .from('loyalty_transactions')
                .select('*')
                .eq('customer_id', data.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (txData) {
                setTransactions(txData.map(tx => ({
                    id: tx.id,
                    type: tx.type as 'earn' | 'redeem',
                    points: tx.points,
                    description: tx.description,
                    createdAt: new Date(tx.created_at),
                    orderId: tx.order_id
                })));
            }

            setIsLoading(false);
            return customerData;
        } catch (e) {
            console.error('Lookup failed:', e);
            setIsLoading(false);
            return null;
        }
    };

    const registerCustomer = async (phone: string, name: string): Promise<LoyaltyCustomer | null> => {
        setIsLoading(true);
        try {
            const normalizedPhone = phone.replace(/\s+/g, '').replace(/^(\+33|0033)/, '0');

            // Check if already exists
            const existing = await lookupCustomer(normalizedPhone);
            if (existing) {
                setIsLoading(false);
                return existing;
            }

            const { data, error } = await supabase
                .from('loyalty_customers')
                .insert({
                    phone: normalizedPhone,
                    name,
                    points: 10, // Welcome bonus
                    total_spent: 0,
                    total_orders: 0
                })
                .select()
                .single();

            if (error || !data) {
                console.error('Registration failed:', error);
                setIsLoading(false);
                return null;
            }

            // Add welcome transaction
            await supabase.from('loyalty_transactions').insert({
                customer_id: data.id,
                type: 'earn',
                points: 10,
                description: 'Bonus de bienvenue 🎉'
            });

            const customerData: LoyaltyCustomer = {
                id: data.id,
                phone: data.phone,
                name: data.name,
                points: 10,
                totalSpent: 0,
                totalOrders: 0,
                tier: 'bronze',
                joinedAt: new Date(data.created_at)
            };

            setCustomer(customerData);
            localStorage.setItem('twinpizza-loyalty-phone', normalizedPhone);
            setIsLoading(false);
            return customerData;
        } catch (e) {
            console.error('Registration error:', e);
            setIsLoading(false);
            return null;
        }
    };

    const earnPoints = async (orderId: string, amount: number, description?: string): Promise<boolean> => {
        if (!customer) return false;

        try {
            // 1 point per euro spent
            const pointsEarned = Math.floor(amount);

            // Tier bonus multiplier
            const tierMultiplier = {
                bronze: 1,
                silver: 1.25,
                gold: 1.5,
                platinum: 2
            };

            const multiplier = tierMultiplier[customer.tier] || 1;
            const finalPoints = Math.floor(pointsEarned * multiplier);

            const { error } = await supabase.rpc('add_loyalty_points', {
                p_customer_id: customer.id,
                p_points: finalPoints,
                p_order_id: orderId,
                p_amount: amount,
                p_description: description || `Commande #${orderId.slice(-6)}`
            });

            if (error) {
                console.error('Failed to add points:', error);
                return false;
            }

            // Update local state
            setCustomer({
                ...customer,
                points: customer.points + finalPoints,
                totalSpent: customer.totalSpent + amount,
                totalOrders: customer.totalOrders + 1,
                tier: getTier(customer.points + finalPoints)
            });

            setTransactions([
                {
                    id: `tx-${Date.now()}`,
                    type: 'earn',
                    points: finalPoints,
                    description: description || `Commande #${orderId.slice(-6)}`,
                    createdAt: new Date(),
                    orderId
                },
                ...transactions
            ]);

            return true;
        } catch (e) {
            console.error('Earn points error:', e);
            return false;
        }
    };

    const redeemReward = async (rewardId: string): Promise<{ success: boolean; discount?: number }> => {
        if (!customer) return { success: false };

        const reward = rewards.find(r => r.id === rewardId);
        if (!reward || customer.points < reward.pointsCost) {
            return { success: false };
        }

        try {
            const { error } = await supabase.rpc('redeem_loyalty_reward', {
                p_customer_id: customer.id,
                p_reward_id: rewardId,
                p_points: reward.pointsCost
            });

            if (error) {
                console.error('Failed to redeem reward:', error);
                return { success: false };
            }

            // Update local state
            setCustomer({
                ...customer,
                points: customer.points - reward.pointsCost,
                tier: getTier(customer.points - reward.pointsCost)
            });

            setTransactions([
                {
                    id: `tx-${Date.now()}`,
                    type: 'redeem',
                    points: -reward.pointsCost,
                    description: `Récompense: ${reward.name}`,
                    createdAt: new Date()
                },
                ...transactions
            ]);

            return {
                success: true,
                discount: reward.type === 'discount' ? reward.value : reward.type === 'percentage' ? reward.value : 0
            };
        } catch (e) {
            console.error('Redeem error:', e);
            return { success: false };
        }
    };

    const getRewards = (): LoyaltyReward[] => {
        return rewards.filter(r => r.isActive);
    };

    const logout = () => {
        setCustomer(null);
        setTransactions([]);
        localStorage.removeItem('twinpizza-loyalty-phone');
    };

    return (
        <LoyaltyContext.Provider value={{
            customer,
            isLoading,
            rewards,
            transactions,
            lookupCustomer,
            registerCustomer,
            earnPoints,
            redeemReward,
            getRewards,
            getTier,
            getNextTier,
            logout
        }}>
            {children}
        </LoyaltyContext.Provider>
    );
}

export function useLoyalty() {
    const context = useContext(LoyaltyContext);
    if (context === undefined) {
        throw new Error('useLoyalty must be used within a LoyaltyProvider');
    }
    return context;
}
