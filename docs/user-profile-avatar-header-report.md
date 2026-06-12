# User Profile, Avatar and Header Report

Data: 2026-06-12

## Resumo

Foi adicionada a tela `Perfil` para usuario logado e o cabecalho foi reorganizado para o padrao:

- menu no lado esquerdo;
- titulo central `SuperList`;
- avatar/iniciais no lado direito.

## Arquivos Principais

- `src/App.tsx`
- `src/types.ts`
- `src/styles.css`
- `src/services/profileApi.ts`
- `src/services/shareApi.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260612100000_add_profile_avatar_fields/migration.sql`
- `docs/supabase-direct-client-rls.sql`
- `docs/profile-photo-storage-setup.md`

## Tela Perfil

Campos:

- Nome editavel;
- E-mail somente leitura;
- Foto de perfil com upload via Supabase Storage;
- Alterar senha com senha atual, nova senha e confirmacao.

Seguranca:

- senha nao e persistida;
- senha atual e usada apenas para reautenticacao via Supabase Auth;
- frontend usa somente Supabase anon key publica;
- service role key nao e usada.

## Foto de Perfil

Bucket esperado:

```text
profile-photos
```

Campos adicionados em `profiles`:

- `avatar_url`
- `avatar_path`

Migration:

```text
prisma/migrations/20260612100000_add_profile_avatar_fields/migration.sql
```

Setup manual:

```text
docs/profile-photo-storage-setup.md
```

## Outras Listas

Listas compartilhadas passam a carregar dados do dono com:

- nome;
- e-mail;
- foto, quando disponivel.

Se nao houver foto, o card mostra `sem foto`.

## Policies

Arquivo atualizado:

```text
docs/supabase-direct-client-rls.sql
```

Inclui policies para:

- leitura autenticada de fotos;
- upload da propria foto;
- sobrescrita/remocao apenas no caminho `profiles/{auth.uid()}/`.

## Validacoes Executadas

```bash
npm run lint
npm run build
npm exec -- prisma validate
```

Status:

- lint passou;
- build passou;
- Prisma schema valido.

Observacao:

- o build emitiu apenas aviso de tamanho de chunk Vite, sem falhar.

## Testes Manuais Recomendados

1. Abrir app logado.
2. Conferir cabecalho: menu esquerdo, `SuperList` central, avatar/iniciais direita.
3. Abrir menu e acessar `Perfil`.
4. Editar nome e salvar.
5. Selecionar foto da galeria.
6. Testar camera no celular, se disponivel.
7. Conferir avatar no cabecalho.
8. Conferir foto ou `sem foto` em `Outras listas`.
9. Alterar senha com senha atual correta.
10. Testar erro com senha atual incorreta.
11. Testar erro com confirmacao divergente.
12. Validar modo claro/escuro e mobile.
