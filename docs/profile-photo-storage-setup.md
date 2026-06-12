# Profile Photo Storage Setup

Data: 2026-06-12

## Objetivo

Habilitar foto de perfil no SuperList usando Supabase Storage e a tabela `profiles`.

## Migration Necessaria

Aplicar a migration:

```text
prisma/migrations/20260612100000_add_profile_avatar_fields/migration.sql
```

SQL:

```sql
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "avatar_url" TEXT,
ADD COLUMN IF NOT EXISTS "avatar_path" TEXT;
```

Campos usados pelo frontend:

- `profiles.avatar_url`
- `profiles.avatar_path`

## Bucket Supabase Storage

Bucket esperado:

```text
profile-photos
```

Configuracao recomendada:

- Public bucket: `true`
- Tipos aceitos pelo app: JPG, PNG, WEBP
- Tamanho maximo validado no frontend: 5 MB
- Caminho usado pelo app:

```text
profiles/{userId}/avatar.{jpg|png|webp}
```

## SQL de RLS/Storage

Arquivo atualizado:

```text
docs/supabase-direct-client-rls.sql
```

Policies adicionadas:

- `profile_photos_select_authenticated`
- `profile_photos_insert_own`
- `profile_photos_update_own`
- `profile_photos_delete_own`

Essas policies permitem:

- usuario autenticado ler fotos de perfil;
- usuario autenticado enviar a propria foto;
- usuario autenticado sobrescrever/remover somente arquivos dentro de `profiles/{auth.uid()}/`.

## Ordem Segura de Aplicacao

1. Aplicar a migration `20260612100000_add_profile_avatar_fields`.
2. Criar o bucket `profile-photos` no Supabase Storage, ou aplicar o trecho de bucket no SQL.
3. Aplicar novamente `docs/supabase-direct-client-rls.sql`.
4. Fazer login no app.
5. Abrir `Perfil`.
6. Enviar foto.
7. Confirmar que `profiles.avatar_url` e `profiles.avatar_path` foram preenchidos.

## Observacoes

- O frontend usa apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- O frontend nao usa service role key.
- Senhas nao sao salvas em `localStorage`.
- A alteracao de senha reautentica com Supabase Auth antes de chamar `updateUser`.
