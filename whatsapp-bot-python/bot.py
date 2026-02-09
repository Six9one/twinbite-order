#!/usr/bin/env python3
"""
Twin Pizza WhatsApp Bot - Python Version
Sends order notifications via WhatsApp Web
"""

import os
import sys
import time
import re
import json
import subprocess
from datetime import datetime

# Fix Windows console encoding for emoji support
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

def safe_print(text):
    """Print with fallback for unsupported characters"""
    try:
        print(text)
    except UnicodeEncodeError:
        # Remove or replace emojis if console doesn't support them
        import re
        cleaned = re.sub(r'[\U0001F300-\U0001F9FF]', '*', text)
        print(cleaned)

# Selenium imports for WhatsApp Web automation
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# HTTP client for Supabase API calls (avoiding supabase-py proxy issues)
import httpx

# Configuration
from config import SUPABASE_URL, SUPABASE_ANON_KEY, DATA_FOLDER

# ===========================================
# GLOBALS
# ===========================================
driver = None
is_ready = False

# ===========================================
# WINDOWS NOTIFICATIONS
# ===========================================

def show_notification(title: str, message: str, is_error: bool = False):
    """Show Windows notification using PowerShell"""
    try:
        icon = "Warning" if is_error else "Information"
        ps_script = f'''
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
        $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
        $textNodes = $template.GetElementsByTagName("text")
        $textNodes.Item(0).AppendChild($template.CreateTextNode("{title}")) > $null
        $textNodes.Item(1).AppendChild($template.CreateTextNode("{message}")) > $null
        $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
        $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Twin Pizza")
        $notifier.Show($toast)
        '''
        subprocess.run(["powershell", "-Command", ps_script], capture_output=True, timeout=5)
    except Exception as e:
        # Fallback to simple message box if toast fails
        try:
            msg_type = 48 if is_error else 64  # 48=Warning, 64=Info
            subprocess.run([
                "powershell", "-Command",
                f'[System.Windows.Forms.MessageBox]::Show("{message}", "{title}", "OK", "{icon}")'
            ], capture_output=True, timeout=5)
        except:
            safe_print(f"[NOTIF] {title}: {message}")

def is_browser_already_running():
    """Check if WhatsApp session is already running"""
    try:
        # Check if there's a Chrome process using our data folder
        result = subprocess.run(
            ["powershell", "-Command", 
             "Get-Process chrome -ErrorAction SilentlyContinue | Select-Object -ExpandProperty CommandLine"],
            capture_output=True, text=True, timeout=5
        )
        if "whatsapp_session" in result.stdout.lower():
            return True
        
        # Also check if port 9222 is in use (Chrome remote debugging)
        result = subprocess.run(
            ["powershell", "-Command", "netstat -an | Select-String '9222'"],
            capture_output=True, text=True, timeout=5
        )
        if "LISTENING" in result.stdout:
            return True
    except:
        pass
    return False

# ===========================================
# HELPER FUNCTIONS
# ===========================================

def print_banner():
    """Print startup banner"""
    safe_print("\n" + "="*50)
    safe_print("[PIZZA] TWIN PIZZA - WhatsApp Bot (Python)")
    safe_print("="*50 + "\n")

def format_phone(phone: str) -> str:
    """Format phone number to international format (33XXXXXXXXX)"""
    if not phone:
        return ""
    
    # Remove spaces and special characters
    phone = re.sub(r'[\s\-\.\(\)]', '', phone)
    
    # Remove leading +
    phone = phone.lstrip('+')
    
    # Convert 0X to 33X (French numbers)
    if phone.startswith('0'):
        phone = '33' + phone[1:]
    
    return phone

def get_order_type_text(order_type: str) -> str:
    """Get readable order type in French"""
    types = {
        'livraison': 'Livraison [Delivery]',
        'emporter': 'A emporter [Pickup]',
        'sur_place': 'Sur place [Dine-in]'
    }
    return types.get(order_type, order_type)

# ===========================================
# WHATSAPP WEB AUTOMATION
# ===========================================

