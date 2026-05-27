# App Supermarket

Projeto hibrido com o app Android Kotlin/Jetpack Compose original e uma camada web pronta para Netlify.

## Diagnostico tecnico

O repositorio original e um projeto Android Kotlin com Gradle Kotlin DSL:

- Modulo Android: `app`
- UI: Jetpack Compose e Material 3
- Persistencia local: Room
- Telas principais: autenticacao, lista de compras, cadastro/edicao de produtos, dashboard e historico de precos
- Entidades principais: `User`, `Product` e `PriceHistory`

Como a Netlify hospeda frontend estatico e funcoes serverless, o app Android foi preservado e foi criada uma camada web em React + Vite + TypeScript + Tailwind na raiz do repositorio. A interface web reaproveita os conceitos do app Android: autenticacao, produto, marca, quantidade, preco unitario, mercado, item comprado, dashboard e historico.

Na versao Netlify, os dados ficam em um banco local do navegador (`localStorage`) com todos os registros separados por `userId`. Isso permite uso multiusuario no mesmo navegador sem depender de credenciais externas. Para sincronizacao entre dispositivos, a camada `src/storage.ts` pode ser substituida por Firebase, Supabase ou outro backend persistente mantendo os mesmos tipos de dominio.

## Por que Vite + React

Vite + React foi escolhido porque a camada Netlify precisa ser uma SPA rapida, estatica e simples de publicar em `dist`. Next.js nao e necessario aqui porque nao ha SSR, rotas server-side complexas ou renderizacao incremental. As necessidades serverless foram isoladas em Netlify Functions.

## Estrutura

```text
.
|-- app/                         # Android Kotlin original
|-- .github/workflows/deploy.yml # CI/CD Netlify
|-- netlify/functions/           # Serverless functions
|-- public/_redirects            # SPA fallback e API redirect
|-- src/                         # Frontend web React
|   |-- storage.ts               # Banco local e isolamento por usuario
|-- index.html
|-- package.json
|-- netlify.toml
|-- vite.config.ts
|-- tailwind.config.ts
|-- tsconfig.json
`-- build.gradle.kts
```

## Rodar a versao web localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Funcionalidades da versao web

- Login, criacao de conta, recuperacao de senha e logout.
- Dados isolados por UID de usuario.
- Cadastro, edicao e exclusao de produtos.
- Campos: produto, marca, quantidade, valor unitario, supermercado e data automatica.
- Checklist com status comprado/nao comprado.
- Filtros por produto, supermercado e status.
- Historico automatico de precos a cada cadastro/edicao.
- Historico com filtros por produto, supermercado e mes.
- Dashboard com variacao mensal de precos e comparacao entre supermercados.

## Validar antes do deploy

```bash
npm run lint
npm run build
npm run preview
```

O build de producao fica em `dist`.

## Rodar o Android localmente

1. Abra o repositorio no Android Studio.
2. Aguarde a sincronizacao do Gradle.
3. Crie `.env` na raiz se precisar de chaves locais.
4. Execute o modulo `app` em emulador ou dispositivo fisico.

## Netlify

`netlify.toml` define:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Redirect `/api/*` para `/.netlify/functions/:splat`
- Fallback `/*` para `/index.html`

## GitHub Actions

O workflow `.github/workflows/deploy.yml` executa a cada push na branch `main`:

1. Checkout do codigo
2. Setup do Node.js LTS
3. Instalacao das dependencias
4. Lint
5. Build
6. Deploy em producao na Netlify

Configure os secrets do repositorio em `Settings > Secrets and variables > Actions`:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Depois disso, publicar uma nova versao e apenas:

```bash
git push origin main
```

## Deploy manual opcional

```powershell
$env:NETLIFY_AUTH_TOKEN="seu-token"
$env:NETLIFY_SITE_ID="site-id-do-supermarketjon"
.\scripts\deploy-netlify.ps1 -Production
```

## Seguranca e CI/CD

- Tokens ficam somente em GitHub Secrets ou variaveis locais.
- Nenhuma credencial real e commitada.
- O workflow usa permissao minima `contents: read`.
- `concurrency` evita deploys simultaneos da mesma branch.
- Lint e build bloqueiam deploy quebrado.
- Headers de seguranca e cache de assets estao no `netlify.toml`.
