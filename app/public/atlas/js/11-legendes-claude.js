/* Atlas des ciels imaginaires — Légendes écrites par Claude (version en ligne seulement)
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ---------- légendes écrites par Claude ---------- */
let SAMPLE=null, tellAbort=null, lastTold=null;
(async()=>{ try{ if(window.claude && typeof window.claude.use==='function') SAMPLE=await window.claude.use('sample'); }catch(e){} updateTellBtn(); })();
function updateTellBtn(){
  const b=$('cTell'); if(!b) return;
  let ok=false;
  if(SAMPLE && sky){ if(cardMode==='const' && selC>=0) ok=true; else if(cardMode==='star' && sel>=0){ const s=sky.stars[sel]; ok = s.kind==='star' && (!!s.name || s.c>=0) && !s.homeStar; } }
  b.hidden=!ok;
}
function cancelTell(){ if(tellAbort){ tellAbort.abort(); tellAbort=null; } $('cKeep').hidden=true; $('cTell').disabled=false; $('cTell').textContent='Raconter la légende'; }
function legendPrompt(){
  const rules='Écris en français une légende de 150 à 220 mots, en prose, sans titre, sans liste et sans mise en forme, sur le ton d’un conteur. Respecte strictement les faits donnés, n’invente pas de nouveaux noms d’étoiles ni de constellations ; tu peux inventer des personnages secondaires. Réponds uniquement avec le texte de la légende.';
  if(cardMode==='const' && selC>=0){
    const c=sky.consts[selC];
    if(sky.earth){ return {type:'const', idx:selC, key:'c'+selC, prompt:`Raconte en français, sur le ton d’un conteur, le mythe traditionnel associé à la constellation réelle ${c.name} (${c.la||c.gen}). Reste fidèle aux récits connus (mythologie grecque ou tradition réelle) sans rien inventer ; si le mythe est mince, raconte l’histoire de sa création par les astronomes. 150 à 220 mots, en prose, sans titre ni mise en forme. Contexte : ${c.realDesc}`}; }
    const lp=localPeople(), cn = lp ? getCN(lp,selC) : null;
    const members=c.members.slice().sort((a,b)=>sky.stars[a].mag-sky.stars[b].mag).slice(0,8).map(j=>{ const s=sky.stars[j]; return `${s.name||s.desig}${s.part?' ('+s.part+')':''}${s.meaning?', nom qui signifie « '+s.meaning+' »':''}, étoile ${colorLabel(s.t).toLowerCase()}`; });
    const nb = c.neighbor>=0 ? sky.consts[c.neighbor] : null;
    const facts = [
      `Constellation : ${cn?cn.name:c.name}`, `Elle représente : ${cn?cn.fig:c.fig}`, `Peuple qui raconte : ${lp?lp.name:c.culture}`, `Sens du nom : « ${cn?cn.meaning:c.meaning} »`,
      `Tradition connue : ${cn?cn.story:c.story}`, `Étoiles principales : ${members.join(' ; ')}`,
      nb ? `Constellation voisine : ${nb.name}, qui représente ${nb.fig}. Lien : ${c.relation}` : '',
      c.inMilky ? 'Elle baigne dans la voie lactée.' : '', c.hasNeb ? 'Une nébuleuse colorée flotte entre ses étoiles.' : '',
      world ? `Le monde où l’on raconte cette histoire s’appelle ${world.name}.` : ''
    ].filter(Boolean).join('\n');
    return {type:'const', idx:selC, key:'c'+selC, prompt:`${rules}\n\nFaits à respecter :\n${facts}`};
  }
  if(cardMode==='star' && sel>=0){
    const s=sky.stars[sel], c=s.c>=0?sky.consts[s.c]:null;
    if(sky.earth) return {type:'star', idx:sel, key:keyOfStar(s), prompt:`Raconte en français, sur le ton d’un conteur, ce que les cultures humaines ont raconté sur l’étoile réelle ${s.name} (${s.desig||''}), et d’où vient son nom. Reste strictement fidèle aux faits connus, sans rien inventer. 120 à 200 mots, en prose, sans titre ni mise en forme. Contexte : ${earthStarText(s)}`};
    const facts=[`Étoile : ${s.name||s.desig||'une étoile sans nom propre'}`, s.meaning?`Son nom signifie « ${s.meaning} » dans ${sky.lang}`:'', c?`Elle appartient à la constellation ${c.name}, qui représente ${c.fig}${s.part?', dont elle marque '+s.part:''}`:'', `Couleur : ${colorLabel(s.t).toLowerCase()}`, s.lore?`Tradition : ${s.lore}`:'', s.rank<=10?`C’est la ${s.rank===1?'plus brillante':s.rank+'e plus brillante'} étoile du ciel.`:'', world?`Monde : ${world.name}`:''].filter(Boolean).join('\n');
    return {type:'star', idx:sel, key:keyOfStar(s), prompt:`${rules}\n\nFaits à respecter :\n${facts}`};
  }
  return null;
}
$('cTell').onclick=async()=>{
  if(!SAMPLE) return; const info=legendPrompt(); if(!info) return;
  cancelTell(); tellAbort=new AbortController(); const btn=$('cTell'); btn.disabled=true; btn.textContent='Claude écrit…';
  const desc=$('cDesc'); desc.hidden=false; desc.textContent='…';
  try{
    const res=await SAMPLE(info.prompt, {signal:tellAbort.signal, modelTier:'default', onText:({text})=>{ desc.textContent=text; }});
    const txt=(res.text||'').trim(); desc.textContent=txt; lastTold={...info, text:txt}; $('cKeep').hidden = !!sky.earth || !txt;
  }catch(e){
    if(e && e.code==='cancelled') return;
    if(e && e.code==='not_granted'){ SAMPLE=null; updateTellBtn(); toast('Les légendes de Claude ne sont pas disponibles ici'); }
    else if(e && e.code==='rate_limited') toast('Trop de demandes pour le moment, réessaie dans un instant');
    else { toast('La légende n’a pas pu être écrite'); if(e && e.text) desc.textContent=e.text; }
  } finally { btn.disabled=false; btn.textContent='Raconter la légende'; tellAbort=null; }
};
$('cKeep').onclick=()=>{ if(!lastTold) return; E[lastTold.key]=Object.assign({}, E[lastTold.key]||{}, {desc:lastTold.text}); applyEdits(); $('cKeep').hidden=true; persistEdits('Légende gardée'); };
