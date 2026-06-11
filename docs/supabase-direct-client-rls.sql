-- SuperList direct Supabase Client RLS setup.
-- Run this in the Supabase SQL Editor after applying the Prisma migrations.
-- The frontend must use only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
-- Never use a service role key in React/Vite.

alter table public.profiles enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.products enable row level security;
alter table public.price_history enable row level security;
alter table public.passkey_credentials enable row level security;
alter table public.list_shares enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "shopping_lists_select_own" on public.shopping_lists;
drop policy if exists "shopping_lists_insert_own" on public.shopping_lists;
drop policy if exists "shopping_lists_update_own" on public.shopping_lists;
drop policy if exists "shopping_lists_delete_own" on public.shopping_lists;

create policy "shopping_lists_select_own"
on public.shopping_lists for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.list_shares
    where list_shares.list_id = shopping_lists.id
      and list_shares.shared_user_id = auth.uid()
  )
);

create policy "shopping_lists_insert_own"
on public.shopping_lists for insert
to authenticated
with check (user_id = auth.uid());

create policy "shopping_lists_update_own"
on public.shopping_lists for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "shopping_lists_delete_own"
on public.shopping_lists for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "products_select_own" on public.products;
drop policy if exists "products_insert_own" on public.products;
drop policy if exists "products_update_own" on public.products;
drop policy if exists "products_delete_own" on public.products;

create policy "products_select_own"
on public.products for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.list_shares
    where list_shares.list_id = products.list_id
      and list_shares.shared_user_id = auth.uid()
  )
);

create policy "products_insert_own"
on public.products for insert
to authenticated
with check (
  exists (
    select 1
    from public.shopping_lists
    where shopping_lists.id = products.list_id
      and products.user_id = shopping_lists.user_id
      and (
        shopping_lists.user_id = auth.uid()
        or exists (
          select 1
          from public.list_shares
          where list_shares.list_id = shopping_lists.id
            and list_shares.shared_user_id = auth.uid()
            and list_shares.permission = 'editor'
        )
      )
  )
);

create policy "products_update_own"
on public.products for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.list_shares
    where list_shares.list_id = products.list_id
      and list_shares.shared_user_id = auth.uid()
      and list_shares.permission = 'editor'
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.list_shares
    where list_shares.list_id = products.list_id
      and list_shares.shared_user_id = auth.uid()
      and list_shares.permission = 'editor'
  )
);

create policy "products_delete_own"
on public.products for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.list_shares
    where list_shares.list_id = products.list_id
      and list_shares.shared_user_id = auth.uid()
      and list_shares.permission = 'editor'
  )
);

drop policy if exists "price_history_select_own" on public.price_history;
drop policy if exists "price_history_insert_own" on public.price_history;
drop policy if exists "price_history_delete_own" on public.price_history;

create policy "price_history_select_own"
on public.price_history for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.list_shares
    where list_shares.list_id = price_history.list_id
      and list_shares.shared_user_id = auth.uid()
  )
);

create policy "price_history_insert_own"
on public.price_history for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.list_shares
    join public.shopping_lists on shopping_lists.id = list_shares.list_id
    where list_shares.list_id = price_history.list_id
      and list_shares.shared_user_id = auth.uid()
      and list_shares.permission = 'editor'
      and price_history.user_id = shopping_lists.user_id
  )
);

create policy "price_history_delete_own"
on public.price_history for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "passkey_credentials_select_own" on public.passkey_credentials;
drop policy if exists "passkey_credentials_insert_own" on public.passkey_credentials;
drop policy if exists "passkey_credentials_update_own" on public.passkey_credentials;
drop policy if exists "passkey_credentials_delete_own" on public.passkey_credentials;

create policy "passkey_credentials_select_own"
on public.passkey_credentials for select
to authenticated
using (user_id = auth.uid());

create policy "passkey_credentials_insert_own"
on public.passkey_credentials for insert
to authenticated
with check (user_id = auth.uid());

create policy "passkey_credentials_update_own"
on public.passkey_credentials for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "passkey_credentials_delete_own"
on public.passkey_credentials for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "list_shares_select_owner_or_shared" on public.list_shares;
drop policy if exists "list_shares_insert_owner" on public.list_shares;
drop policy if exists "list_shares_update_owner" on public.list_shares;
drop policy if exists "list_shares_delete_owner" on public.list_shares;

create policy "list_shares_select_owner_or_shared"
on public.list_shares for select
to authenticated
using (
  owner_user_id = auth.uid()
  or shared_user_id = auth.uid()
);

create policy "list_shares_insert_owner"
on public.list_shares for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from public.shopping_lists
    where shopping_lists.id = list_shares.list_id
      and shopping_lists.user_id = auth.uid()
  )
);

create policy "list_shares_update_owner"
on public.list_shares for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "list_shares_delete_owner"
on public.list_shares for delete
to authenticated
using (owner_user_id = auth.uid());
