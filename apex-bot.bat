@echo off
echo Starting WhatsApp Print Bot...
cd /d "C:\Users\Abdulhakeem\whatsapp-print-bot"

:: Clean up old processes
echo Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1
del ngrok_url.txt 2>nul
del ngrok_error.txt 2>nul
del server.log 2>nul
del ngrok.log 2>nul

:: Verify Node.js
echo Checking Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js from https://nodejs.org.
    pause
    exit /b 1
)

:: Verify dependencies
echo Checking dependencies...
if not exist node_modules (
    echo Installing dependencies...
    npm install express whatsapp-web.js axios dotenv qrcode ngrok
)

:: Run ngrok setup
echo Starting ngrok...
start /min cmd /c "node get-ngrok-url.js > ngrok.log 2>&1"

:: Wait for ngrok
timeout /t 7 >nul

:: Check ngrok URL
if not exist ngrok_url.txt (
    echo ERROR: ngrok failed to generate URL. Check ngrok.log.
    type ngrok.log
    pause
    exit /b 1
)
set /p NGROK_URL=<ngrok_url.txt
if not defined NGROK_URL (
    echo ERROR: ngrok URL is empty. Check ngrok.log.
    type ngrok.log
    pause
    exit /b 1
)
echo ngrok URL: %NGROK_URL%

:: Start server.js
echo Starting server...
start cmd /k "node server.js > server.log 2>&1"

:: Wait for server
timeout /t 5 >nul

:: Check port 3000
netstat -a -n -o | find "3000" >nul
if errorlevel 1 (
    echo ERROR: Server not running on port 3000. Check server.log.
    type server.log
    pause
    exit /b 1
)

:: Open browser
start http://localhost:3000

echo Bot started successfully! Check your browser.
echo CALLBACK_URL updated dynamically in .env
pause