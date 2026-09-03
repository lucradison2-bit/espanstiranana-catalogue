create extension if not exists "pgcrypto";

create type public.user_status as enum (
  'pending',
  'active',
  'blocked'
);

create type public.book_status as enum (
  'available',
  'borrowed',
  'lost',
  'damaged',
  'inactive'
);

create type public.loan_status as enum (
  'pending',
  'active',
  'overdue',
  'returned',
  'returned_late',
  'refused',
  'lost',
  'damaged'
);

create type public.penalty_status as enum (
  'unpaid',
  'partially_paid',
  'paid',
  'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  phone text,
  student_card text,
  identity_card text,
  role text not null default 'user'
    check (role in ('user', 'admin')),
  status public.user_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null,
  author text not null,
  summary text,
  category_id uuid references public.categories(id)
    on delete set null,
  status public.book_status not null default 'available',
  created_by uuid references public.profiles(id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id)
    on delete restrict,
  user_id uuid not null references public.profiles(id)
    on delete restrict,
  requested_at timestamptz not null default now(),
  borrowed_at timestamptz,
  due_at timestamptz,
  returned_at timestamptz,
  status public.loan_status not null default 'pending',
  approved_by uuid references public.profiles(id)
    on delete set null,
  return_confirmed_by uuid references public.profiles(id)
    on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.penalties (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null unique references public.loans(id)
    on delete cascade,
  late_days integer not null default 0,
  daily_rate integer not null default 500,
  amount integer not null default 0,
  paid_amount integer not null default 0,
  status public.penalty_status not null default 'unpaid',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_active_loan_per_book
on public.loans(book_id)
where status in ('pending', 'active', 'overdue');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    email,
    phone,
    student_card,
    identity_card
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'student_card',
    new.raw_user_meta_data->>'identity_card'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

create or replace function public.is_admin()
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

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.books enable row level security;
alter table public.loans enable row level security;
alter table public.penalties enable row level security;

grant select on public.books to anon;
grant select on public.categories to anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.books to authenticated;
grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.loans to authenticated;
grant select, insert, update on public.penalties to authenticated;

create policy "Public read categories"
on public.categories for select
using (true);

create policy "Public read books"
on public.books for select
using (status <> 'inactive');

create policy "Read own profile"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "Update own profile"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "Admins manage profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

create policy "Admins manage books"
on public.books for all
using (public.is_admin())
with check (public.is_admin());

create policy "Admins manage categories"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

create policy "Users create own loan"
on public.loans for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
  )
);

create policy "Users read own loans"
on public.loans for select
using (user_id = auth.uid() or public.is_admin());

create policy "Admins manage loans"
on public.loans for all
using (public.is_admin())
with check (public.is_admin());

create policy "Users read own penalties"
on public.penalties for select
using (
  exists (
    select 1
    from public.loans
    where loans.id = penalties.loan_id
      and loans.user_id = auth.uid()
  )
  or public.is_admin()
);

create policy "Admins manage penalties"
on public.penalties for all
using (public.is_admin())
with check (public.is_admin());
