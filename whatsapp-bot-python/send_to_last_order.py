#!/usr/bin/env python3
"""
Send WhatsApp notification to the LAST order.
Use this when the bot was started after an order was placed.

Run me with: python send_to_last_order.py
"""

import os
import sys

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import httpx

# Import from main bot
from config import SUPABASE_URL, SUPABASE_ANON_KEY

def main():
    print("\n" + "="*50)
    print("TWIN PIZZA - Send to Last Order")
    print("="*50 + "\n")
    
    # Supabase REST API headers
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    
    base_url = f"{SUPABASE_URL}/rest/v1/orders"
    
    # Fetch the last order
    print("[*] Fetching the last order from Supabase...")
    
    try:
        client = httpx.Client(timeout=30.0)
        response = client.get(
            base_url,
            headers=headers,
            params={"select": "*", "order": "created_at.desc", "limit": "1"}
        )
        
        if response.status_code != 200:
            print(f"[ERROR] Supabase error: {response.status_code} - {response.text}")
            return
        
        data = response.json()
        if not data:
            print("[ERROR] No orders found!")
            return
        
        order = data[0]
        order_number = order.get('order_number', 'N/A')
        customer_name = order.get('customer_name', 'Client')
        phone = order.get('customer_phone', '')
        total = order.get('total', 0)
        
        print(f"\n[ORDER] Found last order:")
        print(f"   Number:   #{order_number}")
        print(f"   Customer: {customer_name}")
        print(f"   Phone:    {phone}")
        print(f"   Total:    {total:.2f} EUR")
        print()
        
        if not phone:
            print("[ERROR] This order has no phone number!")
            return
        
        # Ask for confirmation
        confirm = input("Send WhatsApp message to this order? (y/n): ").strip().lower()
        if confirm != 'y':
            print("[*] Cancelled.")
            return
        
        print("\n[*] Importing WhatsApp functions...")
        
        # Import the bot functions
        from bot import init_whatsapp, send_order_confirmation, driver, is_ready
        
        # Check if WhatsApp is already initialized
        if not is_ready:
            print("[*] WhatsApp not initialized, starting...")
            if not init_whatsapp():
                print("[ERROR] Could not initialize WhatsApp!")
                return
        
        print("\n[*] Sending order confirmation to customer...")
        send_order_confirmation(order)
        
        print("\n[OK] Done! Message sent successfully.")
        print("[*] The main bot window should still be open - you can close it or leave it running.\n")
        
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
