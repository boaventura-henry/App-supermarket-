# Plano de migracao para Supabase Postgres e Prisma ORM

## Escopo do diagnostico

Este documento registra o estado do frontend web do SuperList antes da migracao
para banco em nuvem.

- Baseline analisada: `origin/main`
- Commit analisado: `2a31c4b`
- Data do diagnostico: `2026-06-04`
- Escopo: frontend React/Vite, persistencia local, automacoes e futura API
- Fora do escopo: Android, implementacao do Supabase, instalacao do Prisma,
  alteracoes de regras de negocio e migracao de dados

O repositorio ja possui branches de experimentacao relacionadas ao Supabase e
Prisma. Elas devem ser revisadas tecnicamente antes de qualquer integracao. Nao
devem ser mescladas em bloco na `main`, pois podem ter divergido da aplicacao
atual.

## Resumo executivo

O SuperList web e atualmente uma SPA React/Vite cujo estado completo e salvo em
um unico objeto no `localStorage`. A interface, as regras de negocio, a
autenticacao local, o isolamento por usuario, os dashboards, o historico e o
compartilhamento ficam majoritariamente concentrados em `src/App.tsx`.

A migracao para Supabase Postgres com Prisma e viavel, mas deve ser gradual.
Antes de substituir o `localStorage`, e necessario criar uma API serverless,
formalizar o modelo relacional, adicionar autenticacao real e desenvolver um
importador explicito e idempotente. O frontend deve continuar com fallback local
durante as primeiras fases.

Recomendacao: iniciar a Fase 1 somente depois de concluir o checklist deste
documento e revisar as branches Supabase/Prisma existentes.

## Estrutura atual do projeto

O repositorio e hibrido:

- `app/`: aplicacao Android. Nao deve ser alterada por esta migracao.
- `src/`: frontend web React/Vite/TypeScript.
- `netlify/functions/`: funcao Netlify de exemplo, sem integracao com os dados
  reais da aplicacao.
- `.github/workflows/deploy.yml`: validacao automatica de lint e build.
- `netlify.toml` e `public/_redirects`: configuracao legada do Netlify.

Arquivos principais do frontend:

| Arquivo | Responsabilidade atual |
| --- | --- |
| `src/App.tsx` | UI, navegacao e maior parte das regras de negocio |
| `src/storage.ts` | leitura, gravacao e normalizacao do banco local |
| `src/types.ts` | tipos centrais da aplicacao |
| `src/webauthn.ts` | fluxo WebAuthn/passkeys frontend-only |
| `src/main.tsx` | inicializacao da aplicacao React |
| `src/styles.css` | estilos, responsividade e temas claro/escuro |
| `netlify/functions/products.ts` | endpoint estatico de exemplo |
| `.github/workflows/deploy.yml` | lint e build no GitHub Actions |

### Mapeamento funcional

- Autenticacao local: `src/App.tsx`
- Cadastro e recuperacao de usuario: `src/App.tsx`
- Listas: `src/App.tsx`
- Produtos e checklist: `src/App.tsx`
- Historico de precos: `src/App.tsx`
- Dashboard: `src/App.tsx`
- Compartilhamento local: `src/App.tsx`
- Passkeys/biometria: `src/App.tsx` e `src/webauthn.ts`
- Persistencia e compatibilidade de dados antigos: `src/storage.ts`
- Chamadas de API reais: nao existem no fluxo atual

## Modelo de dados atual

Os tipos atuais estao definidos em `src/types.ts`.

### User

```ts
interface User {
  uid: string
  name: string
  email: string
  passwordHash: string
  securityAnswerHash: string
  createdAt: number
}
```

Observacoes:

- `uid` e gerado no navegador, sem garantia de UUID.
- Hashes de senha e resposta de seguranca ficam no `localStorage`.
- Nao existe sessao autenticada por backend.

### ShoppingList

```ts
interface ShoppingList {
  id: string
  userId: string
  name: string
  color: string
  createdAt: number
  updatedAt: number
}
```

### Product

```ts
interface Product {
  id: string
  userId: string
  listId: string
  name: string
  brand?: string
  quantity: number | null
  unitPrice: number | null
  supermarket: string
  timestamp: number
  isBought: boolean
  sortOrder: number
}
```

Observacoes:

- Somente o nome e obrigatorio.
- `quantity` e `unitPrice` podem ser nulos.
- `sortOrder` preserva a posicao original quando um item comprado vai para o
  fim da lista.

### PriceHistory

```ts
interface PriceHistory {
  id: string
  userId: string
  listId?: string
  productName: string
  brand?: string
  price: number
  supermarket: string
  timestamp: number
}
```

Observacoes:

- O historico nao possui `productId`.
- O registro e criado automaticamente quando um produto recebe preco positivo
  no cadastro ou quando o preco positivo e alterado.