def find_chrome_path():
    """Find Chrome executable path on Windows"""
    import winreg
    try:
        # Try to get Chrome path from registry
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")
        chrome_path, _ = winreg.QueryValueEx(key, "")
        winreg.CloseKey(key)
        return chrome_path
    except:
        # Default paths
        default_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
        ]
        for path in default_paths:
            if os.path.exists(path):
                return path
    return None

def init_whatsapp():
    """Initialize WhatsApp Web browser session"""
    global driver, is_ready
    
    # Check if browser is already running
    if is_browser_already_running():
        safe_print("[!] WhatsApp session deja ouverte!")
        safe_print("[*] Utilisez la fenetre existante ou fermez-la d'abord.")
        show_notification("WhatsApp Bot", "Session deja ouverte! Fermez l'ancienne fenetre.", is_error=True)
        return False
    
    safe_print("[*] Initialisation de WhatsApp Web...")
    
    # Find Chrome
    chrome_path = find_chrome_path()
    if chrome_path:
        safe_print(f"[*] Chrome trouve: {chrome_path}")
    else:
        safe_print("[ERROR] Chrome non trouve! Installez Google Chrome.")
        return False
    
    # Chrome options
    chrome_options = Options()
    chrome_options.binary_location = chrome_path
    
    # Create session folder if it doesn't exist
    session_path = os.path.join(os.path.dirname(__file__), DATA_FOLDER)
    os.makedirs(session_path, exist_ok=True)
    
    # User data directory to keep session
    chrome_options.add_argument(f"--user-data-dir={session_path}")
    chrome_options.add_argument("--profile-directory=Default")
    
    # Other options
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1200,900")
    chrome_options.add_argument("--remote-debugging-port=9222")
    
    # Don't run headless - we need to see QR code
    # chrome_options.add_argument("--headless")
    
    # Suppress logging
    chrome_options.add_argument("--log-level=3")
    
    try:
        safe_print("[*] Telechargement du ChromeDriver...")
        # Initialize Chrome driver with explicit driver type for Windows
        driver_path = ChromeDriverManager().install()
        safe_print(f"[*] ChromeDriver: {driver_path}")
        
        # On Windows, make sure we're using the .exe file
        if sys.platform == 'win32' and not driver_path.endswith('.exe'):
            # Find the actual driver executable
            driver_dir = os.path.dirname(driver_path)
            for f in os.listdir(driver_dir):
                if f.endswith('.exe') and 'chromedriver' in f.lower():
                    driver_path = os.path.join(driver_dir, f)
                    break
        
        service = Service(executable_path=driver_path)
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Navigate to WhatsApp Web
        safe_print("[*] Ouverture de WhatsApp Web...")
        driver.get("https://web.whatsapp.com")
        
        safe_print("\n" + "="*50)
        safe_print("[!] SCANNEZ LE QR CODE AVEC VOTRE TELEPHONE")
        safe_print("   (WhatsApp > Menu > Appareils connectes > Lier)")
        safe_print("="*50 + "\n")
        
        # Wait for user to scan QR code
        safe_print("[...] En attente de connexion...")
        safe_print("[*] Une fois connecte, appuyez sur ENTREE dans ce terminal...")
        
        # Try multiple selectors for login detection
        login_selectors = [
            'div[data-testid="chat-list"]',
            'div[aria-label="Discussions"]',
            'div[aria-label="Chats"]', 
            '#pane-side',
            'div[data-testid="default-user"]',
            'span[data-testid="menu"]'
        ]
        
        # Poll for any of the selectors to appear
        max_wait = 300  # 5 minutes
        check_interval = 2
        elapsed = 0
        
        while elapsed < max_wait:
            try:
                for selector in login_selectors:
                    try:
                        element = driver.find_element(By.CSS_SELECTOR, selector)
                        if element:
                            safe_print(f"\n[OK] WhatsApp connecte avec succes! (detecte: {selector})")
                            is_ready = True
                            return True
                    except:
                        pass
                
                # Check if page title changed (indicates login)
                if "WhatsApp" in driver.title and "QR" not in driver.page_source[:5000]:
                    # Check for any sidebar element
                    try:
                        driver.find_element(By.CSS_SELECTOR, 'div[id="side"]')
                        safe_print("\n[OK] WhatsApp connecte avec succes!")
                        is_ready = True
                        return True
                    except:
                        pass
                
                time.sleep(check_interval)
                elapsed += check_interval
                
                # Show progress every 30 seconds
                if elapsed % 30 == 0:
                    safe_print(f"[...] Toujours en attente... ({elapsed}s / {max_wait}s)")
                    
            except Exception as inner_e:
                time.sleep(check_interval)
                elapsed += check_interval
        
        safe_print("[ERROR] Timeout - QR code non scanne a temps")
        return False
        
    except Exception as e:
        safe_print(f"[ERROR] Erreur d'initialisation: {e}")
        import traceback
        safe_print(traceback.format_exc())
        return False

