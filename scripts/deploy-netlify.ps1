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
npm run build

if ($Production) {
  npx netlify-cli deploy --prod --dir=dist --functions=netlify/functions --site=$env:NETLIFY_SITE_ID
} else {
  npx netlify-cli deploy --dir=dist --functions=netlify/functions --site=$env:NETLIFY_SITE_ID
}
