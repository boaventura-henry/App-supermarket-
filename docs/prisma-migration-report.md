# Relatorio da migration inicial Prisma + Supabase

## Resumo

A configuracao Prisma foi validada e a primeira migration foi criada e aplicada
com sucesso no projeto Supabase de desenvolvimento.

- Branch: `feature/validate-prisma-init-migration`
- Migration: `20260604161701_init`
- Status do banco: schema atualizado e sincronizado
- Secrets commitados: nenhum
- Frontend/localStorage alterados: nao
- Android alterado: nao

## Configuracao validada

O arquivo `prisma/schema.prisma` possui:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Nao existem connection strings reais no schema ou no codigo versionado.
`DATABASE_URL` e `DIRECT_URL` sao lidas exclusivamente do ambiente.

O `.gitignore` protege:

```text
.env
.env.local
```

O `.env` local permanece fora do Git.

## Problemas encontrados e correcoes

### 1. `.env.local` nao estava ignorado

Correcao: inclusao de `.env.local` no `.gitignore`.

### 2. Connection strings locais nao eram URLs validas para o Prisma

As duas URLs continham caracteres reservados nao codificados no trecho da senha
e delimitadores de placeholder. Isso fazia o Prisma Migrate falhar antes de
conectar.

Correcao local, nao versionada:

- remocao dos delimitadores de placeholder;
- codificacao URL-safe do trecho da senha;
- nenhum valor foi exibido ou registrado neste relatorio.

### 3. Conexao direta sem conectividade neste ambiente

A `DATABASE_URL` pooled/runtime estava acessivel, mas a conexao configurada em
`DIRECT_URL` nao estava acessivel a partir deste ambiente. O comportamento e
compativel com uma conexao direta Supabase dependente de IPv6.

Correcao local, nao versionada:

- uso do session pooler Supabase na porta `5432` como `DIRECT_URL`;
- manutencao do pooler de runtime na porta `6543` em `DATABASE_URL`;
- adicao de `sslmode=require` na conexao de migration.

O `.env` local foi atualizado, continua ignorado e nao foi commitado.

### 4. Diretorio antigo de migration vazio

Existia um diretorio local antigo em `prisma/migrations` sem o arquivo
`migration.sql`, causando o erro Prisma `P3015`.

Correcao:

- confirmacao de que o diretorio estava vazio;
- remocao somente desse diretorio vazio;
- nova execucao da migration.

## Comandos executados

```text
npm install --no-package-lock --no-audit --no-fund
npm exec -- prisma validate
npm exec -- prisma generate
npm exec -- prisma migrate dev --name init
npm exec -- prisma migrate status
npm run lint
npm run build
```

Foi usada uma distribuicao portatil oficial do Node.js fora do repositorio,
pois o ambiente original nao disponibilizava `npm`/`npx`.

## Resultado das validacoes

| Validacao | Resultado |
| --- | --- |
| Prisma schema validate | Aprovado |
| Prisma Client generate | Aprovado, Prisma Client `6.19.3` |
| Migration inicial | Criada e aplicada |
| Prisma migrate status | Banco atualizado |
| ESLint | Aprovado |
| TypeScript/Vite build | Aprovado |
| Verificacao de secrets versionados | Aprovado |

O build transformou `1581` modulos e gerou os artefatos de producao em `dist`.

## Migration criada

Arquivo:

```text
prisma/migrations/20260604161701_init/migration.sql
```

### Tabelas

1. `profiles`
2. `shopping_lists`
3. `products`
4. `price_history`
5. `passkey_credentials`

### Tipos e defaults relevantes

- IDs definidos como colunas PostgreSQL `UUID`.
- IDs sao gerados pelo Prisma Client conforme `@default(uuid())`.
- Quantidade usa `DECIMAL(12,3)`.
- Valor unitario e preco historico usam `DECIMAL(12,2)`.
- `purchased` usa `BOOLEAN` com default `false`.
- `sortOrder` usa `INTEGER` com default `0`.
- Datas de criacao usam `CURRENT_TIMESTAMP`.

Observacao: a migration nao adiciona default SQL `gen_random_uuid()` porque o
schema usa `@default(uuid())`, cujo valor e gerado pelo Prisma Client. Isso e
coerente para as futuras APIs Prisma, mas deve ser lembrado caso sejam criados
registros diretamente por SQL.

### Indices

Foram criados `7` indices unicos:

- `profiles_legacyId_key`
- `profiles_email_key`
- `shopping_lists_legacyId_key`
- `products_legacyId_key`
- `price_history_legacyId_key`
- `passkey_credentials_legacyId_key`
- `passkey_credentials_credentialId_key`

Foram criados `7` indices de consulta:

- `shopping_lists_userId_idx`
- `products_userId_idx`
- `products_listId_purchased_sortOrder_idx`
- `price_history_userId_createdAt_idx`
- `price_history_listId_idx`
- `price_history_productId_idx`
- `passkey_credentials_userId_idx`

### Foreign keys

Foram criadas `7` foreign keys:

- listas para profiles;
- produtos para listas;
- produtos para profiles;
- historico para profiles;
- historico para listas;
- historico para produtos;
- passkeys para profiles.

As relacoes obrigatorias usam `ON DELETE CASCADE`. As relacoes opcionais do
historico com lista e produto usam `ON DELETE SET NULL`.

## Revisao de seguranca da migration

A migration foi revisada integralmente.

- `DROP TABLE`: ausente
- `DROP COLUMN`: ausente
- `TRUNCATE`: ausente
- `DELETE FROM`: ausente
- comandos destrutivos inesperados: ausentes
- URLs, usuarios, senhas ou tokens: ausentes

## Arquivos versionados nesta etapa

- `.gitignore`
- `prisma/migrations/migration_lock.toml`
- `prisma/migrations/20260604161701_init/migration.sql`
- `docs/prisma-migration-report.md`

## Proximos passos para a Fase 2

1. Criar repository e service de listas em `src/server`.
2. Criar endpoints Vercel para CRUD de listas.
3. Validar usuario em todas as operacoes.
4. Criar cliente HTTP do frontend e feature flag para listas remotas.
5. Manter `localStorage` como fallback.
6. Nao iniciar produtos, historico ou Supabase Auth nesta fase.