def send_whatsapp_message(phone: str, message: str) -> bool:
    """Send a message via WhatsApp Web"""
    global driver
    
    if not driver or not is_ready:
        safe_print("[ERROR] WhatsApp non connecte")
        return False
    
    try:
        # Format phone number
        formatted_phone = format_phone(phone)
        if len(formatted_phone) < 10:
            safe_print(f"[WARN] Numero invalide: {phone}")
            return False
        
        safe_print(f"[*] Envoi message a {formatted_phone}...")
        
        # Open chat with phone number using WhatsApp URL scheme
        url = f"https://web.whatsapp.com/send?phone={formatted_phone}"
        driver.get(url)
        
        # Wait for page to load
        time.sleep(5)
        
        # Multiple selectors for the message input box (WhatsApp changes these frequently)
        input_selectors = [
            'div[data-testid="conversation-compose-box-input"]',
            'p.selectable-text.copyable-text',
            'div[contenteditable="true"][data-tab="10"]',
            'div[contenteditable="true"][role="textbox"]',
            'footer div[contenteditable="true"]',
            'div[aria-placeholder="Entrez un message"]',
            'div[aria-placeholder="Type a message"]',
            'div[title="Taper un message"]',
            'div[title="Type a message"]',
            '#main footer div[contenteditable="true"]',
            'div.lexical-rich-text-input div[contenteditable="true"]'
        ]
        
        input_box = None
        for selector in input_selectors:
            try:
                wait = WebDriverWait(driver, 10)
                input_box = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                if input_box:
                    safe_print(f"[*] Input trouve avec: {selector}")
                    break
            except:
                continue
        
        if not input_box:
            safe_print("[ERROR] Impossible de trouver la zone de saisie")
            # Try to check if there's an error (invalid number)
            try:
                error_elem = driver.find_element(By.CSS_SELECTOR, 'div[data-testid="popup-contents"]')
                if error_elem:
                    safe_print("[ERROR] Numero de telephone non valide sur WhatsApp")
            except:
                pass
            return False
        
        # Click on input box to focus - with retry
        for attempt in range(3):
            try:
                # Scroll element into view
                driver.execute_script("arguments[0].scrollIntoView(true);", input_box)
                time.sleep(0.5)
                
                # Wait for element to be interactable
                WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.CSS_SELECTOR, 'div[contenteditable="true"]')))
                
                input_box.click()
                time.sleep(1)
                break
            except Exception as click_error:
                safe_print(f"[WARN] Click attempt {attempt+1} failed, retrying...")
                time.sleep(2)
        
        # Type the message - handle line breaks
        lines = message.split('\n')
        for i, line in enumerate(lines):
            input_box.send_keys(line)
            if i < len(lines) - 1:
                input_box.send_keys(Keys.SHIFT + Keys.ENTER)
        
        time.sleep(1)
        
        # Multiple selectors for send button
        send_selectors = [
            'button[data-testid="compose-btn-send"]',
            'span[data-testid="send"]',
            'button[aria-label="Envoyer"]',
            'button[aria-label="Send"]',
            'footer button[type="button"]'
        ]
        
        send_button = None
        for selector in send_selectors:
            try:
                send_button = driver.find_element(By.CSS_SELECTOR, selector)
                if send_button:
                    break
            except:
                continue
        
        if send_button:
            send_button.click()
            safe_print(f"[OK] Message envoye a {formatted_phone}")
        else:
            # Try pressing Enter as fallback
            input_box.send_keys(Keys.ENTER)
            safe_print(f"[OK] Message envoye a {formatted_phone} (via Enter)")
        
        # Wait a bit for message to be sent
        time.sleep(2)
        return True
        
    except Exception as e:
        safe_print(f"[ERROR] Erreur envoi message a {phone}: {e}")
        return False

