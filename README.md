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

## Supabase Postgres + Prisma - fase 1

Esta fase prepara o backend para uma migracao futura do `localStorage` para Supabase Postgres usando Prisma ORM. O frontend continua funcionando com `localStorage` e a chave `app-supermarket-db-v2`; nenhuma tela foi migrada para banco remoto nesta etapa.

Arquivos principais:

- `prisma/schema.prisma`: modelos `User`, `ShoppingList`, `Product`, `PriceHistory` e `PasskeyCredential`.
- `prisma/migrations/20260603000000_init/migration.sql`: migration SQL inicial para Supabase/Postgres.
- `src/server/prisma.ts`: instancia unica/reutilizavel do Prisma Client para ambiente serverless.
- `api/db-health.ts`: endpoint inicial de health check de banco para Vercel Serverless Functions.
- `api/lists`: endpoints serverless para gerenciamento de listas via Prisma.
- `api/products`: endpoints serverless para gerenciamento de produtos via Prisma.
- `api/price-history`: endpoints serverless para historico de precos via Prisma.
- `api/migration/import-local-data.ts`: endpoint seguro para importar dados antigos do `localStorage`.
- `api/me.ts`: endpoint de perfil autenticado via JWT Supabase.
- `src/server/repositories/listRepository.ts`: operacoes Prisma para listas.
- `src/server/services/listService.ts`: regras de negocio e validacoes da API de listas.
- `src/server/repositories/productRepository.ts`: operacoes Prisma para produtos.
- `src/server/services/productService.ts`: regras de negocio, ownership e validacoes da API de produtos.
- `src/server/repositories/priceHistoryRepository.ts`: operacoes Prisma para historico de precos.
- `src/server/services/priceHistoryService.ts`: filtros, ownership, normalizacao e criacao de historico.
- `src/server/repositories/migrationRepository.ts`: operacoes Prisma transacionais para importacao.
- `src/server/services/migrationService.ts`: normalizacao, validacao, deduplicacao e relatorio de importacao.
- `src/services/listApi.ts`: cliente `fetch` inicial para futura ativacao remota no frontend.
- `src/services/productApi.ts`: cliente `fetch` para CRUD remoto de produtos.
- `src/services/priceHistoryApi.ts`: cliente `fetch` para historico remoto.
- `src/services/migrationApi.ts`: cliente `fetch` para a ferramenta de importacao local.
- `src/lib/supabaseClient.ts`: client Supabase Auth no frontend usando anon key publica.
- `src/services/authService.ts`: camada de autenticacao Supabase Auth.
- `src/services/apiClient.ts`: `fetch` autenticado com `Authorization: Bearer <token>`.
- `src/server/auth/getAuthenticatedUser.ts`: validacao backend de JWT Supabase.

Variaveis obrigatorias na Vercel:

- `DATABASE_URL`: URL pooled do Supabase Postgres, usada pelo Prisma Client em runtime serverless.
- `DIRECT_URL`: URL direta do Supabase Postgres, usada para migrations.
- `VITE_SUPABASE_URL`: URL publica do projeto Supabase para o frontend.
- `VITE_SUPABASE_ANON_KEY`: anon key publica do Supabase para Auth no frontend. Nunca use service role no frontend.
- `VITE_USE_REMOTE_LISTS`: feature flag nao sensivel. Use `false` para manter `localStorage`; use `true` apenas quando a UI de listas for migrada para API.
- `VITE_USE_REMOTE_PRODUCTS`: feature flag nao sensivel. Use `false` para manter produtos no `localStorage`; use `true` apenas quando o CRUD de produtos for migrado para API.
- `VITE_USE_REMOTE_PRICE_HISTORY`: feature flag nao sensivel. Use `false` para manter historico no `localStorage`; use `true` quando Dashboard/Histórico forem alimentados pela API.
- `VITE_ENABLE_LOCAL_DATA_MIGRATION`: feature flag nao sensivel. Use `false` para esconder a tela de importacao; use `true` para exibir a opcao "Migrar dados para nuvem" no menu.
- `VITE_USE_SUPABASE_AUTH`: feature flag nao sensivel. Use `false` para manter login local temporario; use `true` para ativar Supabase Auth.

Nao coloque valores reais no codigo. Use `.env.example` apenas como modelo e configure os valores reais em `Vercel > Project Settings > Environment Variables`.

Comandos Prisma:

```bash
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
```

Para aplicar migrations em producao, configure `DATABASE_URL` e `DIRECT_URL` na Vercel e rode `npm run prisma:migrate:deploy` em ambiente seguro de deploy/backend. O Prisma Client deve ser usado somente em `api/` ou outro backend; nunca importe Prisma diretamente em componentes React executados no navegador.

Endpoints de listas preparados para a Fase 2:

- `GET /api/lists?userId=<id>`
- `GET /api/lists/:id?userId=<id>`
- `POST /api/lists`
- `PUT /api/lists/:id`
- `DELETE /api/lists/:id?userId=<id>`

Todas as operacoes filtram por `userId` no backend. Nesta fase, o `userId` pode ser o UUID do banco ou o `legacyId` vindo da migracao futura do `localStorage`. A UI ainda permanece em `localStorage` por padrao.

## Supabase Postgres + Prisma - fase 3

Esta fase prepara o CRUD remoto de produtos usando Vercel Functions, Prisma e Supabase Postgres. O `localStorage` continua ativo por padrao para preservar a experiencia atual e os dados antigos. A troca para API remota e controlada por `VITE_USE_REMOTE_PRODUCTS=true`.

Endpoints de produtos:

- `GET /api/lists/:listId/products?userId=<id>`
- `POST /api/lists/:listId/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id?userId=<id>`
- `PATCH /api/products/:id/purchased`

Regras implementadas no backend:

- Prisma roda apenas em `api/`/`src/server`, nunca no navegador.
- Toda escrita valida `userId` e ownership da lista/produto.
- Usuarios podem visualizar produtos de listas compartilhadas, mas somente o criador da lista pode criar, editar, excluir ou marcar comprado.
- `quantity` e `unitPrice` aceitam vazio e usam `Decimal` no banco.
- `purchased` e `sortOrder` preservam a regra visual: itens nao comprados aparecem primeiro, comprados vao para o fim e, ao desmarcar, retornam para a ordem original.
- `Valor total` segue calculado em runtime no frontend e nao e persistido.

## Supabase Postgres + Prisma - fase 4

Esta fase prepara o historico de precos remoto usando Vercel Functions, Prisma e Supabase Postgres. O `localStorage` permanece como fallback por padrao e a troca gradual e controlada por `VITE_USE_REMOTE_PRICE_HISTORY=true`.

Endpoints de historico:

- `GET /api/price-history?userId=<id>`
- `GET /api/price-history?userId=<id>&productName=Arroz&supermarket=Mercado&monthStart=2026-01&monthEnd=2026-06`
- `POST /api/price-history`
- `GET /api/price-history/:id?userId=<id>`
- `DELETE /api/price-history/:id?userId=<id>`

Regras implementadas:

- Prisma continua restrito ao backend/API.
- Toda leitura e exclusao filtra por `userId`.
- `productId`, `listId` e `quantity` sao opcionais para manter compatibilidade com historicos antigos baseados apenas no nome do produto.
- `price` usa `Decimal` no banco.
- `createdAt` no Prisma mapeia para a coluna existente `recordedAt`, preservando dados criados na fase inicial.
- Quando o CRUD remoto de produtos cria um produto com `unitPrice > 0`, a API gera historico automaticamente.
- Quando a edicao remota altera `unitPrice` para um valor valido maior que zero, a API gera novo historico; salvar o mesmo valor novamente nao duplica registro.
- Dashboard e tela de Historico carregam dados da API quando `VITE_USE_REMOTE_PRICE_HISTORY=true`; caso contrario seguem usando `localStorage`.

## Supabase Postgres + Prisma - fase 5

Esta fase adiciona uma ferramenta segura para importar dados antigos do `localStorage` (`app-supermarket-db-v2`) para Supabase Postgres usando as APIs serverless e Prisma no backend.

Endpoint de importacao:

- `POST /api/migration/import-local-data`

Como ativar a tela:

```bash
VITE_ENABLE_LOCAL_DATA_MIGRATION=true
```

Com a flag ativa, o menu exibe "Migrar dados para nuvem" para usuario logado. A tela mostra uma previa antes da importacao:

- usuarios encontrados no `localStorage`;
- listas, produtos e historicos encontrados;
- usuario local ativo;
- dados que pertencem ao usuario logado e serao importados.

Regras da importacao:

- Nada e importado automaticamente.
- O usuario precisa confirmar antes de enviar dados para a API.
- Somente dados do usuario logado sao importados nesta fase.
- Dados de outros usuarios aparecem no resumo, mas sao ignorados.
- Dados locais nao sao apagados.
- Dados remotos nao sao apagados.
- A importacao roda em transacao Prisma quando possivel.
- Itens invalidos sao ignorados com aviso no relatorio.
- A deduplicacao usa `legacyId` com os IDs originais do `localStorage`; tambem ha checagens naturais para produtos e historicos quando necessario.
- Rodar a importacao mais de uma vez nao deve duplicar tudo: duplicados sao contabilizados no relatorio.

Dados sensiveis:

- Nenhuma senha em texto puro e importada.
- O fluxo atual ainda usa hashes locais temporarios apenas por compatibilidade do modelo existente.
- Biometria nao e armazenada nem importada; passkeys, quando presentes, importam somente metadados publicos ja salvos no app.
- A autenticacao definitiva deve ser substituida por Supabase Auth em fase futura.

