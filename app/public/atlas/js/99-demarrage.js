/* Atlas des ciels imaginaires — Démarrage (toujours chargé en dernier)
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ---------- démarrage ---------- */
buildControls(); resize(); syncUI(); regen(); updatePlay(); updateModeUI(); syncTime();
if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ dirty=true; });
requestAnimationFrame(loop);
