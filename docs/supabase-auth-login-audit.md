# Supabase Auth Login Audit

Data: 2026-06-11

## Objetivo

Auditar e corrigir o fluxo de cadastro/login para garantir que cadastro, login, logout e restauracao de sessao usem a mesma fonte: Supabase Auth.

## Causa Encontrada

O fluxo principal de cadastro e login ja usava Supabase Auth:

- Cadastro: `supabase.auth.signUp`
- Login: `supabase.auth.signInWithPassword`
- Logout: `supabase.auth.signOut`
- Sessao: `supabase.auth.getSession` e `onAuthStateChange`

Nao foi encontrado login por senha usando `localStorage`, `app-supermarket-db-v2`, `passwordHash`, `securityAnswerHash` ou array local `users`.

O ponto mais fragil encontrado era a comunicacao do erro de login/cadastro: erros comuns do Supabase, como credenciais invalidas ou e-mail nao confirmado, podiam chegar pouco claros para o usuario e causar a percepcao de que o app estava procurando em outra fonte.

## Cadastro

Arquivo principal:

```text
src/services/authService.ts
```

Fluxo validado:

1. `signUp(name, email, password)` chama `supabase.auth.signUp`.
2. O e-mail e normalizado para lowercase.
3. O nome e enviado em `options.data.name`.
4. Se Supabase retornar sessao, `ensureProfile` cria/atualiza `profiles`.
5. Se Supabase exigir confirmacao de e-mail, o app informa que o usuario precisa confirmar antes de entrar.

Mensagem atual quando ha confirmacao de e-mail:

```text
Conta criada. Verifique seu e-mail para confirmar o cadastro antes de entrar.
```

Resultado esperado no Supabase:

- O usuario aparece em `Authentication > Users`.
- O profile aparece em `profiles` quando ha sessao no cadastro ou no primeiro login confirmado.

## Login

Arquivos principais:

```text
src/App.tsx
src/services/authService.ts
```

Fluxo validado:

1. `handleLogin(email, password)` normaliza o e-mail.
2. Chama `signIn(normalizedEmail, password)`.
3. `signIn` chama `supabase.auth.signInWithPassword`.
4. Depois do sucesso, `ensureProfile` cria/atualiza o profile.
5. O usuario ativo em memoria passa a usar `user.id` do Supabase Auth.
6. Listas, produtos e historico sao carregados do Supabase usando esse `user.id`.

Nao foi encontrado:

- comparacao local de senha;
- busca em `profiles` antes de autenticar;
- autenticacao por `database.users`;
- autenticacao por `app-supermarket-db-v2`.

## Logout

Fluxo validado:

- `logout()` chama `signOut()`.
- `signOut()` chama `supabase.auth.signOut`.
- O estado em memoria remove `activeUserId`.
- Dados remotos nao sao apagados.

## Profiles

Regra validada no codigo:

- `profiles.id` usa o mesmo valor de `user.id` do Supabase Auth.
- `profiles.email` vem do usuario autenticado.
- `profiles.name` vem do metadata `name`, fallback informado ou prefixo do e-mail.
- `profiles.updated_at` e atualizado em `ensureProfile`.

Se o profile nao existir no login, `ensureProfile` faz `upsert`.

## RLS

Arquivo:

```text
docs/supabase-direct-client-rls.sql
```

Policies relevantes:

- `profiles_insert_own`: permite inserir quando `id = auth.uid()`.
- `profiles_update_own`: permite atualizar quando `id = auth.uid()`.
- `profiles_select_own`: permite leitura autenticada. Atualmente esta permissiva (`using (true)`) porque o app precisa pesquisar profiles por e-mail para compartilhamento de listas.

Observacao:

- `profiles` nao e fonte de autenticacao.
- Supabase Auth e a unica fonte de login por e-mail/senha.

## Correcoes Realizadas

Arquivos alterados:

```text
src/App.tsx
src/services/authService.ts
docs/supabase-auth-login-audit.md
```

Mudancas:

- Mensagem de cadastro com confirmacao de e-mail ficou explicita.
- Erros comuns de Supabase Auth agora sao traduzidos para mensagens amigaveis:
  - e-mail nao confirmado;
  - e-mail ou senha incorretos;
  - conta ja existente;
  - falha de conexao;
  - rate limit em recuperacao.
- O diagnostico no console mantem operacao, mensagem amigavel, mensagem original do Supabase, `code`, `details` e `hint`.
- Nenhuma senha e registrada em console.

## Uso De LocalStorage

`localStorage` continua permitido apenas para:

- tema;
- cache/snapshot nao critico;
- passkeys locais por dispositivo.

Nao e usado para autenticar usuario por e-mail/senha.

## Testes Executados

Validacoes tecnicas:

```bash
npm run lint
npm run build
npm exec -- prisma validate
```

## Testes Manuais Recomendados

1. Criar um usuario novo pelo app.
2. Confirmar que aparece em `Supabase > Authentication > Users`.
3. Se confirmacao de e-mail estiver ativa, confirmar e-mail antes do login.
4. Fazer login com o mesmo e-mail/senha.
5. Confirmar que `profiles` foi criado/atualizado.
6. Fazer logout.
7. Recarregar a pagina e confirmar restauracao de sessao quando aplicavel.
8. Tentar senha incorreta e conferir mensagem amigavel.
9. Tentar e-mail inexistente e conferir mensagem amigavel.

## Pendencias

- Validar no painel do Supabase se a confirmacao de e-mail esta ativa no projeto.
- Se quiser profile imediato mesmo quando confirmacao de e-mail estiver ativa, criar trigger server-side em Supabase Auth para inserir em `profiles`. Isso nao foi implementado nesta etapa.
