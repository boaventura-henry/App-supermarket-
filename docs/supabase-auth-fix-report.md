# Supabase Auth Fix Report

Data: 2026-06-10

## Problema

O cadastro publicado podia nao aparecer em `Supabase > Authentication > Users` porque o app ainda mantinha um caminho de fallback local para cadastro/login quando `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` nao estavam disponiveis no bundle. Nesse caso, o usuario era criado apenas no `localStorage` (`app-supermarket-db-v2`) e nunca passava por `supabase.auth.signUp`.

## Causa Encontrada

- `src/App.tsx` ainda possuia fluxo local com hash de senha para login/cadastro/recuperacao.
- Se `isSupabaseConfigured` fosse `false`, o cadastro criava `User` local.
- A sessao era restaurada com `getUser`, mas ainda nao havia assinatura explicita de `onAuthStateChange`.
- Erros de Auth/Profile nao registravam `code`, `details` e `hint` de forma estruturada.

## Correcoes Realizadas

Arquivos principais:

- `src/services/authService.ts`
- `src/App.tsx`
- `src/vite-env.d.ts`
- `docs/supabase-auth-fix-report.md`

Alteracoes:

- `signUp` chama `supabase.auth.signUp({ email, password, options })`.
- `signIn` chama `supabase.auth.signInWithPassword({ email, password })`.
- `signOut` chama `supabase.auth.signOut()`.
- `getCurrentSession` usa `supabase.auth.getSession()`.
- `getCurrentUser` restaura usuario autenticado e garante profile.
- `onAuthStateChange` assina mudancas de sessao.
- Cadastro local foi removido do fluxo de UI.
- Login local foi removido do fluxo de UI.
- Recuperacao local por pergunta de seguranca foi removida do fluxo de UI.
- Se Supabase nao estiver configurado, o app mostra erro claro e nao cria usuario local.
- Erros Supabase Auth/Profile sao registrados no console com:
  - `operation`;
  - `message`;
  - `code`;
  - `details`;
  - `hint`.

## Cadastro Local

Status: removido do fluxo de cadastro.

O app ainda pode manter `localStorage` para:

- tema;
- cache temporario;
- passkeys locais;
- dados antigos preservados.

Novo usuario nao deve mais nascer em `app-supermarket-db-v2`; deve nascer via Supabase Auth.

## Profile

Apos cadastro com sessao ativa ou primeiro login bem-sucedido:

- cria/atualiza registro em `profiles`;
- usa `user.id` do Supabase Auth como `profiles.id`;
- usa e-mail do Supabase Auth;
- usa nome informado no cadastro quando disponivel.

Se o profile falhar por RLS ou schema:

- a tela mostra erro amigavel;
- o console registra detalhes Supabase.

## Como Validar No Supabase

1. Publicar novo deploy com esta correcao.
2. Abrir o app publicado.
3. Criar uma conta nova com e-mail nunca usado.
4. Verificar em `Supabase > Authentication > Users`.
5. O usuario deve aparecer imediatamente apos `signUp`.
6. Se confirmacao de e-mail estiver ativa, confirmar o e-mail e fazer login.
7. Verificar em `Table Editor > profiles` se o profile foi criado apos sessao/login.
8. Criar lista e confirmar `shopping_lists.user_id = auth.users.id`.

## Variaveis Obrigatorias

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nao usar no frontend:

- `DATABASE_URL`
- `DIRECT_URL`
- service role key

## Pendencias

- Confirmar que o deploy da Vercel foi refeito depois da configuracao de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Confirmar que a migration snake_case foi aplicada.
- Confirmar que RLS permite `profiles.insert` com `id = auth.uid()`.
- Migrar passkeys locais para `passkey_credentials` em etapa futura, se desejado.
