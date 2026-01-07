import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// SIMPLE LOYALTY SYSTEM
// - 1 point per €1 spent
// - 100 points = €10 discount
// - Synced by phone number
// ============================================


interface LoyaltyReward {
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    type: 'free_item' | 'discount' | 'percentage';
    value: number;
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
    firstOrderDone: boolean;
    joinedAt: Date;
}

interface LoyaltyContextType {
    // State
    customer: LoyaltyCustomer | null;
    isLoading: boolean;
    rewards: LoyaltyReward[];
    transactions: LoyaltyTransaction[];
    selectedReward: LoyaltyReward | null;

    // Actions
    lookupCustomer: (phone: string) => Promise<LoyaltyCustomer | null>;
    registerCustomer: (phone: string, name: string) => Promise<LoyaltyCustomer | null>;
    findOrCreateCustomer: (phone: string, name: string) => Promise<LoyaltyCustomer | null>;
    earnPoints: (orderId: string, amount: number, description?: string) => Promise<boolean>;
    redeemReward: (rewardId: string) => Promise<{ success: boolean; discount?: number; discountType?: 'amount' | 'percentage' }>;
    selectReward: (reward: LoyaltyReward | null) => void;
    getRewards: () => LoyaltyReward[];
    getNextReward: () => { reward: LoyaltyReward; pointsNeeded: number } | null;
    calculatePointsToEarn: (amount: number) => number;
    canUseReward: (rewardId: string, hasPromoCode: boolean) => boolean;
    logout: () => void;
}

// V1 Default rewards - SIMPLIFIED: 100 points = €10
const DEFAULT_REWARDS: LoyaltyReward[] = [
    {
        id: 'discount-10-euro',
        name: '10€ de réduction',
        description: 'Échangez 100 points contre 10€ de réduction',
        pointsCost: 100,
        type: 'discount',
        value: 10,
        isActive: true
    }
];

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined);