### PasskeyCredential

```ts
interface PasskeyCredential {
  id: string
  userId: string
  email: string
  rawId: string
  label: string
  createdAt: number
  lastUsedAt?: number
}
```

Observacao critica: a implementacao atual e frontend-only. O challenge e criado
localmente e a assertion nao e validada por servidor. Os metadados atuais nao
devem ser tratados como uma credencial de autenticacao segura em producao.

### AppDatabase

```ts
interface AppDatabase {
  users: User[]
  passkeys: PasskeyCredential[]
  lists: ShoppingList[]
  products: Product[]
  priceHistory: PriceHistory[]
  activeUserId: string | null
}
```

## Uso atual do localStorage

### Chaves

- Banco principal: `app-supermarket-db-v2`
- Tema: `app-supermarket-theme`

### Leitura

`loadDatabase()` em `src/storage.ts` le a chave principal, converte o JSON e
executa a normalizacao. `loadTheme()` em `src/App.tsx` le a preferencia de tema.

### Gravacao

`saveDatabase()` grava o objeto `AppDatabase` completo. Um `useEffect` em
`src/App.tsx` chama essa gravacao sempre que o estado do banco muda. O tema e
gravado separadamente.

### Atualizacao

`updateDatabase()` centraliza as mutacoes do estado React, mas as regras que
constroem o novo estado continuam concentradas em `src/App.tsx`.

### Normalizacao e compatibilidade

`normalizeDatabase()` em `src/storage.ts`:

- garante arrays basicos;
- define usuario de fallback;
- completa `userId` ausente em listas;
- cria lista padrao para usuario com produtos sem lista;
- associa produtos antigos a uma lista padrao;
- normaliza quantidade, preco, marca e supermercado;
- atribui `sortOrder` ausente;
- garante a existencia do array de passkeys.

Se o JSON estiver corrompido, a aplicacao retorna um banco vazio silenciosamente.
Nao existe backup, relatorio de erro ou migracao versionada.

## Fluxos e regras que precisam ser preservados

- Usuarios locais veem dados filtrados por `userId`.
- Excluir uma lista remove seus produtos e historicos associados localmente.
- Cadastrar ou alterar preco positivo pode criar historico automaticamente.
- Itens comprados aparecem no fim, mas preservam a ordem original.
- Quantidade e valor unitario continuam opcionais.
- Dashboard e historico sao calculados no navegador.
- O modo compartilhado atual mostra listas de outros usuarios existentes no
  mesmo navegador e aplica somente bloqueio visual de edicao.
- Tema claro/escuro e independente do banco principal.

## Estado de build, deploy e dependencias

### Scripts atuais

```json
{
  "dev": "vite --host 0.0.0.0",
  "build": "tsc -b && vite build",
  "preview": "vite preview --host 0.0.0.0",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit"
}
```

O projeto tambem possui scripts do Netlify. O workflow
`.github/workflows/deploy.yml` executa instalacao, lint e build em `main` e
`feature/**`, mas nao publica diretamente no Vercel ou Netlify.

O deploy no Vercel depende atualmente da integracao externa do projeto Vercel
com o GitHub. Nao existe `vercel.json`. O `README.md` ainda menciona Netlify e
precisa ser atualizado em uma tarefa futura.

### Dependencias futuras

Nao instalar nesta etapa:

- `prisma`: CLI, migrations e geracao de client;
- `@prisma/client`: acesso ao banco somente no backend;
- `@supabase/supabase-js`: necessario posteriormente para Auth e recursos
  Supabase, conforme a arquitetura escolhida;
- `zod`: recomendado para validar payloads e variaveis das APIs.

O Prisma nunca deve entrar no grafo de imports executado pelo navegador.

## Compatibilidade com Vercel Functions

O frontend Vite atual pode coexistir com Vercel Functions. A estrutura futura
recomendada e:

```text
api/
  lists/
  products/
  price-history/
src/
  services/
    listApi.ts
    productApi.ts
    priceHistoryApi.ts
  server/
    prisma.ts
    repositories/
    services/
```

Os arquivos em `api/` recebem as requisicoes serverless. Repositorios isolam o
Prisma, servicos concentram regras e o frontend acessa somente os endpoints por
`fetch`.

Pontos de atencao:

- usar uma instancia reutilizavel de `PrismaClient`;
- usar a URL com pooler do Supabase em `DATABASE_URL`;
- usar conexao direta em `DIRECT_URL` para migrations;
- executar migrations como etapa controlada, nao durante cada requisicao;
- manter codigo server-only fora do bundle do Vite;
- ajustar os `tsconfig` para incluir a futura API;
- avaliar `vercel.json` somente se forem necessarios rewrites, runtime ou
  configuracoes adicionais.

## Arquitetura alvo

