-- Supabase SQL Editor ішінде жоба иесі ретінде іске қосыңыз.
begin;

-- Әр жазбаның пішіні мен көлемін серверде де шектейміз.
create or replace function public.valid_profile_items(items jsonb, max_items integer)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
declare item jsonb;
begin
  if jsonb_typeof(items) is distinct from 'array' then return false; end if;
  if jsonb_array_length(items) > max_items or octet_length(items::text) > 65536 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) is distinct from 'object' then return false; end if;
    if jsonb_typeof(item->'type') is distinct from 'string'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or (item->>'type') not in ('person', 'tradition', 'article')
      or char_length(item->>'id') not between 1 and 160
      or (select count(*) from jsonb_object_keys(item)) <> 2 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  zhuz text not null default '' check (char_length(zhuz) <= 80),
  tribe text not null default '' check (char_length(tribe) <= 160),
  saved jsonb not null default '[]'::jsonb check (public.valid_profile_items(saved, 200)),
  recent jsonb not null default '[]'::jsonb check (public.valid_profile_items(recent, 12)),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.delete_own_account()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare own_id uuid := auth.uid();
begin
  if own_id is null then
    raise exception 'Тіркелгіге кіру қажет' using errcode = '42501';
  end if;
  -- Профиль сыртқы кілттің ON DELETE CASCADE шартымен бірге өшеді.
  delete from auth.users where id = own_id;
end;
$$;
revoke all on function public.delete_own_account() from public, anon, authenticated;
grant execute on function public.delete_own_account() to authenticated;
commit;
