import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CartItem, MenuItem, OrderType, ProductCustomization, SouffletOrder } from '@/types/order';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'react';

interface GroupParticipant {
    id: string;
    name: string;
    items: CartItem[];
    joinedAt: Date;
    isHost: boolean;
}

interface GroupOrder {
    id: string;
    code: string;
    hostId: string;
    hostName: string;
    participants: GroupParticipant[];
    orderType: OrderType;
    status: 'open' | 'closed' | 'submitted';
    createdAt: Date;
    expiresAt: Date;
}

interface GroupOrderContextType {
    // State
    groupOrder: GroupOrder | null;
    isGroupMode: boolean;
    currentParticipantId: string | null;
    isHost: boolean;

    // Actions
    createGroupOrder: (hostName: string, orderType: OrderType) => Promise<string>;
    joinGroupOrder: (code: string, participantName: string) => Promise<boolean>;
    leaveGroupOrder: () => void;
    addItemToGroup: (item: MenuItem, quantity: number, customization?: ProductCustomization | SouffletOrder, calculatedPrice?: number) => void;
    removeItemFromGroup: (itemId: string) => void;
    closeGroupOrder: () => void;
    getAllItems: () => CartItem[];
    getMyItems: () => CartItem[];
    getGroupTotal: () => number;
    getShareableLink: () => string;
}

const GroupOrderContext = createContext<GroupOrderContextType | undefined>(undefined);

