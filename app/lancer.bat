@echo off
rem Lance JDR Global en local : petit serveur sur http://localhost:8417 puis ouverture du navigateur.
rem Ne pas changer le port : les campagnes sont rangees dans le navigateur pour cette adresse precise.
cd /d "%~dp0"
if not exist "dist\index.html" (
  echo Le dossier dist est absent. Lance d'abord : npm run build
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serveur.ps1" -Port 8417 -Dossier "%~dp0dist"
