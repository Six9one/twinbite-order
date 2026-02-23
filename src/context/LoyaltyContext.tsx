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
    stamps: number; // Stamp card count (resets every 10)
    totalStamps: number; // Total stamps ever earned
    freeItemsAvailable: number; // Number of free items to claim
    pizzaCredits: number; // Total count of deferred free pizzas
    pizzaCreditsList: PizzaCredit[]; // Detailed list with sizes
    totalSpent: number;
    totalOrders: number;
    firstOrderDone: boolean;
    joinedAt: Date;
}

// Pizza credit with size info
interface PizzaCredit {
    id: string;
    size: 'senior' | 'mega';
    createdAt: Date;
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
    addStamps: (orderId: string, stampCount: number, description?: string) => Promise<boolean>;
    redeemFreeItem: () => Promise<boolean>;
    redeemReward: (rewardId: string) => Promise<{ success: boolean; discount?: number; discountType?: 'amount' | 'percentage' }>;
    selectReward: (reward: LoyaltyReward | null) => void;
    getRewards: () => LoyaltyReward[];
    getNextReward: () => { reward: LoyaltyReward; pointsNeeded: number } | null;
    calculatePointsToEarn: (amount: number) => number;
    canUseReward: (rewardId: string, hasPromoCode: boolean) => boolean;
    logout: () => void;
    // Pizza credits
    getPizzaCredits: () => number;
    getPizzaCreditsWithSize: () => PizzaCredit[];
    addPizzaCredit: (orderId: string, size: 'senior' | 'mega') => Promise<boolean>;
    redeemPizzaCredit: (orderId: string) => Promise<{ success: boolean; size?: 'senior' | 'mega' }>;
}

