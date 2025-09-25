@echo off
REM Script d'instal·lació per PalamMaster (Windows)

echo ===================================
echo   PalamMaster - Script d'instal·lacio
echo ===================================

REM Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js no esta instal·lat
    echo    Instal·la Node.js des de https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm no esta disponible
    pause
    exit /b 1
)

echo ✅ Node.js i npm detectats correctament
echo.

REM Instal·lar dependències
echo 📦 Instal·lant dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Error instal·lant dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies instal·lades correctament
echo.

REM Preguntar si vol compilar
set /p compile="Vols compilar l'aplicacio per distribucio? (s/N): "

if /i "%compile%"=="s" (
    echo 🏗️  Compilant aplicacio...
    npm run build
    
    if %errorlevel% equ 0 (
        echo ✅ Aplicacio compilada correctament
        echo 📁 Els fitxers compilats es troben a la carpeta 'dist/'
    ) else (
        echo ❌ Error compilant l'aplicacio
    )
) else (
    echo ℹ️  Pots compilar l'aplicacio mes tard amb: npm run build
)

echo.
echo 🎉 Instal·lacio completada!
echo.
echo Per executar l'aplicacio:
echo   - Mode desenvolupament: npm start
echo   - Mode produccio: npm run build
echo.
echo Per mes informacio, consulta el fitxer README.md
echo.
pause