# Serveur web statique minimal (aucune installation) pour JDR Global.
# Sert le dossier dist/ sur http://localhost:<Port>/ et ouvre le navigateur. Fermer la fenêtre arrête le serveur.
param(
  [int]$Port = 8417,
  [string]$Dossier = (Join-Path $PSScriptRoot 'dist')
)

$Dossier = (Resolve-Path $Dossier).Path
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.svg' = 'image/svg+xml'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.gif' = 'image/gif'
  '.ico' = 'image/x-icon'; '.woff2' = 'font/woff2'; '.woff' = 'font/woff'; '.ttf' = 'font/ttf'
  '.glb' = 'model/gltf-binary'; '.gltf' = 'model/gltf+json'; '.pdf' = 'application/pdf'; '.wasm' = 'application/wasm'
}

$ecoute = New-Object System.Net.HttpListener
$ecoute.Prefixes.Add("http://localhost:$Port/")
try { $ecoute.Start() } catch {
  Write-Host "Impossible d'ouvrir le port $Port (deja utilise ?). L'application est peut-etre deja lancee :" -ForegroundColor Yellow
  Start-Process "http://localhost:$Port/"
  Start-Sleep -Seconds 4
  exit 1
}

Write-Host "JDR Global tourne sur http://localhost:$Port/  (fermer cette fenetre pour arreter)" -ForegroundColor Green
Start-Process "http://localhost:$Port/"

while ($ecoute.IsListening) {
  try { $ctx = $ecoute.GetContext() } catch { break }
  $rep = $ctx.Response
  try {
    $chemin = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrEmpty($chemin)) { $chemin = 'index.html' }
    $fichier = [IO.Path]::GetFullPath((Join-Path $Dossier $chemin))
    if (-not $fichier.StartsWith($Dossier) -or -not (Test-Path $fichier -PathType Leaf)) {
      $rep.StatusCode = 404
      $octets = [Text.Encoding]::UTF8.GetBytes('Introuvable')
    } else {
      $ext = [IO.Path]::GetExtension($fichier).ToLower()
      $rep.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
      $rep.Headers.Add('Cache-Control', 'no-cache')
      $octets = [IO.File]::ReadAllBytes($fichier)
    }
    $rep.ContentLength64 = $octets.Length
    $rep.OutputStream.Write($octets, 0, $octets.Length)
  } catch {
    $rep.StatusCode = 500
  } finally {
    $rep.OutputStream.Close()
  }
}