Primeira etapa de arquitetura:

```text
React/Vite
  -> clientes HTTP tipados
  -> Vercel Functions /api
  -> services e repositories server-only
  -> Prisma ORM
  -> Supabase Postgres
```

Etapa posterior de autenticacao:

```text
Supabase Auth
  -> access token JWT
  -> JWT validado pelas APIs
  -> userId obtido do token validado
  -> Prisma filtra todas as operacoes pelo usuario autenticado
```

O `userId` nunca deve ser confiado quando enviado apenas no body, query string
ou cabecalho customizado pelo navegador.

Durante a migracao, adaptadores e feature flags devem permitir escolher entre
persistencia local e remota por dominio funcional. O `localStorage` deve
continuar disponivel ate a importacao ser confirmada e verificada.

## Direcao do schema futuro

O schema detalhado sera definido na Fase 1. Diretrizes iniciais:

- IDs principais em UUID.
- Campo `legacyId` opcional para importacao e idempotencia.
- Valores monetarios em `Decimal`, nunca `Float`.
- Datas em `DateTime`, com regra explicita de timezone.
- Quantidade e valor unitario permanecem opcionais.
- Relacoes e comportamentos de exclusao devem ser explicitos.
- Indices por `userId`, `listId`, datas e campos usados em filtros.
- Restricoes de unicidade para impedir importacoes duplicadas.

Entidades previstas:

- perfil da aplicacao vinculado ao usuario do Supabase Auth;
- `ShoppingList`;
- `Product`;
- `PriceHistory`;
- permissao de acesso a lista compartilhada;
- convites e notificacoes em fases posteriores.

As passkeys atuais devem ser redesenhadas com verificacao WebAuthn no servidor.
Nao se recomenda migrar diretamente seus metadados locais como credenciais
validas.

## Principais riscos

| Risco | Impacto | Mitigacao recomendada |
| --- | --- | --- |
| Banco inteiro em um unico JSON local | Corrupcao, limite de tamanho e concorrencia | Importador com validacao, backup e resumo |
| JSON corrompido vira banco vazio | Perda silenciosa aparente | Diagnostico e exportacao antes da migracao |
| Isolamento apenas no frontend | Acesso indevido a dados | JWT validado e filtros obrigatorios no backend |
| Login local e recuperacao local | Nao e autenticacao segura | Migrar para Supabase Auth sem importar senhas |
| Passkeys frontend-only | Assertion sem verificacao confiavel | Redesenhar WebAuthn com backend |
| IDs locais nao UUID | Colisoes e mapeamento complexo | UUID novo mais `legacyId` |
| Timestamps numericos | Conversao e timezone | Regra unica para `DateTime` |
| Dinheiro como `number` | Erros de precisao | Prisma `Decimal` e serializacao consistente |
| Historico sem `productId` | Vinculo ambiguo | Preservar dados denormalizados e definir link |
| Historico automatico | Duplicacao em dual-write/importacao | Chaves idempotentes e transacoes |
| Exclusao em cascata local | Divergencia do banco relacional | Definir FKs e `onDelete` explicitamente |
| Dashboard carrega tudo localmente | Escalabilidade limitada | APIs paginadas e agregacoes futuras |
| Compartilhamento local nao e autorizacao | Vazamento de dados | Modelo real de permissoes |
| Prisma em serverless | Excesso de conexoes | Pooler, singleton e limites monitorados |
| Migrations em producao | Indisponibilidade ou perda | Staging, backup e `migrate deploy` controlado |
| Dados existem somente por navegador | Importacao parcial ou duplicada | Importacao explicita por usuario e dispositivo |
| Configuracao Netlify/Vercel divergente | Deploy confuso | Definir Vercel como fonte oficial |
| Dependencias sem instalacao deterministica | Builds divergentes | Manter lockfile e adotar `npm ci` futuramente |
| `debug.keystore.base64` versionado | Risco de credencial no repositorio | Revisar, remover e rotacionar em tarefa separada |
| Branches Supabase existentes divergentes | Regressoes ao integrar | Revisao e integracao por fase |

## Plano de execucao por fases

Cada fase deve possuir feature flag, testes, criterio de saida e estrategia de
rollback.

### Fase 1 - Setup Supabase, Prisma e schema inicial

- Criar ambientes de desenvolvimento/staging.
- Configurar Prisma server-only e conexoes.
- Definir schema inicial, migrations e indices.
- Manter o frontend usando apenas `localStorage`.

Criterio de saida: schema validado e migration testada fora de producao, sem
alteracao de comportamento do app.

### Fase 2 - API de listas

- Criar endpoints, repositorio e servico de listas.
- Aplicar filtro de usuario em todas as operacoes.
- Criar cliente HTTP e feature flag para listas remotas.

