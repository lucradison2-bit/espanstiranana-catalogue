-- sql/schema.sql

-- Table profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  carte_identite text,
  carte_etudiant text,
  role text not null default 'user',
  status text not null default 'pending',
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Profiles lisibles par tous authentifiés"
on public.profiles for select
to authenticated
using (true);

create policy "Insert profil par soi-même"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Update profil par soi-même"
on public.profiles for update
to authenticated
using (auth.uid() = id);

-- Table livres
create table if not exists public.livres (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  auteur text,
  resume text,
  numero_ref text,
  categorie text,
  disponible boolean default true,
  created_at timestamp with time zone default now()
);

alter table public.livres enable row level security;

create policy "Livres lisibles par tous"
on public.livres for select
to authenticated, anon
using (true);

create policy "Admin insert livres"
on public.livres for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
);

create policy "Admin update livres"
on public.livres for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
);

create policy "Admin delete livres"
on public.livres for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
);

-- Table emprunts
create table if not exists public.emprunts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  livre_id uuid references public.livres(id) not null,
  statut text not null default 'pending',
  date_emprunt timestamp with time zone,
  date_retour_prevu timestamp with time zone,
  date_retour_reel timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table public.emprunts enable row level security;

create policy "Emprunts lisibles par tous authentifiés"
on public.emprunts for select
to authenticated
using (true);

create policy "Insert emprunt par utilisateur connecté"
on public.emprunts for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admin update emprunts"
on public.emprunts for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
);
