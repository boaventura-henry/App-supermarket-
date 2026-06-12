# Shared List Business Rule Report

Data: 2026-06-12

## Regra Implementada

Listas compartilhadas devem aparecer somente na tela `Outras listas`.

As telas pessoais do usuario logado usam apenas dados proprios:

- Home
- Dashboard
- Historico
- Relatorios
- Graficos
- Totalizadores gerais

Dados proprios sao definidos como:

- listas com `shopping_lists.user_id = auth.user.id`;
- produtos vinculados a listas proprias e com `products.user_id = auth.user.id`;
- historico com `price_history.user_id = auth.user.id`.

Listas compartilhadas via `list_shares.shared_user_id = auth.user.id` continuam acessiveis na tela `Outras listas`, com permissao `viewer` ou `editor`.

## Telas Afetadas

- `Home`: passa a receber somente produtos proprios do usuario logado.
- `Dashboard`: passa a calcular produtos, compras, totais e graficos somente com dados proprios.
- `Historico`: passa a exibir apenas registros de `price_history` do usuario logado.
- `Lista`: continua exibindo e editando listas proprias normalmente.
- `Outras listas`: continua exibindo listas compartilhadas e carrega produtos compartilhados em fluxo separado.
- `Compartilhar listas`: continua limitada a listas proprias.

## Servicos Ajustados

- `src/services/listApi.ts`
  - `getMyLists()` busca somente listas proprias.
  - `getLists` permanece como alias compatível para `getMyLists`.
  - Listas compartilhadas nao sao mais misturadas no carregamento principal.

- `src/services/priceHistoryApi.ts`
  - `getPriceHistory()` busca somente `price_history.user_id = auth.user.id`.
  - Historico de listas compartilhadas nao e mais agregado.

- `src/App.tsx`
  - `getPersonalRemoteData()` filtra listas, produtos e historico proprios.
  - Listas compartilhadas sao carregadas separadamente via `getSharedLists`.
  - Produtos de listas compartilhadas sao carregados apenas quando a tela `Outras listas` esta aberta.
  - Painel de debug mostra escopo atual, quantidade de listas proprias, listas compartilhadas e produtos proprios usados no dashboard.

## Testes Manuais Recomendados

1. Usuario A cria uma lista propria com produtos.
2. Usuario B cria uma lista propria com produtos.
3. Usuario A compartilha a lista com Usuario B.
4. Usuario B acessa `Outras listas` e visualiza a lista compartilhada.
5. Usuario B abre a lista compartilhada e confere permissao `viewer` ou `editor`.
6. Usuario B acessa `Home` e confirma que os produtos da lista compartilhada nao entram no resumo.
7. Usuario B acessa `Dashboard` e confirma que produtos/totais/graficos nao incluem a lista compartilhada.
8. Usuario B acessa `Historico` e confirma que registros da lista compartilhada nao aparecem.
9. Usuario B confirma que sua lista propria continua aparecendo em Home, Dashboard e Historico.

## Limitacoes Conhecidas

- O estado em memoria ainda pode guardar listas/produtos compartilhados para renderizar a tela `Outras listas`, mas os seletores pessoais filtram esses dados antes de alimentar Home/Dashboard/Historico.
- Historico pessoal segue a regra preferencial `price_history.user_id = auth.user.id`.
- Nenhuma migration, policy RLS ou tabela Supabase foi alterada nesta mudanca.
