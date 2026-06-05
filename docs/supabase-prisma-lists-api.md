# Fase 2 - API de listas com Prisma

Esta fase adiciona CRUD remoto de listas sem remover o armazenamento local.
Produtos, historico, dashboard, login e passkeys continuam locais.

## Arquitetura

```text
React/Vite
  -> src/services/listApi.ts
  -> Vercel Functions /api/lists
  -> src/server/services/listService.ts
  -> src/server/repositories
  -> Prisma
  -> Supabase Postgres
```

## Endpoints

| Metodo | Endpoint | Resultado |
| --- | --- | --- |
| `GET` | `/api/lists` | Lista as listas do perfil atual |
| `GET` | `/api/lists/:id` | Busca uma lista do perfil atual |
| `POST` | `/api/lists` | Cria uma lista |
| `PUT` | `/api/lists/:id` | Atualiza nome/cor |
| `DELETE` | `/api/lists/:id` | Exclui uma lista |

Respostas seguem o formato:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

Erros internos nao retornam detalhes de banco ou secrets.

## Identidade temporaria

Supabase Auth ainda nao foi implementado. Temporariamente, o cliente envia a
identidade da conta local nos headers:

```text
x-superlist-user-id
x-superlist-user-email
x-superlist-user-name
```

O backend resolve/cria um `Profile` pelo `legacyId` e todas as consultas de
listas filtram obrigatoriamente pelo UUID desse perfil.

Essa identidade ainda pode ser forjada pelo navegador e nao representa
autenticacao segura de producao. Na fase de Supabase Auth, os headers temporarios
devem ser removidos e o `userId` deve vir exclusivamente de um JWT validado.

## Feature flag e fallback

```text
VITE_USE_REMOTE_LISTS=false
```

- `false`: o app usa somente o fluxo atual em `localStorage`.
- `true`: o frontend usa a API para CRUD de listas e espelha os resultados no
  estado local para manter compatibilidade com produtos ainda locais.
- se a sincronizacao inicial falhar, o cache local existente e preservado.

Mantenha a flag `false` em producao ate existir uma estrategia aprovada para
importar as listas locais existentes. Ativar a flag nao importa dados antigos.

## Isolamento

Repository e service sempre recebem o UUID do perfil resolvido. Buscar,
atualizar e excluir usam simultaneamente `id` da lista e `userId` do perfil.
Uma lista de outro perfil e respondida como nao encontrada.

## Validacoes

- nome obrigatorio e limitado;
- cor hexadecimal `#RRGGBB`;
- identidade local obrigatoria;
- erros `400`, `404`, `405` e `500` padronizados;
- testes de criacao, listagem e isolamento entre perfis.

Validacoes executadas nesta fase:

- `npm run test`: 5 testes aprovados;
- `npm run lint`: aprovado;
- `npm run typecheck`: aprovado;
- `npm run build`: aprovado;
- `npm exec -- prisma validate`: aprovado;
- ciclo CRUD temporario no Supabase: criar, listar, editar, impedir acesso de
  outro perfil e excluir, com limpeza automatica ao final.

## Proximos passos

1. Configurar `DATABASE_URL` na Vercel para as Functions.
2. Manter `VITE_USE_REMOTE_LISTS=false` ate preparar importacao/ativacao.
3. Testar endpoints em Preview.
4. Planejar a Fase 3 para produtos, sem remover o fallback local.
