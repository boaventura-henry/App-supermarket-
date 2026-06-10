# Shared Lists Supabase Report

Data: 2026-06-10

## Objetivo

Migrar o compartilhamento de listas para Supabase, removendo a dependencia de dados locais para a secao "Outras listas".

## Tabela Criada

Migration:

```text
prisma/migrations/20260610120000_add_remote_list_shares/migration.sql
```

Tabela:

```text
list_shares
```

Campos:

- `id`
- `list_id`
- `owner_user_id`
- `shared_user_id`
- `permission`
- `created_at`
- `updated_at`

Permissoes:

- `viewer`
- `editor`

Relacionamentos:

- `list_shares.list_id -> shopping_lists.id`
- `list_shares.owner_user_id -> profiles.id`
- `list_shares.shared_user_id -> profiles.id`

## Migration De Suporte

Migration:

```text
prisma/migrations/20260610115500_add_uuid_defaults_for_supabase_client/migration.sql
```

Motivo:

As migrations Prisma anteriores criaram `id UUID NOT NULL` sem default no banco. Como o Supabase Client insere registros sem enviar `id`, a migration adiciona:

```sql
ALTER TABLE ... ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
```

Isso evita falha em inserts diretos pelo frontend.

## Policies RLS

Arquivo atualizado:

```text
docs/supabase-direct-client-rls.sql
```

Principais regras:

- Dono da lista pode criar, alterar, remover e visualizar compartilhamentos.
- Usuario compartilhado pode visualizar seu proprio compartilhamento.
- `viewer` pode ler lista/produtos/historico compartilhados.
- `editor` pode ler e alterar produtos da lista compartilhada.
- `editor` pode criar produtos na lista compartilhada usando `user_id` do dono da lista.
- `products` e `price_history` validam permissao via `list_shares`.

## Frontend Alterado

Arquivos:

- `src/services/shareApi.ts`
- `src/services/listApi.ts`
- `src/services/productApi.ts`
- `src/services/priceHistoryApi.ts`
- `src/App.tsx`
- `src/types.ts`

Mudancas:

- `listApi.getLists` carrega listas proprias e listas compartilhadas.
- `shareApi` pesquisa profiles por e-mail, lista shares, cria/atualiza/remove shares.
- `productApi` le produtos por `list_id`, permitindo RLS decidir acesso.
- `productApi.createProduct` grava `user_id` do dono da lista, inclusive quando editor cria produto.
- `priceHistoryApi` inclui historico de listas compartilhadas.
- `App.tsx` considera listas compartilhadas em Home, Dashboard, Historico, totalizadores e "Outras listas".

## Tela De Compartilhamento

Na edicao de uma lista propria, aparece:

```text
Compartilhar lista
```

Permite:

- informar e-mail do usuario;
- pesquisar profile por e-mail;
- definir permissao `viewer` ou `editor`;
- alterar permissao existente;
- remover compartilhamento.

## Outras Listas

Antes:

- dependia de dados locais de outros usuarios do navegador.

Agora:

- exibe listas vindas de `list_shares`;
- usa Supabase como fonte principal;
- respeita `viewer` e `editor`.

## Status

Compartilhamento remoto: implementado.

Pendencias:

- aplicar migrations no Supabase;
- aplicar SQL de RLS atualizado;
- testar usuario A compartilhando com usuario B;
- testar `viewer` somente leitura;
- testar `editor` criando/editando/marcando produto.
