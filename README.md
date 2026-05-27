# Supermarket Jon Web

Aplicacao web pronta para producao com deploy automatico no Netlify via GitHub Actions.

## Escolha arquitetural

Foi escolhido Vite + React em vez de Next.js porque a aplicacao e uma SPA de catalogo/carrinho sem necessidade de SSR, rotas server-side ou renderizacao incremental. Isso reduz complexidade operacional, gera um build estatico em `dist` e encaixa diretamente no modelo de hospedagem do Netlify.

## Stack

- Vite + React
- TypeScript
- Tailwind CSS
- Netlify Functions em `netlify/functions`
- SPA fallback via `netlify.toml` e `public/_redirects`
- GitHub Actions com Node.js LTS e Netlify CLI oficial

## Estrutura

```text
.
|-- .github/workflows/deploy.yml
|-- netlify/functions/products.ts
|-- public/_redirects
|-- src/
|   |-- data/
|   |-- App.tsx
|   |-- main.tsx
|   |-- styles.css
|   `-- types.ts
|-- index.html
|-- netlify.toml
|-- package.json
|-- tailwind.config.ts
|-- tsconfig.json
`-- vite.config.ts
```

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Comandos

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

O build de producao e gerado em `dist`.

## Configurar secrets no GitHub

No repositorio GitHub, acesse:

`Settings > Secrets and variables > Actions > New repository secret`

Crie os secrets:

- `NETLIFY_AUTH_TOKEN`: token pessoal da Netlify com permissao de deploy.
- `NETLIFY_SITE_ID`: ID do site Netlify que recebera o deploy.

As credenciais nao ficam no codigo e sao consumidas apenas pelo runner do GitHub Actions.

## Deploy automatico

O workflow esta em `.github/workflows/deploy.yml`.

Ao executar:

```powershell
git push origin main
```

o pipeline faz:

1. Checkout do codigo.
2. Instalacao do Node.js LTS atual com `actions/setup-node`.
3. Instalacao de dependencias.
4. Execucao do lint.
5. Build de producao.
6. Deploy para Netlify com `netlify deploy --prod`.

## Configuracao Netlify

`netlify.toml` define:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Redirect `/api/*` para Netlify Functions
- Fallback `/* -> /index.html` para SPA

## Deploy manual opcional

Para diagnostico local, configure as variaveis e rode:

```bash
npm run netlify:deploy:prod
```

ou no Windows:

```powershell
$env:NETLIFY_AUTH_TOKEN="seu-token"
$env:NETLIFY_SITE_ID="site-id"
.\scripts\deploy-netlify.ps1 -Production
```

## Boas praticas aplicadas

- Secrets nunca sao commitados.
- CI com `permissions: contents: read`.
- `concurrency` evita deploys simultaneos para a mesma branch.
- Lint e typecheck bloqueiam deploy quebrado.
- Headers de seguranca estao configurados no `netlify.toml`.
- Assets versionados pelo Vite recebem cache imutavel.
