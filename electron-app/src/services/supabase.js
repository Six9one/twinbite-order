const { createClient } = require('@supabase/supabase-js');

// Production credentials (hardcoded for packaged app)
const SUPABASE_URL = 'https://hsylnrzxeyqxczdalurj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc';

console.log('✅ Supabase configured');

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get today's orders
async function getOrders(dateFilter = null) {
    if (!supabase) return [];

    const today = dateFilter || new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }

    return data || [];
}

// Get customer loyalty info by phone
async function getLoyaltyByPhone(phone) {
    if (!supabase) return null;

    // Clean phone number
    const cleanPhone = phone.replace(/\s/g, '').replace(/^0/, '');

    // Try multiple formats
    const formats = [phone, cleanPhone, `0${cleanPhone}`, `+33${cleanPhone}`];

    for (const phoneFormat of formats) {
        const { data, error } = await supabase
            .from('loyalty_stamps')
            .select('*')
            .eq('phone', phoneFormat)
            .maybeSingle();

        if (data) {
            return data;
        }
    }

    return { stamps: 0, phone, last_order: null };
}

// Get customer pizza credits
async function getPizzaCredits(phone) {
    if (!supabase) return [];

    const cleanPhone = phone.replace(/\s/g, '');

    const { data, error } = await supabase
        .from('pizza_credits')
        .select('*')
        .eq('phone', cleanPhone)
        .eq('used', false);

    return data || [];
}

// Get order history for a phone number
async function getOrderHistory(phone) {
    if (!supabase) return [];

    const cleanPhone = phone.replace(/\s/g, '');

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', cleanPhone)
        .order('created_at', { ascending: false })
        .limit(10);

    return data || [];
}

// Subscribe to new orders (real-time)
function subscribeToOrders(callback) {
    if (!supabase) return null;

    const channel = supabase
        .channel('orders-channel')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            (payload) => {
                console.log('🆕 New order received:', payload.new.order_number);
                callback(payload.new);
            }
        )
        .subscribe();

    return channel;
}

// Get daily stats
async function getDailyStats(dateFilter = null) {
    const orders = await getOrders(dateFilter);

    const stats = {
        total: 0,
        orderCount: orders.length,
        pendingCount: 0,
        preparingCount: 0,
        completedCount: 0,
        cbTotal: 0,
        cashTotal: 0,
        onlineTotal: 0
    };

    orders.forEach(order => {
        if (order.status !== 'cancelled') {
            stats.total += order.total || 0;

            if (order.payment_method === 'cb') stats.cbTotal += order.total || 0;
            if (order.payment_method === 'especes') stats.cashTotal += order.total || 0;
            if (order.payment_method === 'en_ligne') stats.onlineTotal += order.total || 0;
        }

        if (order.status === 'pending') stats.pendingCount++;
        if (order.status === 'preparing') stats.preparingCount++;
        if (order.status === 'completed') stats.completedCount++;
    });

    return stats;
}

module.exports = {
    supabase,
    getOrders,
    getLoyaltyByPhone,
    getPizzaCredits,
    getOrderHistory,
    subscribeToOrders,
    getDailyStats
};
