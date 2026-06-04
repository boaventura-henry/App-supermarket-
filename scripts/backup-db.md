# Backup e recuperacao do Supabase Postgres

## Regras

- Verifique no painel Supabase se o plano atual possui backups automaticos e qual e a retencao.
- Nunca teste restore diretamente no banco de producao.
- Crie um projeto/banco separado para validar o arquivo restaurado.
- Nunca coloque senha, connection string ou arquivo de backup no Git.

## Export manual

Use a URL direta temporaria fornecida pelo Supabase, nunca a URL do pooler:

```bash
pg_dump --format=custom --no-owner --no-acl --dbname="$DIRECT_URL" --file="superlist-backup.dump"
```

Armazene `superlist-backup.dump` em local criptografado e protegido. O arquivo deve permanecer fora do repositorio.

## Validacao de restore

Configure uma URL de um banco isolado e execute:

```bash
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$RESTORE_TEST_DATABASE_URL" "superlist-backup.dump"
```

Depois do restore, valide login, listas, produtos, compartilhamentos, convites, notificacoes e historico. Apague o ambiente de teste conforme a politica de retencao.

## Antes de uma migration de producao

1. Revise o SQL versionado em `prisma/migrations`.
2. Confirme que a migration nao remove dados inesperadamente.
3. Verifique o backup automatico/manual mais recente.
4. Execute `npx prisma migrate deploy` no ambiente correto.
5. Valide o health check e os fluxos principais.