export function LoyaltyProvider({ children }: { children: ReactNode }) {
    const [customer, setCustomer] = useState<LoyaltyCustomer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
    const [rewards, setRewards] = useState<LoyaltyReward[]>(DEFAULT_REWARDS);
    const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);

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
                    .from('loyalty_rewards' as any)
                    .select('*')
                    .eq('is_active', true)
                    .order('points_cost', { ascending: true });

                if (!error && data && (data as any[]).length > 0) {
                    setRewards((data as any[]).map((r: any) => ({
                        id: r.id,
                        name: r.name,
                        description: r.description,
                        pointsCost: r.points_cost,
                        type: r.type as 'free_item' | 'discount' | 'percentage',
                        value: r.value,
                        isActive: r.is_active
                    })));
                } else if (error) {
                    console.warn('Loyalty rewards table not found, using defaults:', error.message);
                }
            } catch (e) {
                console.warn('Failed to fetch rewards, using defaults:', e);
            }
        };

        fetchRewards();
    }, []);

    const lookupCustomer = async (phone: string): Promise<LoyaltyCustomer | null> => {
        setIsLoading(true);
        try {
            // Normalize phone number
            const normalizedPhone = phone.replace(/\s+/g, '').replace(/^(\+33|0033)/, '0');

            const { data, error } = await supabase
                .from('loyalty_customers' as any)
                .select('*')
                .eq('phone', normalizedPhone)
                .single();

            // Check if table doesn't exist
            if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
                console.warn('Loyalty tables not found. Please apply migration.');
                setIsLoading(false);
                return null;
            }

            if (error || !data) {
                setIsLoading(false);
                return null;
            }

            const rec = data as any;
            const customerData: LoyaltyCustomer = {
                id: rec.id,
                phone: rec.phone,
                name: rec.name,
                points: rec.points,
                totalSpent: rec.total_spent,
                totalOrders: rec.total_orders,
                firstOrderDone: rec.first_order_done || false,
                joinedAt: new Date(rec.created_at)
            };

            setCustomer(customerData);
            localStorage.setItem('twinpizza-loyalty-phone', normalizedPhone);

            // Fetch transactions
            const { data: txData } = await supabase
                .from('loyalty_transactions' as any)
                .select('*')
                .eq('customer_id', rec.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (txData) {
                setTransactions((txData as any[]).map((tx: any) => ({
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
            console.warn('Lookup failed:', e);
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
                .from('loyalty_customers' as any)
                .insert({
                    phone: normalizedPhone,
                    name,
                    points: 0, // No welcome bonus - wait for first order
                    total_spent: 0,
                    total_orders: 0,
                    first_order_done: false
                })
                .select()
                .single();

            if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
                console.warn('Loyalty tables not found. Please apply migration.');
                setIsLoading(false);
                return null;
            }

            if (error || !data) {
                console.warn('Registration failed:', error?.message);
                setIsLoading(false);
                return null;
            }

            const rec = data as any;
            const customerData: LoyaltyCustomer = {
                id: rec.id,
                phone: rec.phone,
                name: rec.name,
                points: 0,
                totalSpent: 0,
                totalOrders: 0,
                firstOrderDone: false,
                joinedAt: new Date(rec.created_at)
            };

            setCustomer(customerData);
            localStorage.setItem('twinpizza-loyalty-phone', normalizedPhone);
            setIsLoading(false);
            return customerData;
        } catch (e) {
            console.warn('Registration error:', e);
            setIsLoading(false);
            return null;
        }
    };

    // SIMPLE: 1 point per €1 spent
    const calculatePointsToEarn = (amount: number): number => {
        return Math.floor(amount); // 1pt per €1
    };

    const earnPoints = async (orderId: string, amount: number, description?: string): Promise<boolean> => {
        if (!customer) return false;

        try {
            const basePoints = Math.floor(amount);

            // Call RPC function which handles online bonus and first order bonus
            const { error } = await (supabase.rpc as any)('add_loyalty_points', {
                p_customer_id: customer.id,
                p_points: basePoints,
                p_order_id: orderId,
                p_amount: amount,
                p_description: description || `Commande #${orderId.slice(-6)}`
            });

            if (error) {
                console.error('Failed to add points:', error);
                return false;
            }

            // Calculate what we expect to earn
            const earned = calculatePointsToEarn(amount);

            // Update local state
            setCustomer({
                ...customer,
                points: customer.points + earned,
                totalSpent: customer.totalSpent + amount,
                totalOrders: customer.totalOrders + 1,
                firstOrderDone: true
            });

            // Add transaction to local state
            const newTransaction: LoyaltyTransaction = {
                id: `tx-${Date.now()}`,
                type: 'earn',
                points: earned,
                description: description || `Commande #${orderId.slice(-6)} (+${earned} pts)`,
                createdAt: new Date(),
                orderId
            };

            setTransactions([newTransaction, ...transactions]);

            return true;
        } catch (e) {
            console.error('Earn points error:', e);
            return false;
        }
    };

    const redeemReward = async (rewardId: string): Promise<{ success: boolean; discount?: number; discountType?: 'amount' | 'percentage' }> => {
        if (!customer) return { success: false };

        const reward = rewards.find(r => r.id === rewardId);
        if (!reward || customer.points < reward.pointsCost) {
            return { success: false };
        }

        try {
            const { error } = await (supabase.rpc as any)('redeem_loyalty_reward', {
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
                points: customer.points - reward.pointsCost
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

            // Clear selected reward
            setSelectedReward(null);

            return {
                success: true,
                discount: reward.value,
                discountType: reward.type === 'percentage' ? 'percentage' : 'amount'
            };
        } catch (e) {
            console.error('Redeem error:', e);
            return { success: false };
        }
    };

    const selectReward = (reward: LoyaltyReward | null) => {
        setSelectedReward(reward);
    };

    const canUseReward = (rewardId: string, hasPromoCode: boolean): boolean => {
        // Can't combine rewards with promo codes
        if (hasPromoCode) return false;
        if (!customer) return false;

        const reward = rewards.find(r => r.id === rewardId);
        if (!reward) return false;

        return customer.points >= reward.pointsCost;
    };

    const getRewards = (): LoyaltyReward[] => {
        return rewards.filter(r => r.isActive);
    };

    // Get the next reward the customer can earn
    const getNextReward = (): { reward: LoyaltyReward; pointsNeeded: number } | null => {
        if (!customer) return null;

        const sortedRewards = [...rewards].filter(r => r.isActive).sort((a, b) => a.pointsCost - b.pointsCost);

        for (const reward of sortedRewards) {
            if (customer.points < reward.pointsCost) {
                return {
                    reward,
                    pointsNeeded: reward.pointsCost - customer.points
                };
            }
        }

        return null; // Customer can afford all rewards
    };

    const findOrCreateCustomer = async (phone: string, name: string): Promise<LoyaltyCustomer | null> => {
        const existing = await lookupCustomer(phone);
        if (existing) return existing;
        return registerCustomer(phone, name);
    };

    const logout = () => {
        setCustomer(null);
        setTransactions([]);
        setSelectedReward(null);
        localStorage.removeItem('twinpizza-loyalty-phone');
    };

    return (
        <LoyaltyContext.Provider value={{
            customer,
            isLoading,
            rewards,
            transactions,
            selectedReward,
            lookupCustomer,
            registerCustomer,
            findOrCreateCustomer,
            earnPoints,
            redeemReward,
            selectReward,
            getRewards,
            getNextReward,
            calculatePointsToEarn,
            canUseReward,
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
