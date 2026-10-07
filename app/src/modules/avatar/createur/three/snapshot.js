import * as THREE from 'three'

// Capture d'une vignette du personnage avec un CADRAGE FIXE (portrait 3/4 face,
// legere contre-plongee), INDEPENDANT de la camera OrbitControls de l'utilisateur.
//
// On rend la scene OFF-SCREEN dans un WebGLRenderTarget avec une PerspectiveCamera
// dediee, sans toucher la camera de travail ni le rendu visible a l'ecran. Le
// resultat est downscale + compresse en jpeg pour rester leger en localStorage.

// ===========================================================================
//  CONSTANTES DE CADRAGE (ajustables) — voir la note "Quelles constantes ?".
// ===========================================================================
export const THUMB_FRAMING = {
  px: 192,          // taille finale carree (px). 128 ou 192.
  superSample: 2,   // rend a px*superSample puis downscale (anti-aliasing).
  quality: 0.7,     // qualite jpeg (0..1).
  fov: 35,          // champ de vision (deg). Plus petit = plus "zoom"/teleobjectif.
  distanceH: 1.5,   // distance HORIZONTALE camera -> point vise.
  yawDeg: 30,       // angle horizontal : 0 = face, +/- = 3/4 face (droite/gauche).
  targetX: 0,       // point vise X (centre du perso).
  targetY: 1.55,    // point vise Y (tete/buste). Monte/descend le cadrage.
  targetZ: 0,       // point vise Z.
  cameraY: 1.35,    // hauteur camera. < targetY => contre-plongee (regard vers le haut).
  background: '#1a1a1f',
}

let renderer = null
let scene = null

// Enregistre le renderer + la scene R3F (appele par SnapshotBridge dans AvatarViewer).
export function registerThree(gl, sceneObj) {
  renderer = gl
  scene = sceneObj
}

function resolveCanvas() {
  if (renderer?.domElement) return renderer.domElement
  if (typeof document !== 'undefined') return document.querySelector('canvas')
  return null
}

// Rendu off-screen avec la camera dediee -> dataURL jpeg (CADRAGE FIXE).
function captureFixedFraming() {
  const gl = renderer
  if (!gl || !scene) return null
  const F = THUMB_FRAMING
  const S = Math.max(16, Math.round(F.px * F.superSample))

  // Camera dediee : on ne touche jamais a la camera utilisateur (OrbitControls).
  const cam = new THREE.PerspectiveCamera(F.fov, 1, 0.1, 100)
  const target = new THREE.Vector3(F.targetX, F.targetY, F.targetZ)
  const yaw = THREE.MathUtils.degToRad(F.yawDeg)
  cam.position.set(
    target.x + F.distanceH * Math.sin(yaw),
    F.cameraY,
    target.z + F.distanceH * Math.cos(yaw),
  )
  cam.lookAt(target)
  cam.updateProjectionMatrix()

  // Render target carre, en sRGB pour des couleurs identiques a l'ecran.
  const rt = new THREE.WebGLRenderTarget(S, S)
  rt.texture.colorSpace = THREE.SRGBColorSpace

  const prevRT = gl.getRenderTarget()
  try {
    gl.setRenderTarget(rt)
    gl.render(scene, cam)

    const buffer = new Uint8Array(S * S * 4)
    gl.readRenderTargetPixels(rt, 0, 0, S, S, buffer)

    // buffer (origine bas-gauche WebGL) -> canvas (flip vertical).
    const tmp = document.createElement('canvas')
    tmp.width = S
    tmp.height = S
    const tctx = tmp.getContext('2d')
    const img = tctx.createImageData(S, S)
    const row = S * 4
    for (let y = 0; y < S; y++) {
      const srcStart = (S - 1 - y) * row
      img.data.set(buffer.subarray(srcStart, srcStart + row), y * row)
    }
    tctx.putImageData(img, 0, 0)

    // Downscale + fond opaque (jpeg sans alpha) accorde au fond de l'app.
    const out = document.createElement('canvas')
    out.width = F.px
    out.height = F.px
    const octx = out.getContext('2d')
    octx.fillStyle = F.background
    octx.fillRect(0, 0, F.px, F.px)
    octx.drawImage(tmp, 0, 0, S, S, 0, 0, F.px, F.px)

    return out.toDataURL('image/jpeg', F.quality)
  } catch (e) {
    console.warn('[snapshot] rendu off-screen impossible :', e?.message ?? e)
    return null
  } finally {
    gl.setRenderTarget(prevRT)
    rt.dispose()
  }
}

// Repli : crop du canvas visible (camera utilisateur) si le rendu dedie echoue
// (renderer pas encore pret, contexte WebGL perdu...). Cadrage non garanti.
function captureVisibleCanvas() {
  const src = resolveCanvas()
  if (!src || !src.width || !src.height) return null
  try {
    const F = THUMB_FRAMING
    const out = document.createElement('canvas')
    out.width = F.px
    out.height = F.px
    const ctx = out.getContext('2d')
    ctx.fillStyle = F.background
    ctx.fillRect(0, 0, F.px, F.px)
    const s = Math.min(src.width, src.height)
    ctx.drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, F.px, F.px)
    return out.toDataURL('image/jpeg', F.quality)
  } catch (e) {
    console.warn('[snapshot] capture du canvas visible impossible :', e?.message ?? e)
    return null
  }
}

// API publique : vignette au cadrage fixe (repli sur le canvas visible si besoin).
export function captureThumbnail() {
  return captureFixedFraming() ?? captureVisibleCanvas()
}

// Ajout JDR Global (06/10) : la fabrique de portraits attend que le vrai modele soit charge
// (le mannequin de remplacement n'a pas de morph targets).
export function modeleCharge() {
  let ok = false
  scene?.traverse((o) => { if (o.morphTargetDictionary && Object.keys(o.morphTargetDictionary).length) ok = true })
  return ok
}
