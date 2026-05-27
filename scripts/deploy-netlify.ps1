param(
  [switch]$Production
)

$ErrorActionPreference = "Stop"

if (-not $env:NETLIFY_AUTH_TOKEN) {
  throw "Defina NETLIFY_AUTH_TOKEN antes do deploy."
}

if (-not $env:NETLIFY_SITE_ID) {
  throw "Defina NETLIFY_SITE_ID com o Site ID do projeto supermarketjon."
}

npm install --no-audit --no-fund
npm run lint
npm run build

if ($Production) {
  npx netlify deploy --prod --dir=dist --functions=netlify/functions --site=$env:NETLIFY_SITE_ID --auth=$env:NETLIFY_AUTH_TOKEN
} else {
  npx netlify deploy --dir=dist --functions=netlify/functions --site=$env:NETLIFY_SITE_ID --auth=$env:NETLIFY_AUTH_TOKEN
}
