/* Atlas des ciels imaginaires — Outils communs : constantes, hasard déterministe, géométrie
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
const deg = Math.PI/180, TAU = Math.PI*2;
const $ = id => document.getElementById(id);

/* ---------- aléatoire déterministe ---------- */
function hashStr(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^h>>>16)>>>0}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const gauss = r => {let u=0;while(u===0)u=r();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*r())};
const pick = (r,a) => a[Math.floor(r()*a.length)];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm = a => {const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l]};
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
const wrapPi = a => {a=(a+Math.PI)%TAU; if(a<0)a+=TAU; return a-Math.PI};
const lonOf = d => Math.atan2(d[0], d[2]);
const latOf = d => Math.asin(clamp(d[1],-1,1));
const dirOf = (lon,lat) => [Math.cos(lat)*Math.sin(lon), Math.sin(lat), Math.cos(lat)*Math.cos(lon)];
const fr = (v,d=1) => Number(v).toLocaleString('fr-FR',{maximumFractionDigits:d});
const rngFor = key => mulberry32(hashStr(P.seed+'|'+key));
function shuffle(r,a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
let UID=1; const uid = () => 'o'+(UID++);
