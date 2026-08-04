@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

title Twin Pizza - Build et Push

echo.
echo  ================================================
echo    TWIN PIZZA - VERIFICATION + ENVOI SUR GITHUB
echo  ================================================
echo.

REM ---------- 1. BUILD ----------
echo  [1/4] Verification du code (npm run build)...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo  ================================================
    echo    X  LE BUILD A ECHOUE - RIEN N'A ETE ENVOYE
    echo  ================================================
    echo.
    echo  Copie l'erreur ci-dessus et envoie-la a Claude.
    echo.
    pause
    exit /b 1
)

echo.
echo  [OK] Build reussi.
echo.

REM ---------- 2. Y A-T-IL QUELQUE CHOSE A ENVOYER ? ----------
echo  [2/4] Recherche des modifications...
git diff --quiet && git diff --cached --quiet
if not errorlevel 1 (
    git status --porcelain | findstr /r "." >nul
    if errorlevel 1 (
        echo.
        echo  [i] Aucune modification a envoyer. Tout est deja a jour.
        echo.
        pause
        exit /b 0
    )
)

git status --short
echo.

REM ---------- 3. COMMIT ----------
echo  [3/4] Enregistrement des modifications...
set "MSG=%~1"
if "%MSG%"=="" set /p MSG=  Message du commit (Entree = message auto) :
if "%MSG%"=="" set "MSG=maj du site"

git add -A
git commit -m "%MSG%"
if errorlevel 1 (
    echo.
    echo  [X] Le commit a echoue.
    pause
    exit /b 1
)

REM ---------- 4. PUSH ----------
echo.
echo  [4/4] Envoi sur GitHub...
git push
if errorlevel 1 (
    echo.
    echo  ================================================
    echo    X  L'ENVOI A ECHOUE
    echo  ================================================
    echo.
    echo  Causes frequentes :
    echo    - pas de connexion internet
    echo    - identifiants GitHub expires
    echo    - quelqu'un a pousse avant toi : fais "git pull" puis relance
    echo.
    pause
    exit /b 1
)

echo.
echo  ================================================
echo    OK  BUILD + ENVOI TERMINES
echo  ================================================
echo.
echo  Vercel va redeployer le site automatiquement.
echo.
timeout /t 6 >nul
