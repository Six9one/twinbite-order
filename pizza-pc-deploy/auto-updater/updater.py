#!/usr/bin/env python3
"""
Twin Pizza Auto-Updater
Checks GitHub for updates and applies them automatically
Runs via Windows Task Scheduler every 6 hours
"""

import os
import sys
import subprocess
import time
from datetime import datetime
from pathlib import Path

# Configuration
INSTALL_DIR = Path("C:/TwinPizza")
LOG_FILE = INSTALL_DIR / "logs" / "auto-updater.log"

def log(message):
    """Write to log file"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {message}"
    print(log_line)
    
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(log_line + "\n")
    except Exception as e:
        print(f"Could not write to log: {e}")

def get_repo_path():
    """Get the GitHub repository path from config file"""
    config_file = INSTALL_DIR / "github_repo_path.txt"
    if not config_file.exists():
        log("ERROR: github_repo_path.txt not found")
        return None
    
    with open(config_file, "r") as f:
        return f.read().strip()

def check_for_updates(repo_path):
    """Check if there are new commits on GitHub"""
    try:
        os.chdir(repo_path)
        
        # Fetch latest from origin
        result = subprocess.run(
            ["git", "fetch", "origin"],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            log(f"git fetch failed: {result.stderr}")
            return False
        
        # Compare local HEAD with origin
        result = subprocess.run(
            ["git", "rev-list", "HEAD...origin/main", "--count"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            # Try 'master' branch if 'main' doesn't exist
            result = subprocess.run(
                ["git", "rev-list", "HEAD...origin/master", "--count"],
                capture_output=True,
                text=True,
                timeout=30
            )
        
        if result.returncode == 0:
            behind_count = int(result.stdout.strip() or "0")
            if behind_count > 0:
                log(f"Found {behind_count} new commits")
                return True
        
        return False
        
    except subprocess.TimeoutExpired:
        log("ERROR: Git command timed out")
        return False
    except Exception as e:
        log(f"ERROR checking for updates: {e}")
        return False

def stop_services():
    """Stop running Twin Pizza services"""
    log("Stopping services...")
    try:
        # Kill Python (WhatsApp bot)
        subprocess.run(
            ["taskkill", "/F", "/IM", "python.exe", "/FI", "WINDOWTITLE eq Twin Pizza*"],
            capture_output=True,
            timeout=10
        )
        # Kill Node (Print server)
        subprocess.run(
            ["taskkill", "/F", "/IM", "node.exe", "/FI", "WINDOWTITLE eq Twin Pizza*"],
            capture_output=True,
            timeout=10
        )
        time.sleep(2)
    except Exception as e:
        log(f"Warning stopping services: {e}")

def pull_updates(repo_path):
    """Pull latest code from GitHub"""
    try:
        os.chdir(repo_path)
        result = subprocess.run(
            ["git", "pull"],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            log("Git pull successful")
            return True
        else:
            log(f"Git pull failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        log("ERROR: Git pull timed out")
        return False
    except Exception as e:
        log(f"ERROR pulling updates: {e}")
        return False

def copy_updated_files(repo_path):
    """Copy updated files to installation directory"""
    import shutil
    
    repo = Path(repo_path)
    
    try:
        # Update WhatsApp bot
        whatsapp_src = repo / "whatsapp-bot-python"
        whatsapp_dst = INSTALL_DIR / "whatsapp-bot"
        
        for file in ["bot.py", "config.py", "requirements.txt"]:
            src = whatsapp_src / file
            if src.exists():
                shutil.copy2(src, whatsapp_dst / file)
                log(f"Updated: whatsapp-bot/{file}")
        
        # Update print server
        printer_src = repo / "print-server"
        printer_dst = INSTALL_DIR / "print-server"
        
        for file in ["server.js", "package.json"]:
            src = printer_src / file
            if src.exists():
                shutil.copy2(src, printer_dst / file)
                log(f"Updated: print-server/{file}")
        
        # Update scripts
        scripts_src = repo / "pizza-pc-deploy" / "scripts"
        scripts_dst = INSTALL_DIR / "scripts"
        
        if scripts_src.exists():
            for file in scripts_src.iterdir():
                if file.is_file():
                    shutil.copy2(file, scripts_dst / file.name)
        
        # Update main files
        deploy_src = repo / "pizza-pc-deploy"
        if (deploy_src / "START_ALL.vbs").exists():
            shutil.copy2(deploy_src / "START_ALL.vbs", INSTALL_DIR / "START_ALL.vbs")
        
        # Update auto-updater itself
        updater_src = deploy_src / "auto-updater"
        updater_dst = INSTALL_DIR / "auto-updater"
        if updater_src.exists():
            for file in updater_src.iterdir():
                if file.is_file():
                    shutil.copy2(file, updater_dst / file.name)
        
        log("All files updated successfully")
        return True
        
    except Exception as e:
        log(f"ERROR copying files: {e}")
        return False

def start_services():
    """Start Twin Pizza services"""
    log("Starting services...")
    try:
        vbs_path = INSTALL_DIR / "START_ALL.vbs"
        subprocess.Popen(
            ["wscript.exe", str(vbs_path)],
            creationflags=subprocess.DETACHED_PROCESS
        )
        log("Services started")
    except Exception as e:
        log(f"ERROR starting services: {e}")

def main():
    """Main entry point"""
    log("=" * 50)
    log("Twin Pizza Auto-Updater starting...")
    
    # Get repo path
    repo_path = get_repo_path()
    if not repo_path:
        log("Cannot proceed without repo path")
        return
    
    log(f"Repo path: {repo_path}")
    
    # Check for updates
    if not check_for_updates(repo_path):
        log("No updates found. Exiting.")
        return
    
    # Updates found - apply them
    log("Updates found! Applying...")
    
    # Stop services
    stop_services()
    
    # Pull updates
    if not pull_updates(repo_path):
        log("Failed to pull updates. Restarting services...")
        start_services()
        return
    
    # Copy files
    if not copy_updated_files(repo_path):
        log("Failed to copy files. Restarting services...")
        start_services()
        return
    
    # Restart services
    start_services()
    
    log("Update completed successfully!")
    log("=" * 50)

if __name__ == "__main__":
    main()
