create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text,
  last_name text,
  carte_identite text,
  carte_etudiant text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.livres (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  auteur text,
  resume text,
  numero_ref text not null unique,
  categorie text,
  disponible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.emprunts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  livre_id uuid not null references public.livres(id) on delete restrict,
  statut text not null default 'pending'
    check (statut in ('pending', 'approved', 'rejected', 'returned')),
  date_demande timestamptz not null default now(),
  date_emprunt timestamptz,
  date_retour_prevu timestamptz,
  date_retour_reel timestamptz,
  penalite numeric(10,2) not null default 0,
  statut_penalite text not null default 'none'
    check (statut_penalite in ('none', 'pending', 'paid'))
);

alter table public.profiles enable row level security;
alter table public.livres enable row level security;
alter table public.emprunts enable row level security;

create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

grant execute on function public.est_admin() to authenticated;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists livres_select on public.livres;
drop policy if exists livres_insert on public.livres;
drop policy if exists livres_update on public.livres;
drop policy if exists livres_delete on public.livres;
drop policy if exists emprunts_select on public.emprunts;
drop policy if exists emprunts_insert on public.emprunts;
drop policy if exists emprunts_update on public.emprunts;

create policy profiles_select
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.est_admin());

create policy profiles_insert
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'user'
  and status = 'pending'
);

create policy profiles_update
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.est_admin())
with check (
  public.est_admin()
  or (id = auth.uid() and role = 'user' and status = 'pending')
);

create policy livres_select
on public.livres
for select
to anon, authenticated
using (true);

create policy livres_insert
on public.livres
for insert
to authenticated
with check (public.est_admin());

create policy livres_update
on public.livres
for update
to authenticated
using (public.est_admin())
with check (public.est_admin());

create policy livres_delete
on public.livres
for delete
to authenticated
using (public.est_admin());

create policy emprunts_select
on public.emprunts
for select
to authenticated
using (user_id = auth.uid() or public.est_admin());

create policy emprunts_insert
on public.emprunts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and statut = 'pending'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
  )
);

create policy emprunts_update
on public.emprunts
for update
to authenticated
using (public.est_admin())
with check (public.est_admin());

update public.profiles
set role = 'admin',
    status = 'active'
where lower(email) in (
  'lucradison2@gmail.com',
  'rcchancetick@gmail.com',
  'rakoolivert@gmail.com'
);