// Generate a random 6-character code
const generateGroupCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Generate a unique ID
const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export function GroupOrderProvider({ children }: { children: ReactNode }) {
    const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);
    const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);

    // Check for existing group session on mount
    useEffect(() => {
        const savedSession = localStorage.getItem('twinpizza-group-session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                // Validate session hasn't expired (3 hours max)
                if (new Date(session.expiresAt) > new Date()) {
                    setGroupOrder(session.groupOrder);
                    setCurrentParticipantId(session.participantId);
                } else {
                    localStorage.removeItem('twinpizza-group-session');
                }
            } catch (e) {
                localStorage.removeItem('twinpizza-group-session');
            }
        }
    }, []);

    // Save session whenever group order changes
    useEffect(() => {
        if (groupOrder && currentParticipantId) {
            localStorage.setItem('twinpizza-group-session', JSON.stringify({
                groupOrder,
                participantId: currentParticipantId,
                expiresAt: groupOrder.expiresAt
            }));
        }
    }, [groupOrder, currentParticipantId]);

    // Real-time sync with Supabase (optional - for true real-time)
    useEffect(() => {
        if (!groupOrder) return;

        // Subscribe to group order changes
        const channel = supabase
            .channel(`group-${groupOrder.code}`)
            .on('broadcast', { event: 'group-update' }, ({ payload }) => {
                if (payload.groupOrder) {
                    setGroupOrder(payload.groupOrder);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupOrder?.code]);

    const broadcastUpdate = useCallback((updatedOrder: GroupOrder) => {
        if (!updatedOrder) return;

        supabase.channel(`group-${updatedOrder.code}`).send({
            type: 'broadcast',
            event: 'group-update',
            payload: { groupOrder: updatedOrder }
        });
    }, []);

    const isGroupMode = !!groupOrder;
    const isHost = currentParticipantId === groupOrder?.hostId;

    const createGroupOrder = async (hostName: string, orderType: OrderType): Promise<string> => {
        const code = generateGroupCode();
        const hostId = generateId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours

        const newGroupOrder: GroupOrder = {
            id: generateId(),
            code,
            hostId,
            hostName,
            participants: [{
                id: hostId,
                name: hostName,
                items: [],
                joinedAt: now,
                isHost: true
            }],
            orderType,
            status: 'open',
            createdAt: now,
            expiresAt
        };

        setGroupOrder(newGroupOrder);
        setCurrentParticipantId(hostId);

        // Store in Supabase for persistence
        try {
            await supabase.from('group_orders').insert({
                id: newGroupOrder.id,
                code,
                host_id: hostId,
                host_name: hostName,
                order_type: orderType,
                status: 'open',
                data: newGroupOrder,
                expires_at: expiresAt.toISOString()
            });
        } catch (e) {
            console.error('Failed to persist group order:', e);
        }

        return code;
    };

    const joinGroupOrder = async (code: string, participantName: string): Promise<boolean> => {
        // Try local first (for same device)
        if (groupOrder?.code === code.toUpperCase()) {
            const participantId = generateId();
            const updatedOrder = {
                ...groupOrder,
                participants: [
                    ...groupOrder.participants,
                    {
                        id: participantId,
                        name: participantName,
                        items: [],
                        joinedAt: new Date(),
                        isHost: false
                    }
                ]
            };
            setGroupOrder(updatedOrder);
            setCurrentParticipantId(participantId);
            broadcastUpdate(updatedOrder);
            return true;
        }

        // Try fetching from Supabase
        try {
            const { data, error } = await supabase
                .from('group_orders')
                .select('*')
                .eq('code', code.toUpperCase())
                .eq('status', 'open')
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error || !data) {
                console.error('Group not found:', error);
                return false;
            }

            const participantId = generateId();
            const existingOrder = data.data as GroupOrder;

            const updatedOrder: GroupOrder = {
                ...existingOrder,
                participants: [
                    ...existingOrder.participants,
                    {
                        id: participantId,
                        name: participantName,
                        items: [],
                        joinedAt: new Date(),
                        isHost: false
                    }
                ]
            };

            // Update in Supabase
            await supabase
                .from('group_orders')
                .update({ data: updatedOrder })
                .eq('id', data.id);

            setGroupOrder(updatedOrder);
            setCurrentParticipantId(participantId);
            broadcastUpdate(updatedOrder);
            return true;
        } catch (e) {
            console.error('Failed to join group order:', e);
            return false;
        }
    };

    const leaveGroupOrder = () => {
        if (!groupOrder || !currentParticipantId) return;

        if (isHost) {
            // Host leaving closes the order
            closeGroupOrder();
        } else {
            // Remove participant
            const updatedOrder = {
                ...groupOrder,
                participants: groupOrder.participants.filter(p => p.id !== currentParticipantId)
            };
            broadcastUpdate(updatedOrder);
        }

        setGroupOrder(null);
        setCurrentParticipantId(null);
        localStorage.removeItem('twinpizza-group-session');
    };

    const addItemToGroup = (
        item: MenuItem,
        quantity: number,
        customization?: ProductCustomization | SouffletOrder,
        calculatedPrice?: number
    ) => {
        if (!groupOrder || !currentParticipantId) return;

        const cartItem: CartItem = {
            id: `${item.id}-${Date.now()}`,
            item,
            quantity,
            customization,
            calculatedPrice
        };

        const updatedOrder = {
            ...groupOrder,
            participants: groupOrder.participants.map(p =>
                p.id === currentParticipantId
                    ? { ...p, items: [...p.items, cartItem] }
                    : p
            )
        };

        setGroupOrder(updatedOrder);
        broadcastUpdate(updatedOrder);
    };

    const removeItemFromGroup = (itemId: string) => {
        if (!groupOrder || !currentParticipantId) return;

        const updatedOrder = {
            ...groupOrder,
            participants: groupOrder.participants.map(p =>
                p.id === currentParticipantId
                    ? { ...p, items: p.items.filter(i => i.id !== itemId) }
                    : p
            )
        };

        setGroupOrder(updatedOrder);
        broadcastUpdate(updatedOrder);
    };

    const closeGroupOrder = () => {
        if (!groupOrder || !isHost) return;

        const updatedOrder = {
            ...groupOrder,
            status: 'closed' as const
        };

        setGroupOrder(updatedOrder);
        broadcastUpdate(updatedOrder);

        // Update in Supabase
        supabase
            .from('group_orders')
            .update({ status: 'closed', data: updatedOrder })
            .eq('id', groupOrder.id);
    };

    const getAllItems = (): CartItem[] => {
        if (!groupOrder) return [];
        return groupOrder.participants.flatMap(p => p.items);
    };

    const getMyItems = (): CartItem[] => {
        if (!groupOrder || !currentParticipantId) return [];
        const participant = groupOrder.participants.find(p => p.id === currentParticipantId);
        return participant?.items || [];
    };

    const getGroupTotal = (): number => {
        return getAllItems().reduce((total, item) => {
            const price = item.calculatedPrice || item.item.price;
            return total + price * item.quantity;
        }, 0);
    };

    const getShareableLink = (): string => {
        if (!groupOrder) return '';
        const baseUrl = window.location.origin;
        return `${baseUrl}/?group=${groupOrder.code}`;
    };

    return (
        <GroupOrderContext.Provider value={{
            groupOrder,
            isGroupMode,
            currentParticipantId,
            isHost,
            createGroupOrder,
            joinGroupOrder,
            leaveGroupOrder,
            addItemToGroup,
            removeItemFromGroup,
            closeGroupOrder,
            getAllItems,
            getMyItems,
            getGroupTotal,
            getShareableLink
        }}>
            {children}
        </GroupOrderContext.Provider>
    );
}

export function useGroupOrder() {
    const context = useContext(GroupOrderContext);
    if (context === undefined) {
        throw new Error('useGroupOrder must be used within a GroupOrderProvider');
    }
    return context;
}