# ===========================================
# ORDER NOTIFICATIONS
# ===========================================

def get_loyalty_info(phone: str, headers: dict) -> dict:
    """Fetch loyalty info for a customer"""
    try:
        # Format phone for lookup
        formatted = format_phone(phone)
        
        response = httpx.get(
            f"{SUPABASE_URL}/rest/v1/loyalty_points",
            headers=headers,
            params={"select": "*", "customer_phone": f"eq.{phone}"},
            timeout=10.0
        )
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return data[0]
    except Exception as e:
        safe_print(f"[WARN] Could not fetch loyalty info: {e}")
    return {}

def download_image(url: str) -> str:
    """Download image from URL and save to temp file, return file path"""
    try:
        response = httpx.get(url, timeout=30.0, follow_redirects=True)
        if response.status_code == 200:
            import tempfile
            # Create temp file with .png extension
            temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            temp_file.write(response.content)
            temp_file.close()
            return temp_file.name
    except Exception as e:
        safe_print(f"[WARN] Could not download image: {e}")
    return ""

def shorten_url(long_url: str) -> str:
    """Shorten a URL using TinyURL API"""
    try:
        # TinyURL API (free, no API key needed)
        api_url = f"http://tinyurl.com/api-create.php?url={long_url}"
        response = httpx.get(api_url, timeout=10.0)
        if response.status_code == 200:
            short_url = response.text.strip()
            safe_print(f"[*] URL shortened: {short_url}")
            return short_url
    except Exception as e:
        safe_print(f"[WARN] Could not shorten URL: {e}")
    return long_url  # Return original if shortening fails

def send_whatsapp_image(phone: str, image_path: str, caption: str = "") -> bool:
    """Send an image via WhatsApp Web"""
    global driver
    
    if not driver or not is_ready:
        safe_print("[ERROR] WhatsApp non connecte")
        return False
    
    try:
        # Format phone number
        formatted_phone = format_phone(phone)
        if len(formatted_phone) < 10:
            safe_print(f"[WARN] Numero invalide: {phone}")
            return False
        
        safe_print(f"[*] Envoi image a {formatted_phone}...")
        
        # Open chat with phone number
        url = f"https://web.whatsapp.com/send?phone={formatted_phone}"
        driver.get(url)
        time.sleep(5)
        
        # Find the attachment button
        attach_selectors = [
            'div[data-testid="conversation-clip"]',
            'span[data-testid="clip"]',
            'div[title="Attach"]',
            'div[title="Joindre"]',
            'button[aria-label="Joindre"]',
            'button[aria-label="Attach"]',
        ]
        
        attach_button = None
        for selector in attach_selectors:
            try:
                wait = WebDriverWait(driver, 10)
                attach_button = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                if attach_button:
                    safe_print(f"[*] Attach button found: {selector}")
                    break
            except:
                continue
        
        if not attach_button:
            safe_print("[WARN] Could not find attach button")
            return False
        
        attach_button.click()
        time.sleep(1)
        
        # Find the image/photo input
        image_input_selectors = [
            'input[accept="image/*,video/mp4,video/3gpp,video/quicktime"]',
            'input[type="file"][accept*="image"]',
        ]
        
        image_input = None
        for selector in image_input_selectors:
            try:
                image_input = driver.find_element(By.CSS_SELECTOR, selector)
                if image_input:
                    break
            except:
                continue
        
        if not image_input:
            safe_print("[WARN] Could not find image input")
            return False
        
        # Send the image path to the input
        image_input.send_keys(image_path)
        time.sleep(3)
        
        # If caption provided, type it
        if caption:
            caption_selectors = [
                'div[data-testid="media-caption-input-container"] div[contenteditable="true"]',
                'div.caption div[contenteditable="true"]',
            ]
            for selector in caption_selectors:
                try:
                    caption_input = driver.find_element(By.CSS_SELECTOR, selector)
                    if caption_input:
                        caption_input.send_keys(caption)
                        break
                except:
                    continue
        
        time.sleep(1)
        
        # Click send button
        send_selectors = [
            'span[data-testid="send"]',
            'div[data-testid="send"]',
            'button[aria-label="Envoyer"]',
            'button[aria-label="Send"]',
        ]
        
        for selector in send_selectors:
            try:
                send_btn = driver.find_element(By.CSS_SELECTOR, selector)
                if send_btn:
                    send_btn.click()
                    safe_print(f"[OK] Image envoyee a {formatted_phone}")
                    time.sleep(2)
                    return True
            except:
                continue
        
        safe_print("[WARN] Could not find send button for image")
        return False
        
    except Exception as e:
        safe_print(f"[ERROR] Erreur envoi image a {phone}: {e}")
        return False