// V1 Default rewards - SIMPLIFIED: 100 points = €10
const DEFAULT_REWARDS: LoyaltyReward[] = [
    {
        id: 'discount-5-euro',
        name: '5€ de réduction',
        description: 'Échangez 100 points contre 5€ de réduction',
        pointsCost: 100,
        type: 'discount',
        value: 5,
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

                if (error) {
                    if (error.code === '42P01' || error.message?.includes('does not exist')) {
                        console.warn('Loyalty rewards table not found, using defaults.');
                    } else {
                        console.error('Error fetching rewards:', error.message);
                    }
                    return;
                }

                if (data && (data as any[]).length > 0) {
                    setRewards((data as any[]).map((r: any) => ({
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
                if (error && error.code !== 'PGRST116') { // PGRST116 is just "no rows found" which is fine
                    console.error('Error looking up customer:', error.message);
                }
                setIsLoading(false);
                return null;
            }

            const rec = data as any;
            if (!rec) {
                setIsLoading(false);
                return null;
            }

            const customerData: LoyaltyCustomer = {
                id: rec.id,
                phone: rec.phone,
                name: rec.name || 'Client',
                points: rec.points || 0,
                stamps: rec.stamps || 0,
                totalStamps: rec.total_stamps || 0,
                freeItemsAvailable: rec.free_items_available || 0,
                pizzaCredits: rec.pizza_credits_available || 0,
                pizzaCreditsList: [], // Will be populated below
                totalSpent: rec.total_spent || 0,
                totalOrders: rec.total_orders || 0,
                firstOrderDone: rec.first_order_done || false,
                joinedAt: rec.created_at ? new Date(rec.created_at) : new Date()
            };

            // Fetch pizza credits with size info
            try {
                const { data: creditsData } = await (supabase.rpc as any)('get_pizza_credits_info', {
                    p_phone: normalizedPhone
                });
                if (creditsData && creditsData[0]?.credits) {
                    customerData.pizzaCreditsList = (creditsData[0].credits || []).map((c: any) => ({
                        id: c.id,
                        size: c.size || 'senior',
                        createdAt: new Date(c.created_at)
                    }));
                    customerData.pizzaCredits = creditsData[0].total_credits || 0;
                }
            } catch (e) {
                console.log('Could not fetch pizza credits info:', e);
            }

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
                stamps: 0,
                totalStamps: 0,
                freeItemsAvailable: 0,
                pizzaCredits: 0,
                pizzaCreditsList: [],
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

    // STAMP CARD SYSTEM: Add stamps for qualifying purchases
    const addStamps = async (orderId: string, stampCount: number, description?: string): Promise<boolean> => {
        if (!customer || stampCount <= 0) return false;

        try {
            // IMPORTANT: Fetch fresh customer data from database to avoid stale state
            const { data: freshData, error: fetchError } = await supabase
                .from('loyalty_customers' as any)
                .select('*')
                .eq('id', customer.id)
                .single();

            if (fetchError || !freshData) {
                console.error('Failed to fetch fresh customer data:', fetchError);
                return false;
            }
            const freshRec = freshData as any;
            const currentTotalStamps = freshRec.total_stamps || 0;
            const currentFreeItems = freshRec.free_items_available || 0;

            const newTotalStamps = currentTotalStamps + stampCount;
            const STAMPS_FOR_FREE = 9;

            // Calculate new stamps (cycles after 10) and free items
            const previousCycles = Math.floor(currentTotalStamps / STAMPS_FOR_FREE);
            const newCycles = Math.floor(newTotalStamps / STAMPS_FOR_FREE);
            const newFreeItems = newCycles - previousCycles;
            const newStamps = newTotalStamps % STAMPS_FOR_FREE;

            // Update in database
            // NOTE: Also update 'points' field because SimpleLoyaltyManager uses 'points' to display/manage "tampons"
            const { error } = await supabase
                .from('loyalty_customers' as any)
                .update({
                    stamps: newStamps,
                    total_stamps: newTotalStamps,
                    free_items_available: currentFreeItems + newFreeItems,
                    points: newTotalStamps // Sync points with total stamps for SimpleLoyaltyManager compatibility
                })
                .eq('id', customer.id);

            if (error) {
                console.error('Failed to add stamps:', error);
                return false;
            }

            // Log transaction
            await supabase
                .from('loyalty_transactions' as any)
                .insert({
                    customer_id: customer.id,
                    type: 'earn',
                    points: stampCount, // Using points field for stamps
                    description: description || `+${stampCount} tampon${stampCount > 1 ? 's' : ''} (Commande #${orderId.slice(-6)})`,
                    order_id: orderId
                });

            // Update local state with fresh values
            setCustomer({
                ...customer,
                stamps: newStamps,
                totalStamps: newTotalStamps,
                freeItemsAvailable: currentFreeItems + newFreeItems
            });

            console.log(`[STAMPS] Added ${stampCount} stamps. Previous: ${currentTotalStamps}, New Total: ${newTotalStamps}, Free items: ${currentFreeItems + newFreeItems}`);
            return true;
        } catch (e) {
            console.error('Add stamps error:', e);
            return false;
        }
    };


    // Redeem a free item (uses 1 free item credit)
    const redeemFreeItem = async (): Promise<boolean> => {
        if (!customer || customer.freeItemsAvailable <= 0) return false;

        try {
            const { error } = await supabase
                .from('loyalty_customers' as any)
                .update({
                    free_items_available: customer.freeItemsAvailable - 1
                })
                .eq('id', customer.id);

            if (error) {
                console.error('Failed to redeem free item:', error);
                return false;
            }

            // Log transaction
            await supabase
                .from('loyalty_transactions' as any)
                .insert({
                    customer_id: customer.id,
                    type: 'redeem',
                    points: -9, // Represents 9 stamps used
                    description: 'Produit offert réclamé (Carte de fidélité)'
                });

            // Update local state
            setCustomer({
                ...customer,
                freeItemsAvailable: customer.freeItemsAvailable - 1
            });

            console.log('[STAMPS] Free item redeemed. Remaining:', customer.freeItemsAvailable - 1);
            return true;
        } catch (e) {
            console.error('Redeem free item error:', e);
            return false;
        }
    };

    const logout = () => {
        setCustomer(null);
        setTransactions([]);
        setSelectedReward(null);
        localStorage.removeItem('twinpizza-loyalty-phone');
    };

    // Pizza Credits
    const getPizzaCredits = (): number => {
        return customer?.pizzaCredits || 0;
    };

    const getPizzaCreditsWithSize = (): PizzaCredit[] => {
        return customer?.pizzaCreditsList || [];
    };

    const addPizzaCredit = async (orderId: string, size: 'senior' | 'mega'): Promise<boolean> => {
        if (!customer) return false;
        try {
            const { error } = await (supabase.rpc as any)('add_pizza_credit', {
                p_phone: customer.phone,
                p_order_id: orderId,
                p_size: size
            });
            if (error) {
                console.error('Failed to add pizza credit:', error);
                return false;
            }
            // Refresh customer data
            await lookupCustomer(customer.phone);
            return true;
        } catch (e) {
            console.error('Add pizza credit error:', e);
            return false;
        }
    };

    const redeemPizzaCredit = async (orderId: string): Promise<{ success: boolean; size?: 'senior' | 'mega' }> => {
        if (!customer) return { success: false };
        try {
            const { data, error } = await (supabase.rpc as any)('redeem_pizza_credit', {
                p_phone: customer.phone,
                p_order_id: orderId
            });
            if (error) {
                console.error('Failed to redeem pizza credit:', error);
                return { success: false };
            }
            // Refresh customer data
            await lookupCustomer(customer.phone);
            return { success: true, size: data as 'senior' | 'mega' };
        } catch (e) {
            console.error('Redeem pizza credit error:', e);
            return { success: false };
        }
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
            addStamps,
            redeemFreeItem,
            redeemReward,
            selectReward,
            getRewards,
            getNextReward,
            calculatePointsToEarn,
            canUseReward,
            logout,
            getPizzaCredits,
            getPizzaCreditsWithSize,
            addPizzaCredit,
            redeemPizzaCredit
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
