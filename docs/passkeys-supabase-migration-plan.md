# Passkeys Supabase Migration Plan

Data: 2026-06-10

## Estado Atual

As passkeys/biometria continuam locais por dispositivo.

Arquivos principais:

- `src/webauthn.ts`
- `src/App.tsx`
- `src/types.ts`
- `src/storage.ts`

Fluxo atual:

- O app detecta suporte a WebAuthn/Passkeys no navegador.
- O cadastro da passkey usa `navigator.credentials.create`.
- O login biometrico usa `navigator.credentials.get`.
- O challenge e gerado no frontend porque o app ainda nao possui um backend WebAuthn responsavel por emitir e validar challenges.
- O app salva apenas metadados publicos da credencial no estado local, incluindo `id`, `rawId`, `userId`, `email`, `label`, `createdAt` e `lastUsedAt`.
- Nenhuma biometria e armazenada pelo app.

Limitacao atual:

- Como o challenge e local e nao existe verificacao server-side da assinatura, o fluxo e util como conveniencia local do dispositivo, mas nao deve ser tratado como autenticacao WebAuthn completa de producao.

## Tabela Disponivel

O schema Prisma ja possui a tabela futura:

```text
passkey_credentials
```

Campos atuais no schema:

- `id`
- `legacy_id`
- `user_id`
- `credential_id`
- `public_key`
- `counter`
- `device_name`
- `created_at`
- `updated_at`

RLS ja esta documentado em:

```text
docs/supabase-direct-client-rls.sql
```

## Estado Desejado

Para passkeys remotas de producao, o app deve usar um backend confiavel para WebAuthn.

Fluxo desejado de cadastro:

1. Frontend solicita ao backend opcoes de registro.
2. Backend gera challenge temporario e associa ao usuario Supabase Auth.
3. Frontend chama `navigator.credentials.create`.
4. Frontend envia attestation ao backend.
5. Backend valida a attestation.
6. Backend grava em `passkey_credentials`:
   - `user_id`
   - `credential_id`
   - `public_key`
   - `counter`
   - `device_name`
7. Frontend mostra sucesso sem armazenar dados sensiveis.

Fluxo desejado de login:

1. Frontend solicita opcoes de autenticacao ao backend.
2. Backend gera challenge temporario.
3. Frontend chama `navigator.credentials.get`.
4. Frontend envia assertion ao backend.
5. Backend valida assinatura, origin, rpId e counter.
6. Backend cria uma sessao segura compatível com Supabase Auth ou troca a validacao por um fluxo de autenticacao suportado.

## Mudancas Necessarias

- Criar endpoints serverless para:
  - iniciar registro de passkey;
  - concluir registro de passkey;
  - iniciar login com passkey;
  - concluir login com passkey;
  - listar/remover credenciais do usuario autenticado.
- Adicionar uma biblioteca WebAuthn server-side, por exemplo `@simplewebauthn/server`.
- Definir armazenamento temporario de challenges com expiracao.
- Validar `origin`, `rpId`, `userVerification`, `counter` e `credentialId`.
- Migrar os metadados locais atuais para `passkey_credentials`, se for preciso preservar dispositivos ja cadastrados.
- Ajustar UI para diferenciar:
  - passkey local legada;
  - passkey remota validada pelo backend.

## Riscos

- Frontend-only WebAuthn nao valida assinatura de forma confiavel.
- Challenges locais podem dar falsa sensacao de seguranca.
- Passkeys sao sensiveis ao dominio/origin; mudanca de dominio Vercel/custom domain pode exigir novo cadastro.
- Counters precisam ser atualizados no backend para reduzir risco de replay/clonagem.
- Supabase Auth nao deve ser contornado com uma sessao artesanal sem desenho de seguranca.
- A anon key nunca deve ter permissao ampla sobre `passkey_credentials`.

## Dependencias

- Supabase Auth ativo e estavel.
- RLS aplicada em `passkey_credentials`.
- Backend/API serverless para WebAuthn.
- Variaveis privadas apenas no backend, se algum endpoint precisar de credenciais administrativas.
- Decisao de produto sobre manter ou remover passkeys locais legadas.

## Recomendacao

Nao migrar passkeys no mesmo ciclo do compartilhamento de listas.

Fechar primeiro:

1. Listas compartilhadas remotas com RLS.
2. Teste multiusuario em preview/producao.
3. Confirmacao de que dados de negocio nao dependem mais de `localStorage`.

Depois iniciar uma fase dedicada:

```text
feature/remote-passkeys-webauthn
```

com backend WebAuthn e validacao server-side completa.
