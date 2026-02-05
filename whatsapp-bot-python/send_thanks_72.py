#!/usr/bin/env python3
"""Send thank you message to order #72"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from bot import init_whatsapp, send_whatsapp_message, is_ready

phone = "0684484943"
message = """*TWIN PIZZA*

Bonjour Ocelina !

Merci pour votre commande *#72* !

Retrouvez votre carte de fidelite ici :
https://twinpizza.fr/ticket?phone=0684484943

A tres bientot !"""

print("[*] Sending thank you message to order #72...")
print(f"[*] Phone: {phone}")

if not is_ready:
    print("[*] WhatsApp not ready, initializing...")
    if not init_whatsapp():
        print("[ERROR] Could not initialize WhatsApp!")
        sys.exit(1)

result = send_whatsapp_message(phone, message)
if result:
    print("[OK] Message sent successfully!")
else:
    print("[ERROR] Failed to send message")
