# Supabase RLS Checklist

Data: 2026-06-09

## Objetivo

Garantir que a anon key usada pelo frontend so consiga acessar dados do usuario autenticado.

## Arquivo SQL Principal

Aplicar no Supabase SQL Editor:

```text
docs/supabase-direct-client-rls.sql
```

## Tabelas Com RLS Obrigatorio

- `profiles`
- `shopping_lists`
- `products`
- `price_history`
- `passkey_credentials`
- `list_shares`

## Policies Necessarias

### profiles

Operacoes:

- `SELECT`: permitido quando `id = auth.uid()`.
- `INSERT`: permitido quando `id = auth.uid()`.
- `UPDATE`: permitido quando `id = auth.uid()`.

Validacao:

- Usuario autenticado deve conseguir criar/atualizar apenas o proprio perfil.
- Usuario B nao pode ler perfil do usuario A.

### shopping_lists

Operacoes:

- `SELECT`: permitido quando `user_id = auth.uid()` ou a lista foi compartilhada com `auth.uid()`.
- `INSERT`: permitido quando `user_id = auth.uid()`.
- `UPDATE`: permitido quando `user_id = auth.uid()`.
- `DELETE`: permitido quando `user_id = auth.uid()`.

Validacao:

- Usuario autenticado cria, edita e exclui apenas listas proprias.
- Usuario B so ve listas do usuario A quando existir registro em `list_shares`.

### products

Operacoes:

- `SELECT`: permitido quando `user_id = auth.uid()` ou a lista do produto foi compartilhada com `auth.uid()`.
- `INSERT`: permitido quando:
  - a lista pertence ao usuario autenticado; ou
  - o usuario autenticado tem permissao `editor` na lista compartilhada.
- `UPDATE`: permitido para dono ou usuario compartilhado `editor`.
- `DELETE`: permitido para dono ou usuario compartilhado `editor`.

Validacao:

- Usuario nao consegue inserir produto em lista de outro usuario.
- Usuario `viewer` nao consegue editar/excluir produto de outro usuario.

### price_history

Operacoes:

- `SELECT`: permitido quando `user_id = auth.uid()` ou a lista do historico foi compartilhada com `auth.uid()`.
- `INSERT`: permitido quando `user_id = auth.uid()` ou quando o usuario e `editor` da lista compartilhada.
- `DELETE`: permitido quando `user_id = auth.uid()`.

Validacao:

- Historico exibido no Dashboard pertence apenas ao usuario logado.
- Usuario B ve historico da lista do usuario A somente se a lista foi compartilhada.

### passkey_credentials

Operacoes:

- `SELECT`: permitido quando `user_id = auth.uid()`.
- `INSERT`: permitido quando `user_id = auth.uid()`.
- `UPDATE`: permitido quando `user_id = auth.uid()`.
- `DELETE`: permitido quando `user_id = auth.uid()`.

Validacao:

- Quando passkeys forem migradas para Supabase, cada usuario acessa apenas as proprias credenciais.

### list_shares

Operacoes:

- `SELECT`: permitido para dono da lista e usuario compartilhado.
- `INSERT`: permitido somente para dono da lista.
- `UPDATE`: permitido somente para dono da lista.
- `DELETE`: permitido somente para dono da lista.

Validacao:

- Dono consegue compartilhar lista propria por e-mail.
- Dono consegue alterar permissao `viewer`/`editor`.
- Dono consegue remover compartilhamento.
- Usuario compartilhado consegue ver a lista em `Outras listas`.
- Usuario `viewer` acessa somente leitura.
- Usuario `editor` consegue criar/editar produtos, marcar comprado e atualizar valores.

## SQL A Aplicar

O SQL completo esta em:

```text
docs/supabase-direct-client-rls.sql
```

Resumo dos comandos:

```sql
alter table public.profiles enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.products enable row level security;
alter table public.price_history enable row level security;
alter table public.passkey_credentials enable row level security;
alter table public.list_shares enable row level security;
```

Em seguida, aplicar as `create policy` presentes no arquivo SQL.

## Como Validar No Supabase

1. Abrir Supabase Dashboard.
2. Ir em `Authentication > Policies`.
3. Confirmar que RLS esta habilitado nas seis tabelas.
4. Confirmar policies de `SELECT`, `INSERT`, `UPDATE` e `DELETE` conforme a tabela.
5. Criar usuario A pelo app.
6. Criar lista/produtos/historico.
7. Criar usuario B pelo app.
8. Confirmar que usuario B nao ve dados do usuario A.
9. Confirmar no Table Editor que registros de A e B possuem `user_id` diferentes.

## Consultas De Conferencia

Use no SQL Editor somente para diagnostico:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'shopping_lists', 'products', 'price_history', 'passkey_credentials', 'list_shares')
order by tablename;
```

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'shopping_lists', 'products', 'price_history', 'passkey_credentials', 'list_shares')
order by tablename, policyname;
```

## Criterio De Aprovacao

- RLS habilitado nas seis tabelas.
- Policies aplicadas sem erro.
- Usuario A nao acessa dados do usuario B.
- Usuario B nao acessa dados do usuario A.
- App funciona usando apenas anon key no frontend.
- Nenhuma service role key esta configurada no frontend/Vercel com prefixo `VITE_`.
