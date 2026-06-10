# Direct Supabase Readiness Report

Data: 2026-06-09

## Resumo

O frontend esta configurado para usar Supabase Client diretamente quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estao presentes. As operacoes principais de listas, produtos e historico nao dependem mais das APIs Prisma/Vercel Functions no frontend.

O app ainda nao esta 100% livre de `localStorage`: ele usa `localStorage` para tema, preferencias/cache minimo e passkeys locais. Para dados de negocio, a arquitetura agora esta preparada para Supabase direto, incluindo listas compartilhadas remotas via `list_shares`.

## Variaveis Supabase

Arquivo: `src/lib/supabaseClient.ts`

Confirmado:

- Usa `import.meta.env.VITE_SUPABASE_URL`.
- Usa `import.meta.env.VITE_SUPABASE_ANON_KEY`.
- Nao usa `DATABASE_URL`.
- Nao usa `DIRECT_URL`.
- Nao usa service role key.

## Operacoes de Listas

Arquivo: `src/services/listApi.ts`

Status: usa Supabase diretamente.

Tabela: `shopping_lists`

Operacoes:

- `getLists`: `supabase.from("shopping_lists").select(...)`
- `getList`: `supabase.from("shopping_lists").select(...)`
- `createList`: `supabase.from("shopping_lists").insert(...)`
- `updateList`: `supabase.from("shopping_lists").update(...)`
- `deleteList`: `supabase.from("shopping_lists").delete(...)`

Nao foram encontradas chamadas `fetch("/api/lists")` no frontend.

## Operacoes de Produtos

Arquivo: `src/services/productApi.ts`

Status: usa Supabase diretamente.

Tabela: `products`

Operacoes:

- `getProducts`: `supabase.from("products").select(...)`
- `createProduct`: `supabase.from("products").insert(...)`
- `updateProduct`: `supabase.from("products").update(...)`
- `deleteProduct`: `supabase.from("products").delete(...)`
- `togglePurchased`: `supabase.from("products").update(...)`

Tambem cria historico automaticamente em `price_history` quando ha preco valido.

Nao foram encontradas chamadas `fetch("/api/products")` no frontend.

## Operacoes de Historico

Arquivo: `src/services/priceHistoryApi.ts`

Status: usa Supabase diretamente.

Tabela: `price_history`

Operacoes:

- `getPriceHistory`: `supabase.from("price_history").select(...)`
- `createPriceHistory`: `supabase.from("price_history").insert(...)`
- `deletePriceHistory`: `supabase.from("price_history").delete(...)`

Nao foram encontradas chamadas `fetch("/api/price-history")` no frontend.

## Telas e Fluxos

| Tela/Fluxo | Fonte atual | Status |
| --- | --- | --- |
| Login | Supabase Auth quando configurado; fallback local se nao configurado | Parcialmente Supabase |
| Cadastro de conta | Supabase Auth quando configurado; fallback local se nao configurado | Parcialmente Supabase |
| Recuperacao de senha | Supabase Auth reset por e-mail quando configurado; fallback local se nao configurado | Parcialmente Supabase |
| Logout | Supabase Auth quando configurado; tambem limpa estado local | Parcialmente Supabase |
| Home | Renderiza produtos carregados para estado local a partir do Supabase | Supabase como origem, estado local como cache |
| Listas cadastradas | CRUD via Supabase Client; renderizacao via estado local sincronizado | Supabase como origem, estado local como cache |
| Tela interna da lista | CRUD de produtos via Supabase Client; renderizacao via estado local sincronizado | Supabase como origem, estado local como cache |
| Historico | Carrega `price_history` via Supabase Client; renderiza estado local sincronizado | Supabase como origem, estado local como cache |
| Dashboard | Usa historico/produtos sincronizados do Supabase no estado local | Supabase como origem, estado local como cache |
| Passkeys/biometria | Armazenamento atual em `localStorage` | Ainda local |
| Tema claro/escuro | `localStorage` | Ainda local |
| Listas compartilhadas | `list_shares` + `shopping_lists` via Supabase Client | Supabase direto |

## Dependencias de localStorage Encontradas

Arquivos:

- `src/App.tsx`
- `src/storage.ts`

Usos:

- `loadDatabase()` inicializa `database` a partir da chave `app-supermarket-db-v2`.
- `saveDatabase(database)` grava o estado local na chave `app-supermarket-db-v2`.
- `getUserData(database, currentUser.uid)` filtra dados renderizados por usuario.
- Tema usa `app-supermarket-theme`.
- Passkeys continuam no objeto local `database.passkeys`.

Conclusao: o app ainda depende de `localStorage` como cache/estado e para recursos locais. As operacoes remotas principais usam Supabase quando as variaveis publicas estao configuradas.

## Dependencia de API Prisma no Frontend

Busca por `fetch(`, `/api/lists`, `/api/products` e `/api/price-history` em `src` nao encontrou chamadas frontend para as APIs Prisma.

Prisma continua existente apenas em:

