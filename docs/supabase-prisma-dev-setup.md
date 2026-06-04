# Ambiente de desenvolvimento Supabase + Prisma

Este guia prepara o ambiente de desenvolvimento antes da primeira migration do
SuperList. O frontend continua usando `localStorage` com a chave
`app-supermarket-db-v2`.

Esta etapa nao implementa APIs, nao migra dados e nao altera o login atual.

## Estado verificado

- `prisma/schema.prisma` possui datasource PostgreSQL com `DATABASE_URL` e
  `DIRECT_URL`.
- O Prisma Client esta configurado com `prisma-client-js`.
- Os models atuais sao `Profile`, `ShoppingList`, `Product`, `PriceHistory` e
  `PasskeyCredential`.
- O Prisma fica restrito ao backend em `src/server`.
- O projeto ainda nao usa Supabase Auth nem variaveis publicas
  `VITE_SUPABASE_*`.
- Nenhuma migration foi criada ou aplicada, pois ainda nao existem URLs reais
  configuradas no ambiente local.

## 1. Criar o projeto Supabase de desenvolvimento

Crie um projeto separado para desenvolvimento. Nao reutilize o banco de
producao para executar `prisma migrate dev`.

No painel do Supabase, localize as configuracoes de conexao do banco e obtenha:

- Project URL;
- anon public key, somente quando Supabase Auth ou APIs publicas forem
  implementadas em fase posterior;
- connection string com pooler, adequada para runtime/serverless;
- direct connection string, adequada para migrations.

Os nomes e a localizacao exata dessas opcoes podem mudar no painel do Supabase.
Use sempre as connection strings exibidas pelo proprio projeto.

## 2. Configurar o `.env` local

O arquivo `.env` local foi criado com valores vazios e esta protegido pelo
`.gitignore`.

Preencha somente na sua maquina:

```text
DATABASE_URL=
DIRECT_URL=
```

- `DATABASE_URL`: URL pooled usada pelo Prisma Client no runtime serverless.
- `DIRECT_URL`: conexao direta usada pelo Prisma Migrate.

Cuidados:

- nunca envie o `.env` ao Git;
- nunca cole URLs reais em documentacao, issues, logs ou codigo;
- nunca use o prefixo `VITE_` em `DATABASE_URL` ou `DIRECT_URL`;
- use credenciais e banco exclusivos do ambiente de desenvolvimento;
- confirme que a senha esta corretamente escapada na connection string.

As variaveis abaixo so devem ser adicionadas quando Supabase Auth ou recursos
publicos forem implementados:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Mesmo sendo publicavel por design, a anon key deve ser usada junto com Row
Level Security e politicas corretas. A service role nunca deve ser exposta no
frontend.

## 3. Validar e gerar o Prisma Client

Depois de configurar o `.env`:

```bash
npm install
npx prisma validate
npx prisma generate
```

O `postinstall` tambem executa `prisma generate`. A geracao nao cria tabelas nem
modifica o banco.

## 4. Criar a primeira migration

Execute somente contra o projeto Supabase de desenvolvimento:

```bash
npx prisma migrate dev --name init
```

O comando deve criar um diretorio semelhante a:

```text
prisma/migrations/<timestamp>_init/migration.sql
```

Nao execute a migration enquanto `DATABASE_URL` e `DIRECT_URL` estiverem vazias.
Nao invente URLs apenas para fazer o comando passar.

## 5. Revisar o SQL gerado

Antes de commitar ou aplicar em outro ambiente, revise integralmente o
`migration.sql`.

Checklist:

- [ ] cria `profiles`;
- [ ] cria `shopping_lists`;
- [ ] cria `products`;
- [ ] cria `price_history`;
- [ ] cria `passkey_credentials`;
- [ ] usa UUID nas chaves principais;
- [ ] usa `DECIMAL` em quantidade e valores monetarios;
- [ ] cria chaves estrangeiras coerentes;
- [ ] cria indices de usuario, lista, produto e ordenacao;
- [ ] campos opcionais continuam opcionais;
- [ ] nao contem `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` ou exclusoes
      inesperadas;
- [ ] nao contem credenciais ou valores do `.env`;
- [ ] foi executada e testada somente em desenvolvimento/staging.

Como esta sera a migration inicial de um banco vazio de desenvolvimento, ela
deve conter apenas criacao de tabelas, indices e constraints esperados.

## 6. Configurar variaveis na Vercel

No projeto Vercel, acesse:

```text
Project Settings > Environment Variables
```

Cadastre:

| Variavel | Development | Preview | Production |
| --- | --- | --- | --- |
| `DATABASE_URL` | pooler dev | pooler staging/dev isolado | pooler producao |
| `DIRECT_URL` | direta dev | direta staging/dev isolada | direta producao |

Nao reutilize automaticamente o banco de producao em Preview ou Development.

Quando Supabase Auth for implementado, cadastrar tambem, conforme a estrategia
aprovada:

| Variavel | Exposicao |
| --- | --- |
| `VITE_SUPABASE_URL` | publica no bundle |
| `VITE_SUPABASE_ANON_KEY` | publica no bundle e protegida por RLS |

Nunca configure `DATABASE_URL`, `DIRECT_URL` ou service role com prefixo
`VITE_`.

## 7. Validacao antes do Pull Request

Execute:

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run build
```

Depois da criacao da migration, execute novamente todos os comandos e revise o
SQL gerado.

## Resultado desta etapa

Nesta execucao:

- o schema foi conferido;
- `.env.example` ja continha `DATABASE_URL` e `DIRECT_URL` vazias;
- um `.env` local ignorado foi criado com campos vazios;
- nenhuma variavel real foi fornecida;
- nenhuma migration foi criada ou aplicada;
- nenhuma conexao ao Supabase foi realizada;
- o frontend e o `localStorage` permaneceram inalterados.

Comandos tentados localmente:

```text
npx prisma validate
npx prisma generate
npm run lint
npm run build
```

O ambiente local desta execucao possui Node.js, mas nao disponibiliza os
comandos `npm` e `npx`. Por isso, o GitHub Actions da branch executa instalacao,
geracao do Prisma Client, validacao do schema, lint e build. O comando
`prisma migrate dev` nao foi executado porque as URLs reais ainda nao foram
configuradas.

## Proximos passos para a Fase 2

1. O responsavel pelo projeto cria o Supabase de desenvolvimento.
2. As URLs reais sao configuradas apenas no `.env` local e na Vercel.
3. A primeira migration e gerada, revisada e testada em desenvolvimento.
4. A migration revisada e commitada em uma tarefa separada.
5. Somente depois disso inicia-se a API de listas.
