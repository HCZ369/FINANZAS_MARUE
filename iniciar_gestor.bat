@echo off
cd /d "C:\Users\Hugo\Documents\01 - Administrador de inversiones Marue\FINANZAS_MARUE"

start "Waitress" cmd /k "venv\Scripts\python.exe run_server.py"
timeout /t 5 >nul
start "Tunnel" cmd /k "C:\cloudflared\cloudflared.exe tunnel --url http://localhost:8000"
timeout /t 15 >nul
start "AutoDeploy" cmd /k "venv\Scripts\python.exe auto_deploy.py"