def send_order_confirmation(order: dict):
    """Send order confirmation message with FULL ORDER DETAILS in French"""
    
    phone = order.get('customer_phone', '')
    if not phone:
        safe_print("[WARN] Pas de numero de telephone pour cette commande")
        return
    
    customer_name = order.get('customer_name', 'Client')
    order_number = order.get('order_number', 'N/A')
    total = order.get('total', 0)
    order_type = order.get('order_type', '')
    items = order.get('items', [])
    customer_address = order.get('customer_address', '')
    customer_notes = order.get('customer_notes', '')
    
    # Order type in French
    order_type_text = {
        'livraison': 'Livraison',
        'emporter': 'A emporter',
        'surplace': 'Sur place'
    }.get(order_type, order_type)
    
    # Build detailed items list
    items_text = ""
    if isinstance(items, list):
        for item in items:
            qty = item.get('quantity', 1)
            # Get product name from different possible structures
            name = item.get('name', '')
            if not name and item.get('item'):
                name = item['item'].get('name', 'Produit')
            if not name:
                name = 'Produit'
            
            price = item.get('totalPrice', item.get('price', 0))
            
            # Build item line
            items_text += f"\n  {qty}x {name}"
            if price:
                items_text += f" - {price:.2f} EUR"
            
            # Get customizations
            customization = item.get('customization', {})
            if customization:
                details = []
                
                # Check if this is a pizza
                item_category = (item.get('category', '') or item.get('item', {}).get('category', '') or '').lower()
                is_pizza = 'pizza' in item_category
                
                # Size (Taille) - MEGA in bold - ONLY FOR PIZZAS
                if is_pizza:
                    size = customization.get('size', '')
                    if size and size.lower() not in ['', 'none']:
                        if size.upper() == 'MEGA':
                            details.append(f"*MEGA*")
                        else:
                            details.append(f"{size.upper()}")
                
                # Base sauce removed - not needed
                
                # Meats (Viandes)
                meats = customization.get('meats', [])
                if isinstance(meats, list) and meats:
                    details.append(f"Viandes: {', '.join(meats)}")
                elif customization.get('meat'):
                    details.append(f"Viande: {customization.get('meat')}")
                
                # Sauces
                sauces = customization.get('sauces', [])
                if isinstance(sauces, list) and sauces:
                    details.append(f"Sauces: {', '.join(sauces)}")
                
                # Garnitures
                garnitures = customization.get('garnitures', [])
                if isinstance(garnitures, list) and garnitures:
                    details.append(f"Garnitures: {', '.join(garnitures)}")
                
                # Supplements
                supplements = customization.get('supplements', [])
                if isinstance(supplements, list) and supplements:
                    details.append(f"Supplements: {', '.join(supplements)}")
                
                # Cheese supplements
                cheese = customization.get('cheeseSupplements', [])
                if isinstance(cheese, list) and cheese:
                    details.append(f"Fromages: {', '.join(cheese)}")
                
                # Menu option
                menu = customization.get('menuOption', '')
                if menu and menu.lower() not in ['', 'none']:
                    details.append(f"Menu: {menu}")
                
                # Add details if any
                if details:
                    items_text += f"\n     ({' | '.join(details)})"
            
            # Item note
            note = item.get('note', '') or (customization.get('note', '') if customization else '')
            if note:
                items_text += f"\n     Note: {note}"
    
    # Build portal URL with phone number
    portal_url = f"https://twinpizza.fr/ticket?phone={phone.replace('+', '')}"
    
    # Build FULL message in French (no emojis for ChromeDriver compatibility)
    message = f"""*TWIN PIZZA*
================================

Bonjour {customer_name} !

Votre commande *{order_number}* est confirmee.

--------------------------------
*VOTRE COMMANDE :*
{items_text if items_text else '  (aucun article)'}

--------------------------------
*RECAPITULATIF :*
- Mode : *{order_type_text}*
- Total : *{total:.2f} EUR*
- Delai estime : *15 a 25 minutes*"""

    # Add address for delivery
    if order_type == 'livraison' and customer_address:
        message += f"\n- Adresse : {customer_address}"
    
    # Add customer notes if any
    if customer_notes:
        message += f"\n- Note : {customer_notes}"
    
    message += f"""

--------------------------------
Suivez votre commande :
{portal_url}

Merci pour votre confiance !
*TWIN PIZZA*"""
    
    # Send the message
    success = send_whatsapp_message(phone, message)
    if success:
        mark_whatsapp_sent(order.get('id'), get_api_headers())
        safe_print("[OK] Message complet envoye!")
    else:
        mark_whatsapp_attempt(order.get('id'), "Failed to send message", get_api_headers())
        safe_print("[WARN] Echec envoi message")

