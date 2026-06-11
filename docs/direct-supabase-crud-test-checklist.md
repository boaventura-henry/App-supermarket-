# Direct Supabase CRUD Test Checklist

Data: 2026-06-09

## Objetivo

Validar manualmente o CRUD principal do SuperList usando Supabase Client direto no frontend antes de remover o `localStorage`.

## Pre-requisitos

- `VITE_SUPABASE_URL` configurada na Vercel.
- `VITE_SUPABASE_ANON_KEY` configurada na Vercel.
- Supabase Auth habilitado.
- Migration snake_case aplicada:
  - `prisma/migrations/20260605183000_snake_case_columns_for_supabase_client/migration.sql`
- RLS aplicado:
  - `docs/supabase-direct-client-rls.sql`
- Deploy novo feito depois da configuracao das variaveis.
- Opcional para teste visual:
  - `VITE_DEBUG_SUPABASE=true`

## Dependencias de Banco

Tabelas esperadas:

- `profiles`
- `shopping_lists`
- `products`
- `price_history`
- `passkey_credentials`

Colunas snake_case esperadas:

- `legacy_id`
- `user_id`
- `list_id`
- `unit_price`
- `sort_order`
- `created_at`
- `updated_at`
- `product_id`
- `product_name`
- `credential_id`
- `public_key`
- `device_name`

## Testes de Autenticacao

1. Criar uma nova conta pelo app.
2. Confirmar e-mail, se o Supabase Auth exigir confirmacao.
3. Fazer login com e-mail e senha.
4. Conferir no Table Editor se existe registro em `profiles` com:
   - `id` igual ao UID do Supabase Auth;
   - `email` correto;
   - `name` correto.
5. Fazer logout.
6. Fazer login novamente.
7. Validar que o app recarrega listas do Supabase.

Resultado esperado:

- O login usa Supabase Auth.
- O app nao usa usuario local antigo quando Supabase esta configurado.

## Testes de Listas

1. Criar uma lista com nome e cor.
2. Conferir no Table Editor:
   - tabela `shopping_lists`;
   - `user_id` igual ao usuario autenticado;
   - `name` e `color` corretos.
3. Editar nome/cor da lista.
4. Recarregar a pagina.
5. Confirmar que a lista editada volta do Supabase.
6. Excluir a lista.
7. Recarregar a pagina.
8. Confirmar que a lista excluida nao volta.

Resultado esperado:

- `createList`, `updateList` e `deleteList` usam Supabase Client direto.
- `localStorage` pode manter cache, mas nao deve recriar lista excluida no Supabase.

## Testes de Produtos

1. Criar uma lista de teste.
2. Criar produto informando apenas nome.
3. Conferir em `products`:
   - `name` correto;
   - `quantity` nulo;
   - `unit_price` nulo;
   - `user_id` correto;
   - `list_id` correto;
   - `sort_order` preenchido.
4. Criar produto com nome, marca, quantidade, valor unitario e supermercado.
5. Editar inline:
   - quantidade;
   - valor unitario;
   - marca;
   - supermercado.
6. Clicar em gravar.
7. Recarregar a pagina.
8. Confirmar que os valores voltam do Supabase.
9. Marcar produto como comprado.
10. Confirmar que ele vai para o fim da lista.
11. Desmarcar produto.
12. Confirmar que ele retorna para a posicao original.
13. Excluir produto.
14. Recarregar a pagina.
15. Confirmar que o produto excluido nao volta.

Resultado esperado:

- `products.purchased` muda corretamente.
- `products.sort_order` preserva ordem original.
- A coluna valor total continua calculada no frontend.
- A coluna nome produto congelada continua funcionando.

## Testes de Historico de Precos

1. Criar produto com `unit_price` maior que zero.
2. Conferir em `price_history` se foi criado registro com:
   - `user_id`;
   - `list_id`;
   - `product_id`;
   - `product_name`;
   - `price`;
   - `quantity`, quando informada.
3. Editar produto e alterar `unit_price` para outro valor maior que zero.
4. Confirmar novo registro em `price_history`.
5. Salvar produto sem alterar valor unitario.
6. Confirmar que nao houve duplicacao indevida.

Resultado esperado:

- Historico e gerado automaticamente quando preco valido e criado/alterado.
- Historico nao duplica quando o mesmo preco e salvo novamente.

## Testes de Dashboard

1. Criar dois ou mais registros de historico para o mesmo produto.
2. Abrir Dashboard.
3. Filtrar por produto.
4. Filtrar por supermercado.
5. Validar grafico/analise de variacao mensal.
6. Comparar dados exibidos com `price_history` no Table Editor.

Resultado esperado:

- Dashboard usa dados sincronizados de `price_history`.
- Dados exibidos pertencem somente ao usuario autenticado.

## Testes de Isolamento/RLS

1. Criar usuario A.
2. Criar lista/produtos/historico com usuario A.
3. Fazer logout.
4. Criar usuario B.
5. Confirmar que usuario B nao ve dados do usuario A.
6. No Table Editor, confirmar que os registros tem `user_id` diferentes.

Resultado esperado:

- Usuario so le e altera os proprios dados.
- RLS bloqueia acesso cruzado.

## Diagnostico Visual

Com `VITE_DEBUG_SUPABASE=true` ou em ambiente de desenvolvimento, o app mostra um painel discreto com:

- fonte de dados;
- usuario atual;
- quantidade de listas carregadas;
- ultimo erro Supabase.

O painel nao exibe secrets, tokens ou anon key.

## Criterio de Aprovacao

O CRUD principal pode ser considerado pronto para teste amplo quando:

- todos os testes acima passarem;
- dados aparecerem no Table Editor;
- recarregar a pagina nao restaurar registros excluidos;
- usuarios diferentes nao enxergarem dados uns dos outros;
- nenhum erro Supabase aparecer no painel de diagnostico.