- `src/server/**`
- `api/**`
- `prisma/**`

Conclusao: listas, produtos e historico no frontend nao dependem mais da API Prisma.

## Pronto para 100% Supabase?

Sim para dados de negocio, desde que as migrations e policies estejam aplicadas no Supabase.

Pronto parcialmente:

- Supabase Client esta configurado corretamente.
- CRUD principal de listas usa Supabase.
- CRUD principal de produtos usa Supabase.
- Historico usa Supabase.
- Supabase Auth esta integrado quando as variaveis publicas existem.

Pendencias para 100% Supabase:

1. Remover `localStorage` como fonte/cache de `database` ou restringir somente a modo offline explicito.
2. Persistir passkeys em `passkey_credentials` com fluxo compativel com Supabase Auth.
3. Garantir que o app bloqueie fallback local em producao se `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` estiverem ausentes.
4. Aplicar migrations e RLS antes do deploy produtivo.

## Recomendacao

Nao declarar ainda o app como 100% conectado ao Supabase. Ele esta pronto para testar CRUD principal com Supabase, desde que:

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estejam configuradas na Vercel.
- A migration snake_case tenha sido aplicada.
- O SQL de RLS tenha sido aplicado.
- Supabase Auth esteja habilitado no projeto.

## Pronto para teste manual

Status: sim, para dados de negocio principais.

O app pode ser testado manualmente com Supabase direto para:

- login/cadastro via Supabase Auth;
- criacao, edicao e exclusao de listas;
- criacao, edicao inline, marcar/desmarcar comprado e exclusao de produtos;
- geracao automatica de historico de precos;
- leitura de historico e dashboard.
- relatorios e totalizadores baseados nos produtos/historico remotos.

Condicoes obrigatorias:

- aplicar `prisma/migrations/20260605183000_snake_case_columns_for_supabase_client/migration.sql`;
- aplicar `docs/supabase-direct-client-rls.sql`;
- configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`;
- fazer novo deploy apos configurar variaveis;
- validar com `docs/direct-supabase-crud-test-checklist.md`.
- manter `VITE_ENABLE_LOCAL_FALLBACK=false` para impedir carga de dados de negocio do `localStorage`.

## Ainda nao pronto para producao 100% Supabase

Status: pronto para dados de negocio apos aplicar migration/RLS e validar manualmente.

Motivo: dados de negocio usam Supabase Client diretamente, incluindo o modelo remoto de compartilhamento. Ainda existem recursos auxiliares locais permitidos: tema e passkeys locais por dispositivo.

Antes de declarar producao 100% Supabase sem ressalvas:

1. Migrar passkeys para `passkey_credentials` ou documentar passkeys como recurso local por dispositivo.
2. Manter `VITE_ENABLE_LOCAL_FALLBACK=false` em producao.
3. Remover APIs Prisma antigas do runtime publico, se nao forem mais necessarias.
4. Validar isolamento de usuarios com RLS em producao.

## Dependencias restantes de localStorage

Chaves e usos:

- `app-supermarket-db-v2`: cache/estado local de usuarios, listas, produtos, historico e passkeys.
- `app-supermarket-theme`: tema claro/escuro.

Observacoes apos estabilizacao:

- Com `VITE_ENABLE_LOCAL_FALLBACK=false`, a inicializacao nao carrega listas, produtos ou historico do `localStorage`.
- Quando Supabase esta configurado, a sessao precisa vir do Supabase Auth.
- As operacoes principais remotas atualizam estado em memoria para renderizacao.
- Ao recarregar a pagina, listas, produtos e historico sao buscados novamente do Supabase para o usuario autenticado.
- `saveDatabase()` persiste apenas snapshot sanitizado sem listas, produtos e historico quando fallback local esta desligado.

## Status para producao de dados de negocio

Pode ser considerado pronto para producao dos dados de negocio principais apos validacao manual em preview/producao:

- cadastro aparece em `Supabase Authentication > Users`;
- profile aparece em `profiles`;
- lista aparece em `shopping_lists`;
- produto aparece em `products`;
- alteracao de preco aparece em `price_history`;
- limpar `localStorage` do navegador nao apaga dados remotos;
- recarregar a pagina busca dados novamente pelo Supabase.

Nao considerar pronto para producao 100% Supabase dos recursos auxiliares ate migrar:

- listas compartilhadas;
- passkeys remotas/server-side.

## Compartilhamento Remoto

Status: implementado via Supabase.

Componentes:

- tabela `list_shares`;
- service `src/services/shareApi.ts`;
- UI `Compartilhar lista` na edicao da lista;
- secao `Outras listas` carregando listas compartilhadas pelo Supabase;
- RLS para owner, viewer e editor;
- dashboard e historico considerando listas compartilhadas.

Arquivos de apoio:

- `prisma/migrations/20260610120000_add_remote_list_shares/migration.sql`;
- `docs/supabase-direct-client-rls.sql`;
- `docs/shared-lists-supabase-report.md`.
