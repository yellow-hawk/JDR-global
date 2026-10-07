/* Atlas des ciels imaginaires — Images et fiches du système stellaire
   Dessine hors écran les vues du visualiseur de systèmes (vue inclinée, vue de dessus, planète et ses lunes)
   pour le carnet de campagne et l'export complet, et rassemble toutes les informations du système.
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";

// Le système à décrire : celui du monde de jeu, ou le vrai système solaire en mode Terre.
function mainSystem(){ return sky.earth ? realSolarSystem() : homeSystem(); }

// Rend une scène du visualiseur (kind 'system' ou 'body') dans une nouvelle image.
// o : {w, h, scale, tilt, rot, zoom, title, sub, footer}
function renderSysScene(kind, data, o={}){
  const LW=o.w||1200, LH=o.h||675, scale=o.scale||8/3;
  const can=document.createElement('canvas'); can.width=Math.round(LW*scale); can.height=Math.round(LH*scale);
  const g=can.getContext('2d'); g.setTransform(scale,0,0,scale,0,0);
  const keep={ctx:vctx, W:V.W, H:V.H, t:V.t, rot:V.rot, tilt:V.tilt, zoom:V.zoom, sel:V.sel, hits:V.hits};
  vctx=g; Object.assign(V,{W:LW, H:LH, t:o.t||0, rot:o.rot||0, tilt:o.tilt??62*deg, zoom:o.zoom||1, sel:null, hits:[]});
  try{
    g.fillStyle='#02040b'; g.fillRect(0,0,LW,LH);
    const r=mulberry32(hashStr(data.name||'sys')), n=Math.round(LW*LH/1800);
    for(let i=0;i<n;i++){ g.fillStyle=`rgba(220,225,240,${(r()*.6+.2)*.6})`; const s=r()*.9+.3; g.fillRect(r()*LW, r()*LH, s, s); }
    if(kind==='system') drawSystem(data); else drawBody(data);
    g.textAlign='left'; g.textBaseline='alphabetic'; g.globalAlpha=1;
    if(o.title){ g.fillStyle='#f4ead0'; g.font=`italic 500 40px ${SERIF}`; g.fillText(o.title, 26, 56);
      if(o.sub){ g.fillStyle='rgba(210,215,235,.85)'; g.font='15px Figtree, system-ui, sans-serif'; g.fillText(o.sub, 28, 80); } }
    if(o.footer){ g.font='13px Figtree, system-ui, sans-serif'; const lines=xpWrapSys(g, o.footer, LW-56).slice(0,3);
      const bh=lines.length*19+20; const gr=g.createLinearGradient(0,LH-bh-30,0,LH); gr.addColorStop(0,'rgba(2,4,11,0)'); gr.addColorStop(.4,'rgba(2,4,11,.85)'); gr.addColorStop(1,'rgba(2,4,11,.95)');
      g.fillStyle=gr; g.fillRect(0,LH-bh-30,LW,bh+30); g.fillStyle='rgba(225,228,240,.92)'; lines.forEach((l,i)=>g.fillText(l, 28, LH-bh+14+i*19)); }
    if(o.title){ g.strokeStyle='rgba(216,181,106,.45)'; g.lineWidth=1; g.strokeRect(8,8,LW-16,LH-16); }
  } finally {
    vctx=keep.ctx; Object.assign(V,{W:keep.W, H:keep.H, t:keep.t, rot:keep.rot, tilt:keep.tilt, zoom:keep.zoom, sel:keep.sel, hits:keep.hits});
  }
  return can;
}
function xpWrapSys(g, text, maxW){
  const words=String(text||'').split(/\s+/), lines=[]; let cur='';
  for(const w of words){ const t=cur?cur+' '+w:w; if(g.measureText(t).width>maxW && cur){ lines.push(cur); cur=w; } else cur=t; }
  if(cur) lines.push(cur); return lines;
}
const factsLine = o => factsOf(o).map(([k,v])=>`${k} : ${v}`).join(' · ');
function renderSystemView(sys, o={}){ return renderSysScene('system', sys, o); }
function renderBodyView(p, o={}){ return renderSysScene('body', p, {tilt:72*deg, ...o}); }

// Tous les objets du système, dans l'ordre du visualiseur.
function systemObjects(sys){ return [sys.star, ...sys.planets, ...sys.belts, ...sys.dwarfs, ...sys.comets, ...(sys.companion?[sys.companion]:[])]; }
function systemSummaryRows(sys){
  const p=sys.star.phys, rows=[['Étoile', `${sys.star.name}, ${p.kind}`], ['Luminosité', fr(p.lum, p.lum<1?3:p.lum<10?1:0)+' × Soleil'], ['Température', fr(p.temp,0)+' K']];
  rows.push(['Planètes', sys.planets.length ? sys.planets.map(q=>q.name+(q.isHome?' (votre monde)':'')).join(', ') : 'aucune']);
  if(sys.belts.length) rows.push(['Ceintures', sys.belts.map(b=>b.name).join(', ')]);
  if(sys.dwarfs.length) rows.push(['Planètes naines', sys.dwarfs.map(d=>d.name).join(', ')]);
  if(sys.comets.length) rows.push(['Comètes', sys.comets.map(c=>c.name).join(', ')]);
  if(sys.companion) rows.push(['Étoile compagne', sys.companion.name]);
  const nm=sys.planets.reduce((s,q)=>s+(q.moons?q.moons.length:0),0); rows.push(['Lunes', String(nm)]);
  if(sys.hz) rows.push(['Zone habitable', 'vers '+fr(sys.hz, sys.hz<1?2:1)+' UA de l’étoile']);
  return rows;
}
// Fiche texte complète (pour l'export complet).
function systemSheetText(sys){
  const L=[], hr='─'.repeat(60);
  L.push(`SYSTÈME DE ${sys.star.name.toUpperCase()}`, hr, descOf(sys.star), '');
  for(const [k,v] of systemSummaryRows(sys)) L.push(`${k} : ${v}`);
  const block=(o,ind='')=>{ L.push('', ind+`${o.name} — ${kindLabel(o)}`); const d=descOf(o); if(d) L.push(ind+d); for(const [k,v] of factsOf(o)) L.push(ind+`  • ${k} : ${v}`); };
  L.push('', hr, 'PLANÈTES', hr);
  for(const p of sys.planets){ block(p); if(p.moons && p.moons.length){ L.push('  Lunes :'); for(const m of p.moons) block(m,'    '); } }
  const others=[...sys.belts, ...sys.dwarfs, ...sys.comets, ...(sys.companion?[sys.companion]:[])];
  if(others.length){ L.push('', hr, 'CEINTURES, PLANÈTES NAINES, COMÈTES ET COMPAGNON', hr); for(const o of others) block(o); }
  return L.join('\r\n');
}
