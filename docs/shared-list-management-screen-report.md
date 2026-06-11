# Shared List Management Screen Report

Data: 2026-06-11

## Objetivo

Criar uma tela no menu do SuperList para gerenciar compartilhamentos remotos de listas entre usuarios cadastrados no Supabase.

## Tela Criada

Menu lateral:

```text
Compartilhamentos
```

Tela:

```text
ShareListsScreen
```

Local:

```text
src/App.tsx
```

Funcionalidades:

- seleciona uma lista propria do usuario logado;
- carrega usuarios cadastrados na tabela `profiles`;
- oculta o proprio usuario logado;
- permite marcar/desmarcar acesso por usuario;
- permite definir permissao `viewer` ou `editor`;
- cria ou atualiza registros em `list_shares`;
- remove registros de `list_shares`;
- mostra feedback de sucesso/erro por operacao.

## Services Alterados

Arquivo:

```text
src/services/shareApi.ts
```

Novo metodo:

```text
getShareableProfiles(identity)
```

Responsabilidade:

- buscar usuarios em `profiles`;
- excluir o usuario logado;
- nao acessar `auth.users`;
- nao usar service role key;
- retornar apenas `id`, `name` e `email`.

Services ja existentes reutilizados:

- `shareListWithUser`
- `updateListSharePermission`
- `removeListShare`
- `getSharedLists`
- `getListShares`

## Outras Listas

A tela "Outras listas" continua usando `list_shares` via Supabase direto.

Ajuste visual:

- cards de listas compartilhadas agora exibem a permissao recebida:
  - `Visualizador`
  - `Editor`

## Diagnostico

Quando `VITE_DEBUG_SUPABASE=true` ou em desenvolvimento, o painel de diagnostico exibe:

- tela atual;
- usuario autenticado;
- fonte de dados;
- ultima operacao Supabase;
- tabela Supabase envolvida;
- lista selecionada na tela de compartilhamentos;
- quantidade de usuarios carregados;
- quantidade de compartilhamentos da lista selecionada;
- ultimo erro Supabase.

Nenhum token, anon key, service role key ou secret e exibido.

## RLS

Arquivo revisado:

```text
docs/supabase-direct-client-rls.sql
```

Policies relevantes para `list_shares`:

- owner pode selecionar compartilhamentos da propria lista;
- usuario compartilhado pode selecionar o proprio compartilhamento;
- owner pode inserir compartilhamento;
- owner pode atualizar permissao;
- owner pode remover compartilhamento;
- insert/update validam `permission in ('viewer', 'editor')`;
- insert/update bloqueiam compartilhamento consigo mesmo.

Policies relevantes para listas/produtos:

- shared user pode ler listas compartilhadas;
- viewer pode ler produtos;
- editor pode inserir/alterar produtos conforme policies existentes;
- owner continua controlando a propria lista.

Observacao:

- `profiles_select_own` permanece permissiva com `using (true)` para permitir pesquisa/listagem de usuarios pelo app sem acessar `auth.users`. Essa decisao deve ser revisada se o produto exigir privacidade forte de diretorio de usuarios.

## Testes Recomendados

1. Usuario A cria uma lista.
2. Usuario B existe em `profiles`.
3. Usuario A abre `Compartilhamentos`.
4. Usuario A seleciona a lista.
5. Usuario A marca Usuario B como `Visualizador`.
6. Confirmar registro em `list_shares`.
7. Usuario B entra no app.
8. Usuario B abre `Outras listas`.
9. Confirmar lista visivel em modo somente leitura.
10. Usuario A altera Usuario B para `Editor`.
11. Usuario B consegue editar produtos permitidos pela RLS.
12. Usuario A remove o compartilhamento.
13. Usuario B deixa de ver a lista.

## Limitacoes Conhecidas

- A tela lista usuarios a partir de `profiles`; usuarios sem profile nao aparecem ate o profile ser criado no login/cadastro.
- O app nao acessa `auth.users` diretamente no frontend.
- Regras definitivas dependem das policies aplicadas no Supabase SQL Editor.

## Status

Compartilhamento pode ser gerenciado pelo app usando Supabase direto, desde que:

- migration `list_shares` esteja aplicada;
- RLS de `docs/supabase-direct-client-rls.sql` esteja aplicada;
- profiles dos usuarios existam;
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estejam configuradas no deploy.
