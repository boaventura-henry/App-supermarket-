# Supabase Postgres e Prisma ORM - Fase 1

Esta fase prepara a infraestrutura backend do SuperList sem alterar o
funcionamento atual do frontend. O app continua usando o `localStorage` e a
chave `app-supermarket-db-v2`.

Nenhuma lista, produto, historico, conta local ou passkey foi migrada.

## Dependencias

- `@prisma/client`: dependencia de runtime usada somente pelo backend.
- `prisma`: ferramenta de desenvolvimento para schema, client e migrations.
- `@types/node`: tipos necessarios para o codigo server-only.

O script `postinstall` executa `prisma generate` para preparar o Prisma Client
durante a instalacao na Vercel.

## Estrutura criada

```text
api/
  health.ts
prisma/
  schema.prisma
src/server/
  prisma.ts
  auth/
  repositories/
  services/
```

- `/api/health` confirma que a camada de Vercel Functions esta online.
- `src/server/prisma.ts` exporta uma instancia reutilizavel de `PrismaClient`.
- Nada em `src/server` deve ser importado por componentes React ou por codigo
  executado no navegador.

## Variaveis de ambiente

Copie apenas os nomes de `.env.example` e configure os valores reais fora do
repositorio:

```text
DATABASE_URL=
DIRECT_URL=
```

Na Vercel, configure em `Project Settings > Environment Variables`.

- `DATABASE_URL`: connection string com pooler do Supabase, adequada para o
  runtime serverless e para varias invocacoes concorrentes.
- `DIRECT_URL`: conexao direta com o Postgres, usada em migrations e tarefas
  administrativas controladas.

No Supabase, as connection strings ficam nas configuracoes de banco/conexao do
projeto. Use os valores fornecidos pelo proprio painel e confirme a recomendacao
atual do Supabase para pooler serverless.

Nunca use o prefixo `VITE_` nessas variaveis. Variaveis `VITE_` sao incorporadas
ao bundle publico do navegador.

## Schema inicial

O schema prepara os models:

- `Profile`
- `ShoppingList`
- `Product`
- `PriceHistory`
- `PasskeyCredential`

IDs usam UUID, valores monetarios usam `Decimal`, produtos usam `Boolean` para
`purchased` e `Int` para `sortOrder`. Relacoes e indices basicos foram definidos
para preparar as proximas fases. Campos opcionais `legacyId` permitirao mapear e
importar IDs antigos do `localStorage` de forma idempotente.

`PasskeyCredential` representa apenas o formato futuro de uma credencial
WebAuthn validada no servidor. O fluxo atual de biometria continua intacto e
frontend-only nesta fase.

## Comandos Prisma

```bash
npm install
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:dev -- --name init
npm run prisma:migrate:deploy
```

`prisma migrate dev` exige `DATABASE_URL` e `DIRECT_URL` reais e deve ser
executado primeiro em um ambiente de desenvolvimento/staging. Nenhuma migration
foi criada ou aplicada nesta fase porque nenhuma conexao real foi fornecida.

Nao invente URLs e nao execute migrations destrutivas diretamente em producao.

## Health check

Depois do deploy na Vercel:

```text
GET /api/health
```

Resposta esperada:

```json
{
  "success": true,
  "message": "API online"
}
```

O endpoint nao consulta o banco nesta fase e nao expoe configuracoes sensiveis.

## Proximos passos - Fase 2

1. Configurar um projeto Supabase de desenvolvimento/staging.
2. Configurar `DATABASE_URL` e `DIRECT_URL` com seguranca.
3. Executar e revisar a migration inicial.
4. Criar repository, service e endpoints CRUD de listas.
5. Adicionar cliente HTTP e feature flag para listas remotas.
6. Manter fallback local ate a migracao ser validada.
