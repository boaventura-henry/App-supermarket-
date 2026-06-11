# Supabase Screen Data Source Audit

Data: 2026-06-10

## Regra Atual

O app usa Supabase diretamente via `@supabase/supabase-js` quando as variaveis abaixo existem:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Com `VITE_ENABLE_LOCAL_FALLBACK=false`, o app nao carrega listas, produtos ou historico de `app-supermarket-db-v2`. O `localStorage` permanece permitido para:

- tema claro/escuro;
- cache minimo de usuarios/passkeys locais;
- passkeys locais ainda nao migradas;
- fallback manual quando `VITE_ENABLE_LOCAL_FALLBACK=true`.

## Tabela De Fontes Por Tela/Funcionalidade

| Tela/Funcionalidade | Fonte atual | Arquivos principais | Status |
| --- | --- | --- | --- |
| Login | Supabase Auth | `src/services/authService.ts`, `src/App.tsx` | Supabase direto |
| Cadastro de usuario | Supabase Auth + `profiles` | `src/services/authService.ts` | Supabase direto |
| Recuperacao de senha | Supabase Auth reset por e-mail | `src/services/authService.ts` | Supabase direto |
| Logout | Supabase Auth | `src/services/authService.ts` | Supabase direto |
| Restauracao de sessao | `getSession` + `onAuthStateChange` | `src/services/authService.ts`, `src/App.tsx` | Supabase direto |
| Home | Produtos carregados do Supabase para estado em memoria | `src/services/productApi.ts`, `src/App.tsx` | Supabase como fonte principal |
| Listas | `shopping_lists` | `src/services/listApi.ts` | Supabase direto |
| Cadastro de lista | `shopping_lists.insert` | `src/services/listApi.ts` | Supabase direto |
| Edicao de lista | `shopping_lists.update` | `src/services/listApi.ts` | Supabase direto |
| Exclusao de lista | `shopping_lists.delete` | `src/services/listApi.ts` | Supabase direto |
| Tela interna da lista | `products` por `list_id` | `src/services/productApi.ts` | Supabase direto |
| Cadastro de produto | `products.insert` | `src/services/productApi.ts` | Supabase direto |
| Edicao inline de produto | `products.update` | `src/services/productApi.ts` | Supabase direto |
| Exclusao de produto | `products.delete` | `src/services/productApi.ts` | Supabase direto |
| Marcar/desmarcar comprado | `products.update({ purchased })` | `src/services/productApi.ts` | Supabase direto |
| Limpar campos | `products.update` em lote | `src/App.tsx`, `src/services/productApi.ts` | Supabase direto |
| Historico de precos | `price_history` | `src/services/priceHistoryApi.ts` | Supabase direto |
| Geracao automatica de historico | `price_history.insert` ao criar/alterar preco valido | `src/services/productApi.ts` | Supabase direto |
| Dashboard | `price_history` e produtos remotos sincronizados em memoria | `src/services/priceHistoryApi.ts`, `src/services/productApi.ts`, `src/App.tsx` | Supabase como fonte principal |
| Relatorios/graficos | Dados remotos carregados para estado em memoria | `src/App.tsx` | Supabase como fonte principal |
| Totalizadores da lista | Produtos remotos carregados para estado em memoria | `src/App.tsx` | Supabase como fonte principal |
| Outras listas/listas compartilhadas | `list_shares` + `shopping_lists` | `src/services/shareApi.ts`, `src/services/listApi.ts`, `src/App.tsx` | Supabase direto |
| Passkeys/biometria | `localStorage`/WebAuthn local | `src/webauthn.ts`, `src/App.tsx` | Local documentado |
| Tema claro/escuro | `localStorage` | `src/App.tsx` | Local permitido |

## Pontos Migrados Nesta Etapa

- `VITE_ENABLE_LOCAL_FALLBACK=false` passa a impedir carga de dados de negocio do `localStorage`.
- `saveDatabase()` grava somente snapshot sanitizado sem listas, produtos e historico quando fallback local esta desligado.
- Recarregar a pagina exige sessao Supabase e busca listas/produtos/historico novamente do Supabase.
- Produtos de todas as listas do usuario sao carregados do Supabase para Home/Dashboard/relatorios.
- O painel `VITE_DEBUG_SUPABASE=true` mostra fonte de dados, tela atual, operacao/tabela Supabase e erros sem expor secrets.

## Dependencias Locais Restantes

Nao criticas:

- Tema claro/escuro em `localStorage`.
- Passkeys locais por dispositivo, sem armazenamento de biometria.
- Cache minimo/snapshot sanitizado para compatibilidade.

## Nao Encontrado No Frontend

- Uso de Prisma Client.
- Uso de `DATABASE_URL`.
- Uso de `DIRECT_URL`.
- Uso de service role key.
- Chamadas frontend para `/api/lists`, `/api/products` ou `/api/price-history`.

## Conclusao

O app pode ser considerado migrado para Supabase direto nos dados de negocio principais:

- autenticacao;
- profiles;
- listas;
- produtos;
- historico;
- dashboard;
- relatorios derivados de produtos/historico.

Com o modelo `list_shares`, o app fica 100% Supabase para dados de negocio: auth, profiles, listas, compartilhamentos, produtos, historico, dashboard e relatorios.

Passkeys continuam locais por dispositivo e estao documentadas como recurso auxiliar de autenticacao, nao como dado de negocio.
