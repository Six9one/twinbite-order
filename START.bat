@echo off
title Twin Pizza - SYSTEME TOUT-EN-UN
color 0B
set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo.
echo ================================================================
23: echo       TWIN PIZZA - SYSTEME DE CONTROLE CENTRAL
24: echo       Version 2.0 (Premium Dash & Remote)
25: echo ================================================================
26: echo.
27: 
28: REM ========== 1. Update from git ==========
29: echo [1/3] Verification des mises a jour...
30: git stash -q 2>nul
31: git pull origin main -q 2>nul
32: echo       Code a jour!
33: echo.
34: 
35: REM ========== 2. Setup Dependencies ==========
36: echo [2/3] Verification des composants...
37: 
38: REM WhatsApp
39: cd /d "%PROJECT_DIR%whatsapp-bot-python"
40: if not exist "venv\Scripts\python.exe" (
41:     echo       Initialisation Python...
42:     python -m venv venv
43:     venv\Scripts\pip install -r requirements.txt -q
44: )
45: 
46: REM Printer & Bridge
47: cd /d "%PROJECT_DIR%print-server"
48: if not exist "node_modules" (
49:     echo       Installation packages Node.js...
50:     call npm install -q
51: )
52: 
53: REM Ensure .env exists (copy from print-server.env if needed)
54: if not exist ".env" (
55:     if exist "print-server.env" (
56:         copy print-server.env .env >nul
57:     ) else (
58:         echo [!] ATTENTION: Fichier .env manquant dans print-server.
59:     )
60: )
61: 
62: echo       Composants OK!
63: echo.
64: 
65: REM ========== 3. Start Unified Bridge ==========
66: echo [3/3] Lancement du Controleur Central...
67: echo.
68: echo ----------------------------------------------------------------
69: echo   TIPS: 
70: echo   - Laissez cette fenetre ouverte pour le controle a distance.
71: echo   - Vous pouvez maintenant piloter le PC depuis votre ADMIN DASH!
72: echo ----------------------------------------------------------------
73: echo.
74: 
75: cd /d "%PROJECT_DIR%print-server"
76: node dashboard.js
77: 
78: pause
