# Relatorio tecnico - Fase 2 API de listas

## Status

A Fase 2 esta implementada e validada em branch de feature. O app continua
usando `localStorage` por padrao e a chave `app-supermarket-db-v2` permanece
inalterada.

## Estrutura criada

| Item | Arquivo |
| --- | --- |
| Repository de perfis | `src/server/repositories/profileRepository.ts` |
| Repository de listas | `src/server/repositories/listRepository.ts` |
| Service de listas | `src/server/services/listService.ts` |
| Erros padronizados | `src/server/errors.ts` |
| Utilitarios de API | `api/_utils.ts` |
| Endpoints de colecao | `api/lists/index.ts` |
| Endpoints por id | `api/lists/[id].ts` |
| Cliente frontend | `src/services/listApi.ts` |
| Tipagem da feature flag | `src/vite-env.d.ts` |
| Testes de service | `src/server/services/listService.test.ts` |

## Endpoints implementados

Todos os endpoints exigem identidade local temporaria nos headers:

```text
x-superlist-user-id
x-superlist-user-email
x-superlist-user-name
```

Esses headers sao temporarios ate a fase de Supabase Auth. O backend resolve ou
cria um `Profile` pelo `legacyId` e todas as operacoes filtram pelo UUID desse
perfil.

### GET /api/lists

- Payload: nenhum body.
- Resposta `200`:

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

- Erros tratados: `400` identidade incompleta/invalida, `405` metodo nao
  permitido, `500` erro interno.

### GET /api/lists/:id

- Payload: id pela rota.
- Resposta `200`: lista encontrada.
- Erros tratados: `400` id ou identidade invalida, `404` lista nao encontrada,
  `405`, `500`.

### POST /api/lists

Payload:

```json
{
  "name": "Mercado",
  "color": "#6df7a7"
}
```

- `name` e obrigatorio.
- `color` e opcional; quando ausente usa `#6df7a7`.
- Resposta `201`: lista criada.
- Erros tratados: `400`, `405`, `500`.

### PUT /api/lists/:id

Payload:

```json
{
  "name": "Mercado atualizado",
  "color": "#6df7a7"
}
```

- Ao menos um campo deve ser informado.
- Resposta `200`: lista atualizada.
- Erros tratados: `400`, `404`, `405`, `500`.

### DELETE /api/lists/:id

- Payload: nenhum body.
- Resposta `200`:

```json
{
  "success": true,
  "message": "Lista excluida",
  "data": {
    "id": "uuid"
  }
}
```

- Erros tratados: `400`, `404`, `405`, `500`.

## Feature flag e fallback

Variavel:

```text
VITE_USE_REMOTE_LISTS=false
```

- `false`: o app continua usando o fluxo atual em `localStorage`.
- `true`: o CRUD de listas usa `/api/lists` e espelha as listas remotas no
  estado local para manter compatibilidade com produtos e dashboard ainda
  locais.

O fallback local foi preservado:

- `src/storage.ts` continua usando `app-supermarket-db-v2`;
- dados antigos nao sao apagados;
- produtos, historico, dashboard, login e passkeys continuam locais;
- se a sincronizacao inicial remota falhar, o cache local existente e
  preservado.

## Prisma e backend

- Prisma e importado somente em `src/server/prisma.ts`.
- Repositories usam Prisma centralizado.
- Services concentram validacao e regras.
- Endpoints chamam services, nao Prisma diretamente.
- `DATABASE_URL` e `DIRECT_URL` nao aparecem no bundle frontend.
- `src/server/prisma.ts` usa singleton de `PrismaClient`.

## Compatibilidade com Vercel Functions

A estrutura `api/**/*.ts` e compatível com Vercel Functions no projeto Vite.
Cada arquivo exporta um handler default.

Limite conhecido:

- A identidade por headers locais ainda nao e seguranca de producao. Ela permite
  migracao gradual, mas deve ser substituida por Supabase Auth/JWT.

Ajuste futuro necessario:

- Na fase de Auth, remover os headers temporarios e resolver o usuario nas APIs
  a partir do JWT validado.

## Validacoes executadas

Localmente:

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm exec -- prisma validate
npm exec -- prisma generate
```

Resultado:

- lint aprovado;
- typecheck aprovado;
- 5 testes aprovados;
- build aprovado;
- schema Prisma valido.
- Prisma Client gerado com sucesso.

Tambem foi executado um ciclo CRUD temporario no Supabase:

- criar perfil A;
- criar perfil B;
- criar lista do perfil A;
- listar listas do perfil A;
- editar lista do perfil A;
- tentar acessar/alterar a lista pelo perfil B;
- confirmar isolamento;
- excluir lista;
- limpar perfis temporarios.

Resultado do isolamento:

- update cruzado: `0` registros afetados;
- leitura cruzada: nenhuma lista retornada.

## Seguranca

- `.env` nao foi commitado.
- `.env.local` esta ignorado.
- `*.tsbuildinfo` esta ignorado.
- Nenhuma URL real, token ou secret foi adicionado ao repositório.
- Campos obrigatorios sao validados no backend.
- Erros internos nao retornam detalhes do banco.

## Arquivos criados/alterados

- `.env.example`
- `.github/workflows/deploy.yml`
- `package.json`
- `src/App.tsx`
- `src/vite-env.d.ts`
- `src/services/listApi.ts`
- `src/server/errors.ts`
- `src/server/repositories/profileRepository.ts`
- `src/server/repositories/listRepository.ts`
- `src/server/services/listService.ts`
- `src/server/services/listService.test.ts`
- `api/_utils.ts`
- `api/lists/index.ts`
- `api/lists/[id].ts`
- `docs/supabase-prisma-lists-api.md`
- `docs/phase-2-lists-api-report.md`

## Testes manuais esperados

Com `VITE_USE_REMOTE_LISTS=false`:

1. criar lista pelo app;
2. editar lista;
3. excluir lista;
4. confirmar persistencia em `localStorage`.

Com `VITE_USE_REMOTE_LISTS=true`:

1. criar lista pelo app;
2. editar lista;
3. excluir lista;
4. confirmar registros no Supabase;
5. confirmar que produtos e dashboard seguem usando dados locais.

## Proximos passos - Fase 3

1. Planejar API de produtos.
2. Preservar `localStorage` como fallback.
3. Definir como mapear produtos locais para listas remotas.
4. Evitar migrar historico antes de produtos.
5. Manter Supabase Auth como fase posterior.