def send_ready_notification(order: dict):
    """Send order ready notification"""
    
    phone = order.get('customer_phone', '')
    if not phone:
        return
    
    customer_name = order.get('customer_name', 'Client')
    order_number = order.get('order_number', 'N/A')
    order_type = order.get('order_type', '')
    
    delivery_text = "Notre livreur arrive bientot !" if order_type == 'livraison' else "Venez la recuperer au restaurant !"
    
    message = f"""*==============================*
*      TWIN PIZZA*
*      Commande PRETE !*
*==============================*

Bonjour {customer_name} !

Votre commande *{order_number}* est *PRETE* !

{delivery_text}

A tres vite !"""
    
    success = send_whatsapp_message(phone, message)
    return success

# ===========================================
# ORDER PROCESSING STATUS TRACKING
# ===========================================

def get_api_headers():
    """Get Supabase API headers"""
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

def mark_whatsapp_sent(order_id: str, headers: dict = None):
    """Mark order as WhatsApp sent in database"""
    if not order_id:
        return
    
    if not headers:
        headers = get_api_headers()
    
    try:
        data = {
            "order_id": order_id,
            "whatsapp_sent": True,
            "whatsapp_attempts": 1,
            "last_whatsapp_attempt": datetime.now().isoformat()
        }
        
        response = httpx.post(
            f"{SUPABASE_URL}/rest/v1/order_processing_status",
            headers={**headers, "Prefer": "resolution=merge-duplicates"},
            json=data,
            timeout=10.0
        )
        
        if response.status_code not in [200, 201, 204]:
            safe_print(f"[WARN] Could not update WhatsApp status: {response.status_code}")
    except Exception as e:
        safe_print(f"[WARN] DB update error: {e}")

