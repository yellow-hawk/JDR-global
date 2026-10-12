@echo off
rem Lance JDR Global en local : petit serveur sur http://localhost:8417 puis ouverture du navigateur.
rem Le port reste le meme d'un lancement a l'autre : les campagnes sont rangees dans le navigateur pour cette adresse precise.
rem Avec Node.js installe, le serveur relaie aussi l'ecran joueurs vers les tablettes du meme reseau.
cd /d "%~dp0"
chcp 65001 >nul
if not exist "dist\index.html" (
  echo Le dossier dist est absent. Lance d'abord : npm run build
  pause
  exit /b 1
)
rem Le serveur Node choisit le port : 8417, ou un autre si un programme comme Steam l'occupe, et il le retient.
where node >nul 2>nul
if %errorlevel%==0 (
  node "%~dp0serveur.mjs"
  if errorlevel 1 pause
) else (
  echo Node.js n'est pas installe : serveur simple, sans tablettes. https://nodejs.org pour les activer.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serveur.ps1" -Port 8417 -Dossier "%~dp0dist"
)
