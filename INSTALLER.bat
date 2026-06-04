@echo off
setlocal EnableDelayedExpansion
title TwinPizza Hub - Installation
color 0A
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║           🍕  TWINPIZZA HUB  -  INSTALLATION               ║
echo  ║         Premier demarrage sur ce PC de restaurant           ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Ce script va installer et configurer tout automatiquement.
echo  Duree estimee : 5 a 10 minutes selon la connexion internet.
echo.
pause

:: ═══════════════════════════════════════════════════════
:: ETAPE 1 — Verifier / Installer Git
:: ═══════════════════════════════════════════════════════
echo.
echo  [1/7] Verification de Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo  ⚠️  Git n'est pas installe. Installation automatique...
    winget install --id Git.Git --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
        echo  ❌ Impossible d'installer Git automatiquement.
        echo     Telechargez-le sur : https://git-scm.com/download/win
        echo     Puis relancez ce script.
        pause
        exit /b 1
    )
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
    git --version >nul 2>&1
    if errorlevel 1 (
        echo  ✅ Git installe. Fermez et relancez ce script pour continuer.
        pause
        exit /b 0
    )
)
for /f "tokens=*" %%v in ('git --version') do set GIT_VER=%%v
echo  ✅ !GIT_VER! detecte.

:: ═══════════════════════════════════════════════════════
:: ETAPE 2 — Verifier / Installer Node.js
:: ═══════════════════════════════════════════════════════
echo.
echo  [2/7] Verification de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo  ⚠️  Node.js n'est pas installe. Installation automatique...
    winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
        echo  ❌ Impossible d'installer Node.js automatiquement.
        echo     Telechargez-le sur : https://nodejs.org  (version LTS)
        echo     Puis relancez ce script.
        pause
        exit /b 1
    )
    set "PATH=%PATH%;C:\Program Files\nodejs"
    node --version >nul 2>&1
    if errorlevel 1 (
        echo  ✅ Node.js installe. Fermez et relancez ce script pour continuer.
        pause
        exit /b 0
    )
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  ✅ Node.js !NODE_VER! detecte.

:: ═══════════════════════════════════════════════════════
:: ETAPE 3 — Cloner ou mettre a jour le depot Git
:: ═══════════════════════════════════════════════════════
echo.
echo  [3/7] Synchronisation du code source (Git)...

:: Check if we're already inside a git repo (ran from cloned folder)
git rev-parse --is-inside-work-tree >nul 2>&1
if not errorlevel 1 (
    echo  ✅ Depot Git deja present. Mise a jour...
    git pull
    if errorlevel 1 (
        echo  ⚠️  git pull a echoue (conflit local ?). On continue avec la version actuelle.
    ) else (
        echo  ✅ Code mis a jour.
    )
    goto :install_deps
)

