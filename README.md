# SuperList

SuperList e um app web/PWA para gerenciar listas de compras de supermercado.

O projeto atual e 100% web. A arquitetura Android/Kotlin antiga foi removida
porque o produto final roda como SPA em Vercel usando React, Vite, TypeScript,
Tailwind CSS e Supabase.

## Stack oficial

- React
- Vite
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres via `@supabase/supabase-js`
- Supabase Storage para foto de perfil
- Prisma somente para schema, migrations e tarefas administrativas
- Vercel para build e deploy

Prisma nunca deve ser importado em componentes React ou codigo executado no
navegador. Variaveis privadas de banco tambem nunca devem usar prefixo `VITE_`.

## Funcionalidades

- Cadastro, login, sessao e logout via Supabase Auth.
- Perfil do usuario com nome, e-mail e foto.
- Listas de compras proprias e compartilhadas.
- Compartilhamento remoto de listas com permissao `viewer` ou `editor`.
- Cadastro, edicao inline, exclusao e checklist de produtos.
- Itens comprados movidos para o fim da lista sem perder a ordem original.
- Historico de precos.
- Dashboard e relatorios baseados nos dados remotos.
- Tema claro/escuro.
- Fallback local restrito a preferencias, tema e compatibilidade.

## Variaveis de ambiente

Use `.env.example` como referencia. Nao commite `.env`.

Variaveis publicas usadas pelo frontend:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DEBUG_SUPABASE=false
VITE_ENABLE_LOCAL_FALLBACK=false
```

Variaveis privadas usadas somente por Prisma/backend/migrations:

```text
DATABASE_URL=
DIRECT_URL=
```

Regras de seguranca:

- Nunca exponha `DATABASE_URL` ou `DIRECT_URL` no frontend.
- Nunca use service role key no frontend.
- Configure valores reais na Vercel em Project Settings > Environment Variables.
- Mantenha Row Level Security habilitado no Supabase.

## Supabase

Antes de usar em producao, aplique as migrations Prisma e o SQL de RLS:

```text
docs/supabase-direct-client-rls.sql
```

Para foto de perfil, siga:

```text
docs/profile-photo-storage-setup.md
```

Bucket esperado:

```text
profile-photos
```

## Desenvolvimento local

Instale as dependencias:

```bash
npm install
```

Rode o app:

```bash
npm run dev
```

Abra:

```text
http://localhost:5173
```

## Validacao

Antes de abrir PR ou publicar:

```bash
npm run lint
npm run build
npm exec -- prisma validate
```

Comandos auxiliares:

```bash
npm run preview
npm run test
npm run typecheck
npm run prisma:generate
npm run prisma:validate
```

## Deploy na Vercel

O deploy e feito pela Vercel a partir da branch `main`.

Configuracao esperada:

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

O arquivo `vercel.json` fixa a configuracao de build:

```json
{
  "framework": "vite",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

## Estrutura principal

```text
.
|-- api/                  # Vercel Functions/admin APIs legadas
|-- docs/                 # Relatorios, SQL e guias operacionais
|-- netlify/              # Compatibilidade historica de deploy
|-- prisma/               # Schema e migrations
|-- public/               # Arquivos estaticos
|-- scripts/              # Scripts auxiliares
|-- server/               # Utilitarios backend legados
|-- src/                  # Frontend web React
|   |-- lib/              # Clientes externos, como Supabase
|   |-- services/         # Servicos de Auth/listas/produtos/historico
|   |-- App.tsx
|   |-- main.tsx
|   `-- styles.css
|-- index.html
|-- package.json
|-- tailwind.config.ts
|-- tsconfig.json
|-- vite.config.ts
`-- vercel.json
```

## PWA

No estado atual nao ha `manifest.webmanifest` nem service worker versionado.
Esses arquivos podem ser adicionados em uma proxima etapa para habilitar
instalacao PWA, cache offline e icones dedicados.