Resumo retornado pela API:

- usuarios importados/ignorados;
- listas importadas/ignoradas;
- produtos importados/ignorados;
- historicos importados/ignorados;
- passkeys importadas/ignoradas;
- duplicados detectados;
- avisos de normalizacao ou dados invalidos.

## Supabase Auth - fase 6

Esta fase adiciona Supabase Auth como fluxo principal de autenticacao quando `VITE_USE_SUPABASE_AUTH=true`, mantendo o login local como fallback temporario quando a flag esta desligada.

Arquivos principais:

- `src/lib/supabaseClient.ts`
- `src/services/authService.ts`
- `src/services/apiClient.ts`
- `src/server/auth/getAuthenticatedUser.ts`
- `api/me.ts`

Fluxo implementado:

- cadastro por e-mail e senha via Supabase Auth;
- login por e-mail e senha via Supabase Auth;
- persistencia de sessao pelo Supabase client;
- logout via Supabase Auth;
- recuperacao de senha por e-mail;
- criacao/busca de `Profile` em `GET /api/me`;
- criacao de usuario shadow na tabela `users` para manter as relacoes Prisma existentes;
- chamadas frontend para listas, produtos, historico e migracao enviam `Authorization: Bearer <token>` quando ha sessao Supabase.

APIs protegidas:

- APIs de listas, produtos, historico e migracao usam o usuario autenticado pelo JWT Supabase.
- Sem header `Authorization`, as rotas protegidas retornam `401`.
- Com token invalido, a API retorna `401`.
- O endpoint `GET /api/me` e `PUT /api/me` exige JWT valido.

Impacto no login antigo:

- `VITE_USE_SUPABASE_AUTH=false`: fluxo antigo por `localStorage` continua funcionando.
- `VITE_USE_SUPABASE_AUTH=true`: e-mail/senha usam Supabase Auth.
- Dados antigos do `localStorage` nao sao apagados.
- A importacao da Fase 5 pode ser usada apos login Supabase para vincular dados antigos ao usuario autenticado.

Passkeys/biometria:

- A biometria local continua como melhoria temporaria quando presente.
- O app nao armazena biometria.
- WebAuthn/passkeys frontend-only ainda nao substituem a autenticacao forte backend com challenge validado no servidor.
- Supabase Auth por e-mail/senha e o fluxo principal nesta fase.

## Listas compartilhadas - fase 7

Esta fase adiciona compartilhamento real de listas entre usuarios usando Supabase Postgres + Prisma no backend. O frontend continua preservando o `localStorage` como cache/fallback e nao muda a chave `app-supermarket-db-v2`.

Modelo novo:

- `SharedListAccess`: vincula `ShoppingList` e `User`.
- `ListAccessRole`: `EDITOR` ou `VIEWER`.
- O dono da lista e inferido por `ShoppingList.userId` e aparece no frontend como `OWNER`.

Endpoints de compartilhamento:

- `GET /api/lists/:listId/shares`
- `POST /api/lists/:listId/shares`
- `PUT /api/lists/:listId/shares/:shareId`
- `DELETE /api/lists/:listId/shares/:shareId`

Regras de permissao:

- `OWNER`: gerencia lista, compartilha, altera/exclui lista e edita produtos.
- `EDITOR`: visualiza a lista e cria/edita/exclui/marca produtos.
- `VIEWER`: somente visualiza a lista e os produtos.
- As APIs sempre validam o usuario autenticado por JWT Supabase e filtram por permissao.
- O frontend separa "Minhas listas" e "Compartilhadas comigo" e mostra o papel de acesso.
- A modal "Compartilhar" aparece apenas para o dono da lista.

Arquivos principais:

- `prisma/migrations/20260603003000_shared_list_access/migration.sql`
- `src/server/auth/listPermissions.ts`
- `src/server/repositories/shareRepository.ts`
- `src/server/services/shareService.ts`
- `api/lists/[listId]/shares/index.ts`
- `api/lists/[listId]/shares/[shareId].ts`
- `src/services/shareApi.ts`

Realtime:

- Supabase Realtime nao foi ativado nesta fase. As listas compartilhadas sao carregadas por chamadas HTTP quando as feature flags remotas estao ligadas. A sincronizacao em tempo real pode ser adicionada em uma fase posterior usando canais do Supabase filtrados por lista/usuario.

Seguranca e RLS:

- Nunca configure `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Configure somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no browser.
- Habilite RLS no Supabase para tabelas publicas como `profiles`, `shopping_lists`, `products`, `price_history` e `passkey_credentials`.
- Mesmo com Prisma no backend, RLS deve ficar preparado para a evolucao de seguranca.

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
