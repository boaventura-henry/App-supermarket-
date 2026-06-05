# Relatorio tecnico - Fase 3 API de produtos

## Status

A Fase 3 implementa o CRUD remoto de produtos usando Vercel Functions, Prisma e
Supabase Postgres, mantendo o `localStorage` como fallback. A chave
`app-supermarket-db-v2` nao foi alterada.

## Estrutura criada

| Item | Arquivo |
| --- | --- |
| Repository de produtos | `src/server/repositories/productRepository.ts` |
| Service de produtos | `src/server/services/productService.ts` |
| Testes de service | `src/server/services/productService.test.ts` |
| Cliente frontend | `src/services/productApi.ts` |
| Produtos por lista | `api/lists/[id]/products.ts` |
| Produto por id | `api/products/[id].ts` |
| Status comprado | `api/products/[id]/purchased.ts` |

## Endpoints implementados

Todos os endpoints exigem a identidade local temporaria nos headers:

```text
x-superlist-user-id
x-superlist-user-email
x-superlist-user-name
```

Esses headers serao substituidos por JWT quando a fase de Supabase Auth for
implementada.

### GET /api/lists/:listId/products

- Body: nenhum.
- Resposta `200`: array de produtos da lista.
- Erros tratados: `400` identidade/id invalido, `404` lista nao encontrada,
  `405` metodo nao permitido, `500` erro interno.

### POST /api/lists/:listId/products

Payload:

```json
{
  "name": "Arroz",
  "brand": "Tipo 1",
  "quantity": 2,
  "unitPrice": 8.5,
  "supermarket": "Mercado Central"
}
```

- `name` e obrigatorio.
- `brand`, `quantity`, `unitPrice` e `supermarket` sao opcionais.
- Resposta `201`: produto criado.
- O `sortOrder` e criado no fim da ordem original da lista.

### PUT /api/products/:id

Payload:

```json
{
  "brand": "Tipo 1",
  "quantity": 3,
  "unitPrice": 9.9,
  "supermarket": "Mercado Central"
}
```

- Atualiza somente os campos enviados.
- Resposta `200`: produto atualizado.
- Nao altera `sortOrder`, checkbox ou identificadores.

### DELETE /api/products/:id

- Body: nenhum.
- Resposta `200`: `{ "id": "uuid" }`.
- Remove somente produto pertencente ao usuario autenticado temporariamente.

### PATCH /api/products/:id/purchased

Payload:

```json
{
  "purchased": true
}
```

- Resposta `200`: produto com status atualizado.
- Nao altera `sortOrder`.
- A ordenacao visual continua:
  - nao comprados primeiro por `sortOrder`;
  - comprados no final por `sortOrder`;
  - ao desmarcar, o item volta para a posicao original.

## Feature flag e fallback

Variavel:

```text
VITE_USE_REMOTE_PRODUCTS=false
```

- `false`: produtos continuam usando `localStorage`.
- `true`: produto usa a API remota, e o retorno e espelhado no estado local para
  manter grid, dashboard, historico e totais funcionando.

Observacao: a ativacao remota de produtos pressupoe que as listas usadas ja
existam no banco remoto. Em migracao gradual, use `VITE_USE_REMOTE_LISTS=true`
ou importe as listas antes de ligar produtos remotos para usuarios reais.

## Regras preservadas

- Grid atual preservada.
- Valor total continua calculado em runtime no frontend.
- Coluna sticky de nome do produto nao foi alterada.
- Edicao inline continua com gravar/cancelar.
- Produtos comprados vao visualmente ao fim.
- Produtos desmarcados retornam a ordem original.
- `sortOrder` e preservado ao marcar/desmarcar.
- `localStorage` e dados antigos continuam preservados.

## Prisma e seguranca

- Prisma roda somente em `src/server` e `api`.
- `DATABASE_URL` e `DIRECT_URL` nao foram expostas no frontend.
- Endpoints nao chamam Prisma diretamente; usam service/repository.
- Ownership da lista/produto e validado pelo `Profile` resolvido a partir dos
  headers temporarios.
- Campos obrigatorios e numericos sao validados no backend.
- Valores monetarios usam `Decimal` no Prisma.

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
- 13 testes aprovados;
- build aprovado;
- schema Prisma valido.

## Testes cobertos

- criar produto;
- editar produto;
- excluir produto;
- marcar comprado;
- desmarcar comprado;
- preservar `sortOrder`;
- listar produtos por lista;
- impedir acesso a produto de outro usuario;
- manter fallback por feature flag no frontend.

## Proximos passos - Fase 4

1. Criar API de historico de precos.
2. Mover geracao de historico para backend quando produto remoto estiver ativo.
3. Preparar importador `localStorage` para listas e produtos.
4. Planejar Supabase Auth/JWT para substituir headers temporarios.