:: Not in a git repo — ask for repo URL or use default
echo.
echo  Ce dossier n'est pas un depot Git.
echo  Pour cloner automatiquement, entrez l'URL de votre depot GitHub.
echo  (Appuyez sur Entree pour utiliser l'URL par defaut)
echo.
set DEFAULT_REPO=https://github.com/votre-compte/twinbite-order.git
set /p REPO_URL="  URL du depot GitHub [!DEFAULT_REPO!] : "
if "!REPO_URL!"=="" set REPO_URL=!DEFAULT_REPO!

echo.
echo  Clonage de : !REPO_URL!
cd /d "%USERPROFILE%"
git clone "!REPO_URL!" twinbite-order
if errorlevel 1 (
    echo  ❌ Erreur lors du clonage. Verifiez l'URL et la connexion internet.
    pause
    exit /b 1
)
cd /d "%USERPROFILE%\twinbite-order"
echo  ✅ Depot clone dans : %USERPROFILE%\twinbite-order

:: Re-run this script from the new location
echo.
echo  Relancement de l'installation depuis le nouveau dossier...
start "" "%USERPROFILE%\twinbite-order\INSTALLER.bat"
exit /b 0

:install_deps

:: ═══════════════════════════════════════════════════════
:: ETAPE 4 — Creer le fichier .env si absent
:: ═══════════════════════════════════════════════════════
echo.
echo  [4/7] Verification du fichier de configuration (.env)...
if not exist "%~dp0.env" (
    echo  ⚠️  Fichier .env absent.
    if exist "%~dp0.env.example" (
        copy "%~dp0.env.example" "%~dp0.env" >nul
        echo  ✅ .env cree depuis .env.example
        echo.
        echo  ┌─────────────────────────────────────────────────────┐
        echo  │  IMPORTANT : Editez le fichier .env pour renseigner │
        echo  │  vos cles Supabase et l'IP de l'imprimante.         │
        echo  │  Fichier : %~dp0.env
        echo  └─────────────────────────────────────────────────────┘
        echo.
        pause
    ) else (
        echo  ⚠️  Pas de .env ni de .env.example trouve.
        echo     L'application pourrait ne pas fonctionner sans configuration.
    )
) else (
    echo  ✅ Fichier .env present.
)

:: ═══════════════════════════════════════════════════════
:: ETAPE 5 — npm install (app web + hub + print-server)
:: ═══════════════════════════════════════════════════════
echo.
echo  [5/7] Installation des packages (npm install)...
echo       Packages application web...
call npm install
if errorlevel 1 ( echo  ❌ Erreur npm install (app web). & pause & exit /b 1 )

echo       Packages TwinPizza Hub (Electron)...
cd /d "%~dp0twinpizzahub"
call npm install
if errorlevel 1 ( echo  ❌ Erreur npm install (twinpizzahub). & pause & exit /b 1 )
cd /d "%~dp0"

if exist "%~dp0print-server\package.json" (
    echo       Packages serveur d'impression...
    cd /d "%~dp0print-server"
    call npm install
    cd /d "%~dp0"
)
echo  ✅ Tous les packages installes.

:: ═══════════════════════════════════════════════════════
:: ETAPE 6 — Build de l'application
:: ═══════════════════════════════════════════════════════
echo.
echo  [6/7] Construction de l'application (npm run build)...
echo       (2-4 minutes)
call npm run build
if errorlevel 1 ( echo  ❌ Erreur lors du build. & pause & exit /b 1 )
if not exist "%~dp0dist\index.html" ( echo  ❌ dist/index.html absent. & pause & exit /b 1 )
echo  ✅ Application construite.

:: ═══════════════════════════════════════════════════════
:: ETAPE 7 — Raccourci bureau
:: ═══════════════════════════════════════════════════════
echo.
echo  [7/7] Creation du raccourci bureau...
set DESKTOP=%USERPROFILE%\Desktop
set SHORTCUT_TARGET=%~dp0LANCER_TWINPIZZA.bat

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $s = $ws.CreateShortcut('%DESKTOP%\TwinPizza Hub.lnk'); ^
   $s.TargetPath = '%SHORTCUT_TARGET%'; ^
   $s.WorkingDirectory = '%~dp0'; ^
   $s.Description = 'Lancer TwinPizza Hub'; ^
   $s.Save()"

if exist "%DESKTOP%\TwinPizza Hub.lnk" (
    echo  ✅ Raccourci cree sur le bureau.
) else (
    echo  ⚠️  Raccourci non cree (utilisez LANCER_TWINPIZZA.bat directement).
)

:: ═══════════════════════════════════════════════════════
:: TERMINE
:: ═══════════════════════════════════════════════════════
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║  ✅  INSTALLATION TERMINEE AVEC SUCCES !                   ║
echo  ║                                                              ║
echo  ║  Chaque jour :                                              ║
echo  ║    → Double-clic sur "TwinPizza Hub" sur le bureau          ║
echo  ║                                                              ║
echo  ║  Apres une mise a jour du code :                            ║
echo  ║    → Lancez METTRE_A_JOUR.bat                               ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

set /p LAUNCH="  Lancer TwinPizza Hub maintenant ? (O/N) : "
if /i "!LAUNCH!"=="O" start "" "%~dp0LANCER_TWINPIZZA.bat"
exit /b 0