Criterio de saida: CRUD de listas testado e fallback local funcional.

### Fase 3 - API de produtos

- Migrar CRUD, edicao inline, ordenacao e status comprado.
- Preservar campos opcionais e regras de `sortOrder`.
- Implementar transacoes necessarias.

Criterio de saida: produtos remotos reproduzem o comportamento local.

### Fase 4 - API de historico de precos

- Migrar geracao de historico sem duplicacao.
- Criar consultas para historico e dashboard.
- Definir paginacao e agregacoes.

Criterio de saida: historico e dashboard validados contra dados conhecidos.

### Fase 5 - Importador localStorage para Supabase

- Criar fluxo explicito com pre-visualizacao.
- Validar e normalizar dados antes do envio.
- Mapear IDs locais para UUIDs.
- Tornar importacao idempotente e gerar resumo.
- Nunca apagar automaticamente os dados locais.

Criterio de saida: importacoes repetidas nao duplicam dados e possuem auditoria.

### Fase 6 - Supabase Auth

- Substituir autenticacao local por Supabase Auth.
- Validar JWT em todas as APIs.
- Mapear contas locais sem migrar hashes de senha ou respostas de seguranca.
- Manter estrategia segura de transicao.

Criterio de saida: nenhuma API confia em `userId` fornecido pelo cliente.

### Fase 7 - Compartilhamento real com permissoes

- Criar modelo de acesso por lista.
- Definir papeis, por exemplo owner, editor e viewer.
- Aplicar autorizacao no backend e refletir permissoes na UI.

Criterio de saida: testes garantem isolamento e permissoes entre usuarios.

### Fase 8 - Convites, notificacoes e realtime

- Implementar convites e seu ciclo de vida.
- Adicionar notificacoes e realtime somente onde houver beneficio claro.
- Garantir que eventos respeitem autorizacao.

Criterio de saida: fluxos de convite e atualizacao concorrente testados.

### Fase 9 - Hardening de producao

- Backups, restore testado, observabilidade e alertas.
- Rate limiting, auditoria, seguranca e revisao de indices.
- Plano de migrations e rollback.
- Remocao gradual do fallback local somente apos confirmacao.

Criterio de saida: checklist de producao aprovado e recuperacao testada.

## Checklist antes da Fase 1

- [ ] Confirmar `origin/main` como baseline oficial.
- [ ] Revisar tecnicamente as branches Supabase/Prisma existentes.
- [ ] Confirmar configuracoes do projeto Vercel e branch de producao.
- [ ] Definir ambientes Supabase separados e regiao adequada.
- [ ] Definir responsaveis por secrets e acesso ao banco.
- [ ] Definir uso de URL com pooler e URL direta.
- [ ] Exportar amostras anonimizadas de bancos locais existentes.
- [ ] Catalogar variacoes e inconsistencias dos dados antigos.
- [ ] Aprovar mapeamento de UUID, `legacyId`, nulos, datas e Decimal.
- [ ] Definir estrategia de idempotencia do historico e do importador.
- [ ] Definir backup, restore e fluxo de migrations.
- [ ] Atualizar futuramente a documentacao Netlify/Vercel.
- [ ] Adotar futuramente lockfile e instalacao deterministica no CI.
- [ ] Revisar o arquivo `debug.keystore.base64` em tarefa de seguranca separada.
- [ ] Confirmar formalmente que Android permanece fora do escopo.
- [ ] Executar lint, build e smoke test da baseline.

## Variaveis futuras

Variaveis privadas, disponiveis somente no backend/Vercel:

```text
DATABASE_URL=
DIRECT_URL=
```

Variaveis possivelmente necessarias em fases posteriores:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_USE_REMOTE_LISTS=
VITE_USE_REMOTE_PRODUCTS=
VITE_USE_REMOTE_PRICE_HISTORY=
VITE_USE_SUPABASE_AUTH=
```

Regras:

- Nunca commitar valores reais.
- Nunca expor `DATABASE_URL`, `DIRECT_URL` ou service role no frontend.
- O prefixo `VITE_` torna a variavel publica no bundle.
- Usar service role somente quando indispensavel, sempre no backend e com
  revisao de seguranca.

## Recomendacao final

A Fase 1 pode ser iniciada com baixo risco desde que:

1. nao altere o fluxo atual baseado em `localStorage`;
2. use ambiente Supabase de desenvolvimento/staging;
3. mantenha Prisma exclusivamente no backend;
4. nao execute migration destrutiva em producao;
5. revise antes as branches Supabase/Prisma existentes;
6. conclua os itens criticos do checklist.

Nao e recomendado iniciar ainda a troca de autenticacao, a importacao automatica
ou o compartilhamento remoto. Esses pontos dependem de APIs autorizadas,
idempotencia e uma estrategia de recuperacao testada.