def mark_whatsapp_attempt(order_id: str, error_msg: str, headers: dict = None):
    """Mark failed WhatsApp attempt in database"""
    if not order_id:
        return
    
    if not headers:
        headers = get_api_headers()
    
    try:
        # Get current attempts
        attempts = 1
        try:
            response = httpx.get(
                f"{SUPABASE_URL}/rest/v1/order_processing_status",
                headers=headers,
                params={"select": "whatsapp_attempts", "order_id": f"eq.{order_id}"},
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    attempts = (data[0].get('whatsapp_attempts') or 0) + 1
        except:
            pass
        
        data = {
            "order_id": order_id,
            "whatsapp_sent": False,
            "whatsapp_attempts": attempts,
            "last_whatsapp_attempt": datetime.now().isoformat(),
            "whatsapp_error": error_msg
        }
        
        response = httpx.post(
            f"{SUPABASE_URL}/rest/v1/order_processing_status",
            headers={**headers, "Prefer": "resolution=merge-duplicates"},
            json=data,
            timeout=10.0
        )
    except Exception as e:
        safe_print(f"[WARN] DB update error: {e}")

def recover_missed_messages(headers: dict):
    """Recover and send all missed WhatsApp confirmations"""
    safe_print("\n" + "="*50)
    safe_print("[RECOVERY] VERIFICATION DES MESSAGES MANQUES...")
    safe_print("="*50)
    
    try:
        # Get orders from last 24 hours
        from datetime import timedelta
        twenty_four_hours_ago = (datetime.now() - timedelta(hours=24)).isoformat()
        
        # Fetch recent orders
        response = httpx.get(
            f"{SUPABASE_URL}/rest/v1/orders",
            headers=headers,
            params={
                "select": "id,order_number,customer_phone,customer_name,created_at",
                "created_at": f"gte.{twenty_four_hours_ago}",
                "order": "created_at.asc"
            },
            timeout=30.0
        )
        
        if response.status_code != 200:
            safe_print(f"[ERROR] Could not fetch recent orders: {response.status_code}")
            return 0, 0
        
        recent_orders = response.json()
        
        if not recent_orders:
            safe_print("[OK] Aucune commande recente a verifier")
            return 0, 0
        
        # Get processing status for these orders
        order_ids = [o['id'] for o in recent_orders]
        
        # Fetch WhatsApp status
        response = httpx.get(
            f"{SUPABASE_URL}/rest/v1/order_processing_status",
            headers=headers,
            params={
                "select": "order_id,whatsapp_sent",
                "order_id": f"in.({','.join(order_ids)})"
            },
            timeout=30.0
        )
        
        sent_map = {}
        if response.status_code == 200:
            for status in response.json():
                sent_map[status['order_id']] = status.get('whatsapp_sent', False)
        
        # Find missed orders (not sent)
        missed_orders = []
        for order in recent_orders:
            order_id = order['id']
            if not sent_map.get(order_id, False):
                # Check if order has phone number
                if order.get('customer_phone'):
                    missed_orders.append(order)
        
        if not missed_orders:
            safe_print("[OK] Tous les messages des 24h ont ete envoyes!")
            return 0, 0
        
        safe_print(f"\n[!] {len(missed_orders)} commande(s) sans confirmation WhatsApp!")
        safe_print("[*] Recuperation en cours...\n")
        
        recovered = 0
        failed = 0
        
        for missed in missed_orders:
            order_num = missed.get('order_number', 'N/A')
            phone = missed.get('customer_phone', '')
            customer = missed.get('customer_name', 'Client')
            
            safe_print(f"[RECOVERY] Envoi a {customer} (N{order_num})...")
            
            # Fetch full order
            try:
                response = httpx.get(
                    f"{SUPABASE_URL}/rest/v1/orders",
                    headers=headers,
                    params={"select": "*", "id": f"eq.{missed['id']}"},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    full_orders = response.json()
                    if full_orders:
                        send_order_confirmation(full_orders[0])
                        recovered += 1
                    else:
                        failed += 1
                else:
                    failed += 1
            except Exception as e:
                safe_print(f"[ERROR] {e}")
                failed += 1
            
            # Delay between messages to avoid rate limiting
            time.sleep(5)
        
        safe_print(f"\n[RECOVERY COMPLETE] {recovered} envoyes, {failed} echecs")
        safe_print("-" * 50 + "\n")
        
        return recovered, failed
        
    except Exception as e:
        safe_print(f"[ERROR] Recovery error: {e}")
        return 0, 0

# ===========================================
# SUPABASE REALTIME LISTENER
# ===========================================

def handle_insert(payload):
    """Handle new order inserted"""
    safe_print(f"\n[NEW ORDER] Nouvelle commande recue a {datetime.now().strftime('%H:%M:%S')}")
    order = payload.get('new', {}) if isinstance(payload, dict) else payload.record
    send_order_confirmation(order)

def handle_update(payload):
    """Handle order updated"""
    new_order = payload.get('new', {}) if isinstance(payload, dict) else payload.record
    old_order = payload.get('old', {}) if isinstance(payload, dict) else payload.old_record
    
    # Check if status changed to 'ready'
    if new_order.get('status') == 'ready' and old_order.get('status') != 'ready':
        safe_print(f"\n[READY] Commande prete ! a {datetime.now().strftime('%H:%M:%S')}")
        send_ready_notification(new_order)

def listen_for_orders():
    """Start listening for orders from Supabase using REST API"""
    
    safe_print("\n[*] Demarrage de l'ecoute des commandes...")
    
    # Supabase REST API headers
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    
    base_url = f"{SUPABASE_URL}/rest/v1/orders"
    
    try:
        safe_print("[*] Mode: Polling des nouvelles commandes (toutes les 10 secondes)")
        
        # Get the last order ID we've seen
        last_seen_id = None
        last_order_number = None
        
        # Create HTTP client
        client = httpx.Client(timeout=30.0)
        
        # Initial fetch to get the latest order
        safe_print("[*] Connexion a Supabase...")
        response = client.get(
            base_url,
            headers=headers,
            params={"select": "*", "order": "created_at.desc", "limit": "1"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data:
                last_seen_id = data[0].get('id')
                last_order_number = data[0].get('order_number')
                safe_print(f"[OK] Connecte a Supabase ! Derniere commande: N{last_order_number}")
            else:
                safe_print("[*] Aucune commande existante trouvee")
        else:
            safe_print(f"[ERROR] Erreur Supabase: {response.status_code} - {response.text}")
            return
        
        safe_print("\n[OK] Bot pret ! En attente de nouvelles commandes...\n")
        safe_print("-" * 50)
        
        # Show Windows notification that bot is ready
        show_notification("WhatsApp Bot ✅", "Bot connecte et pret! En attente de commandes...")
        
        # RECOVERY: Send missed messages
        safe_print("\n[*] Verification des messages manques...")
        recovered, failed = recover_missed_messages(headers)
        if recovered > 0:
            show_notification("WhatsApp Bot Recovery", f"{recovered} message(s) de recuperation envoye(s)!")
        
        poll_count = 0
        while True:
            try:
                poll_count += 1
                
                # Check for new orders
                response = client.get(
                    base_url,
                    headers=headers,
                    params={"select": "*", "order": "created_at.desc", "limit": "5"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        # Check the most recent order
                        latest = data[0]
                        latest_id = latest.get('id')
                        
                        if latest_id != last_seen_id:
                            order_num = latest.get('order_number')
                            customer = latest.get('customer_name', 'Client')
                            phone = latest.get('customer_phone', 'N/A')
                            
                            safe_print(f"\n{'='*50}")
                            safe_print(f"[NEW ORDER] NOUVELLE COMMANDE DETECTEE !")
                            safe_print(f"   Numero: N{order_num}")
                            safe_print(f"   Client: {customer}")
                            safe_print(f"   Tel: {phone}")
                            safe_print(f"{'='*50}")
                            
                            send_order_confirmation(latest)
                            last_seen_id = latest_id
                            last_order_number = order_num
                else:
                    safe_print(f"[WARN] Erreur API: {response.status_code}")
                
                # Show status every ~30 seconds (3 polls)
                if poll_count % 3 == 0:
                    now = datetime.now().strftime('%H:%M:%S')
                    safe_print(f"[{now}] Bot actif - derniere commande connue: N{last_order_number}")
                
                # Wait before next poll
                time.sleep(10)
                
            except KeyboardInterrupt:
                raise
            except Exception as e:
                safe_print(f"[WARN] Erreur de polling: {e}")
                import traceback
                safe_print(traceback.format_exc())
                time.sleep(5)
                
    except KeyboardInterrupt:
        safe_print("\n\n[*] Arret du bot...")
    except Exception as e:
        safe_print(f"[ERROR] Erreur Supabase: {e}")

# ===========================================
# MAIN
# ===========================================

def main():
    """Main entry point"""
    global driver
    
    print_banner()
    
    try:
        # Initialize WhatsApp
        if not init_whatsapp():
            safe_print("[ERROR] Impossible d'initialiser WhatsApp. Arret.")
            show_notification("WhatsApp Bot ❌", "Erreur: Impossible d'initialiser WhatsApp!", is_error=True)
            return
        
        # Start listening for orders
        listen_for_orders()
        
    except KeyboardInterrupt:
        safe_print("\n\n[*] Arret du bot...")
    finally:
        if driver:
            safe_print("[*] Fermeture du navigateur...")
            driver.quit()
        safe_print("[*] Au revoir !")

if __name__ == "__main__":
    main()
