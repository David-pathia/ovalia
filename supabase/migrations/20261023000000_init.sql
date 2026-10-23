-- Ovalia : schéma initial
-- Chaque ligne appartient à un conseiller (owner_id = auth.uid()) ; la RLS isole les données par compte.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profils (un par utilisateur Supabase Auth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  agence text default 'Laforêt Immobilier',
  laforet_agent_id text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Biens
-- ---------------------------------------------------------------------------
create table public.biens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reference text,
  type text not null check (type in ('appartement', 'maison', 'terrain', 'local', 'immeuble', 'autre')),
  statut text not null default 'estimation'
    check (statut in ('estimation', 'mandat', 'sous_offre', 'compromis', 'vendu', 'retire')),
  mandat_type text check (mandat_type in ('simple', 'exclusif', 'semi_exclusif')),
  adresse text,
  code_postal text,
  ville text,
  latitude double precision,
  longitude double precision,
  prix integer,
  surface_habitable numeric(7, 2),
  surface_terrain numeric(9, 2),
  pieces smallint,
  chambres smallint,
  annee_construction smallint,
  dpe char(1) check (dpe between 'A' and 'G'),
  exterieur text[] not null default '{}', -- jardin, balcon, terrasse, garage, parking…
  description text,
  laforet_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Clients (acquéreurs, vendeurs) et leurs critères de recherche
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  civilite text,
  nom text not null,
  prenom text,
  email text,
  telephone text,
  role text not null default 'acquereur' check (role in ('acquereur', 'vendeur', 'les_deux')),
  source text, -- mini-site, vitrine, recommandation, portail…
  notes text,
  rgpd_consentement_at timestamptz,
  laforet_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.criteres (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  types text[] not null default '{}',
  villes text[] not null default '{}',
  budget_min integer,
  budget_max integer,
  surface_min numeric(7, 2),
  pieces_min smallint,
  chambres_min smallint,
  exterieur text[] not null default '{}',
  commentaire text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rapprochements bien ↔ client (calculés par l'application)
-- ---------------------------------------------------------------------------
create table public.rapprochements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bien_id uuid not null references public.biens (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  explication text,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'envoye', 'ecarte', 'visite')),
  envoye_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bien_id, client_id)
);

-- ---------------------------------------------------------------------------
-- Tâches du jour
-- ---------------------------------------------------------------------------
create table public.taches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titre text not null,
  detail text,
  type text not null default 'autre'
    check (type in ('appel', 'visite', 'estimation', 'mandat', 'communication', 'autre')),
  echeance timestamptz,
  faite_at timestamptz,
  bien_id uuid references public.biens (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- File de synchronisation vers Laforêt (en attendant l'API)
-- ---------------------------------------------------------------------------
create table public.laforet_sync (
  id uuid primary key default gen_random_uuid(),
  -- Pas de clé étrangère : la suppression d'un compte ne doit pas être bloquée par la file.
  owner_id uuid not null default auth.uid(),
  entite text not null check (entite in ('bien', 'client')),
  entite_id uuid not null,
  operation text not null check (operation in ('creation', 'modification', 'suppression')),
  payload jsonb not null,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'envoye', 'erreur', 'exporte')),
  tentatives smallint not null default 0,
  derniere_erreur text,
  created_at timestamptz not null default now(),
  traite_at timestamptz
);

create index laforet_sync_statut_idx on public.laforet_sync (owner_id, statut, created_at);

-- Chaque création ou modification de bien / client part automatiquement dans la file.
create or replace function public.enqueue_laforet_sync()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_row record;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;
  insert into public.laforet_sync (owner_id, entite, entite_id, operation, payload)
  values (
    v_row.owner_id,
    case tg_table_name when 'biens' then 'bien' else 'client' end,
    v_row.id,
    case tg_op when 'INSERT' then 'creation' when 'UPDATE' then 'modification' else 'suppression' end,
    to_jsonb(v_row)
  );
  return v_row;
end;
$$;

create trigger biens_laforet_sync
  after insert or update or delete on public.biens
  for each row execute function public.enqueue_laforet_sync();

create trigger clients_laforet_sync
  after insert or update or delete on public.clients
  for each row execute function public.enqueue_laforet_sync();

-- ---------------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger biens_touch before update on public.biens
  for each row execute function public.touch_updated_at();
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();
create trigger criteres_touch before update on public.criteres
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Sécurité : RLS, chaque conseiller ne voit que ses données
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.biens enable row level security;
alter table public.clients enable row level security;
alter table public.criteres enable row level security;
alter table public.rapprochements enable row level security;
alter table public.taches enable row level security;
alter table public.laforet_sync enable row level security;

create policy "profil personnel" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array['biens', 'clients', 'criteres', 'rapprochements', 'taches', 'laforet_sync'] loop
    execute format(
      'create policy "données personnelles" on public.%I for all to authenticated
         using (owner_id = (select auth.uid()))
         with check (owner_id = (select auth.uid()))',
      t
    );
    execute format('create index %I on public.%I (owner_id)', t || '_owner_idx', t);
  end loop;
end;
$$;
