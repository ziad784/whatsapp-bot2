@echo off
echo Restarting WhatsApp Print Bot...
cd /d "C:\Users\Abdulhakeem\whatsapp-print-bot"

:: Kill processes
echo Terminating processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1

:: Clean up logs
echo Cleaning up logs...
del server.log 2>nul
del ngrok.log 2>nul
del ngrok_url.txt 2>nul
del ngrok_error.txt 2>nul

:: Start bot
echo Starting bot...
start apex-bot.bat

echo Restart complete!
pause