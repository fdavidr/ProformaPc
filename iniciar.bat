@echo off
title Sistema de Cotizaciones y Ventas
echo ==========================================
echo   Sistema de Cotizaciones y Ventas
echo   Modo PC Local
echo ==========================================
echo.

:: Verificar que Node.js este instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado.
    echo.
    echo Por favor descargue e instale Node.js desde:
    echo    https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Ir al directorio del script (por si se ejecuta desde otro lugar)
cd /d "%~dp0"

:: Instalar dependencias si node_modules no existe
if not exist "node_modules\" (
    echo Instalando dependencias por primera vez...
    npm install
    echo.
)

:: Abrir el navegador con un pequeno retraso para que el servidor arranque
echo Iniciando servidor...
ping 127.0.0.1 -n 3 >nul
start "" "http://localhost:3000"

:: Iniciar el servidor (se mantiene en esta ventana)
node server.js

pause
