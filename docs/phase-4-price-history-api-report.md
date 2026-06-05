# Relatorio tecnico - Fase 4 API de historico de precos

## Status

A Fase 4 implementa o historico de precos remoto usando Vercel Functions,
Prisma e Supabase Postgres, mantendo `localStorage` como fallback. A chave
`app-supermarket-db-v2` nao foi alterada.

## Estrutura criada

| Item | Arquivo |
| --- | --- |
| Repository de historico | `src/server/repositories/priceHistoryRepository.ts` |
| Service de historico | `src/server/services/priceHistoryService.ts` |
| Testes de service | `src/server/services/priceHistoryService.test.ts` |
| Cliente frontend | `src/services/priceHistoryApi.ts` |
| Endpoints de colecao | `api/price-history/index.ts` |
| Endpoints por id | `api/price-history/[id].ts` |

## Endpoints implementados

Todos os endpoints usam a identidade local temporaria nos headers:

```text
x-superlist-user-id
x-superlist-user-email
x-superlist-user-name
```

### GET /api/price-history

- Query opcional: `productName`, `supermarket`, `brand`, `monthStart`,
  `monthEnd`.
- Meses usam formato `AAAA-MM`.
- Resposta `200`: array de registros do usuario.
- Erros tratados: `400`, `405`, `500`.

### GET /api/price-history/:id

- Resposta `200`: registro encontrado.
- Sempre filtra pelo usuario resolvido.
- Erros tratados: `400`, `404`, `405`, `500`.

### POST /api/price-history

Payload:

```json
{
  "listId": "uuid-opcional",
  "productId": "uuid-opcional",
  "productName": "Arroz",
  "brand": "Tipo 1",
  "supermarket": "Mercado Central",
  "quantity": 2,
  "price": 8.5,
  "createdAt": "2026-06-05T00:00:00.000Z"
}
```

- `price` deve ser maior que zero.
- `productName` usa fallback seguro quando ausente.
- `listId` e `productId` sao opcionais para permitir migracao gradual.
- Se `listId` ou `productId` forem enviados, o backend valida ownership.
- Resposta `201`: historico criado.

### DELETE /api/price-history/:id

- Remove apenas historico pertencente ao usuario resolvido.
- Resposta `200`: `{ "id": "uuid" }`.
- Erros tratados: `400`, `404`, `405`, `500`.

## Feature flag e fallback

Variavel:

```text
VITE_USE_REMOTE_PRICE_HISTORY=false
```

- `false`: Dashboard e Historico seguem usando `localStorage`.
- `true`: Dashboard e Historico carregam `/api/price-history`.

Quando produtos remotos estao ativos, a criacao automatica de historico ocorre
no backend. Quando produtos ainda estao locais e o historico remoto e ligado, o
frontend envia um registro remoto sem exigir `listId`/`productId` remotos.

## Integracao automatica

O historico e gerado automaticamente quando:

- produto remoto e criado com `unitPrice > 0`;
- produto remoto tem `unitPrice` alterado para valor valido maior que zero.

Para evitar duplicacao, salvar o mesmo `unitPrice` novamente nao gera novo
registro automatico.

## Prisma e seguranca

- Prisma roda somente em `src/server` e `api`.
- `DATABASE_URL` e `DIRECT_URL` nao foram expostas no frontend.
- Endpoints chamam service/repository.
- A identidade temporaria e resolvida para `Profile`.
- Toda leitura, busca por id e exclusao filtra por usuario.
- `listId` e `productId`, quando enviados, sao validados contra o usuario.
- Valores monetarios usam `Decimal`.

## Migrations

Nenhuma nova migration foi criada nesta fase. A migration inicial
`20260604161701_init` ja cria:

- tabela `price_history`;
- indices por usuario/data, lista e produto;
- foreign keys para `profiles`, `shopping_lists` e `products`;
- campos `productId`, `quantity`, `price` e `createdAt`.

## Validacoes executadas

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm exec -- prisma validate
```

Resultado:

- lint aprovado;
- typecheck aprovado;
- 20 testes aprovados;
- build aprovado;
- schema Prisma valido.

## Testes cobertos

- geracao automatica de historico;
- evitar historico automatico com preco zero;
- filtros por produto, supermercado e intervalo mensal;
- criar historico validando lista/produto do usuario;
- impedir acesso a produto de outro usuario;
- buscar registro por id filtrando usuario;
- excluir registro filtrando usuario;
- fallback por feature flag no frontend.

## Proximos passos - Fase 5

1. Criar importador `localStorage` para Supabase.
2. Migrar listas, produtos e historico mantendo IDs legados.
3. Validar reexecucao segura do importador.
4. Planejar Supabase Auth para substituir headers temporarios.
