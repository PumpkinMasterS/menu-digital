@echo off
echo Iniciando todos os servidores do Menu Digital...
echo.

echo [1/5] Iniciando backend (API)...
cd /d "%~dp0backend"
start "Backend Server" cmd /k "npm run dev"

echo.
echo Backend iniciado. Aguarde 3 segundos...
timeout /t 3 /nobreak > nul

echo.
echo [2/5] Iniciando frontend principal (Menu Digital)...
cd /d "%~dp0frontend"
start "Frontend Principal" cmd /k "npm run dev-safe"

echo.
echo Frontend principal iniciado. Aguarde 3 segundos...
timeout /t 3 /nobreak > nul

echo.
echo [3/5] Iniciando Menu (apps/menu)...
cd /d "%~dp0apps\menu"
start "Menu App" cmd /k "npm run dev"

echo.
echo Menu iniciado. Aguarde 3 segundos...
timeout /t 3 /nobreak > nul

echo.
echo [4/5] Iniciando Cozinha (apps/kitchen)...
cd /d "%~dp0apps\kitchen"
start "Kitchen App" cmd /k "npm run dev"

echo.
echo Cozinha iniciada. Aguarde 3 segundos...
timeout /t 3 /nobreak > nul

echo.
echo [5/5] Iniciando Admin (apps/admin)...
cd /d "%~dp0apps\admin"
start "Admin App" cmd /k "npm run dev"

echo.
echo ====================================
echo Todos os servidores foram iniciados!
echo ====================================
echo.
echo URLs de Acesso:
echo - Backend (API):      http://localhost:3000
echo - Frontend Principal: http://localhost:5173
echo - Menu App:           http://localhost:5175
echo - Cozinha App:        http://localhost:5176
echo - Admin App:          http://localhost:5177
echo.
echo Use Ctrl+C nas janelas dos servidores para parar quando terminar.
echo.
pause
