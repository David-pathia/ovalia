-- Ovalia : schéma aligné sur Laforêt (fiche bien, fiche contact, projets)
-- Remplace biens / clients / criteres / rapprochements du schéma initial (tables vides).
-- Tout est nullable sauf ce qui identifie un enregistrement ; les onglets Laforêt non modélisés vont dans `laforet_extra`.

drop table if exists public.rapprochements cascade;
drop table if exists public.criteres cascade;
drop table if exists public.taches cascade;
drop table if exists public.clients cascade;
drop table if exists public.biens cascade;

-- ---------------------------------------------------------------------------
-- Biens
-- ---------------------------------------------------------------------------
create table public.biens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- En-tête
  reference text,
  numero_mandat text,
  transaction text not null default 'vente' check (transaction in ('vente', 'location')),
  type text not null check (type in ('appartement', 'maison', 'immeuble', 'terrain', 'garage', 'local')),
  statut text not null default 'estimation'
    check (statut in ('estimation', 'avant_premiere', 'mandat_en_cours', 'sous_offre', 'suspendu')),
  classif_projet text check (classif_projet in ('court_terme', 'moyen_terme', 'long_terme')),
  web boolean not null default false,
  prochain_contact date,
  disponible_le date,
  agence text default 'Laforêt Roanne',
  cree_par text,
  suivi_par text,
  laforet_cree_le date,
  laforet_maj_le date,

  -- Composition
  pieces smallint,
  chambres smallint,
  surface numeric(8, 2),
  surface_terrain numeric(10, 2),
  etage smallint,
  nb_etages smallint,

  -- Prix (euros)
  prix_bien integer,
  hono_vendeur integer,
  hono_acquereur integer,
  prix_affiche integer,
  net_vendeur integer,
  frais_notaire integer,
  prix_visible boolean not null default true,
  hono_vendeur_pct numeric(5, 2) generated always as
    (case when prix_bien > 0 and hono_vendeur is not null then round(hono_vendeur * 100.0 / prix_bien, 2) end) stored,
  hono_acquereur_pct numeric(5, 2) generated always as
    (case when prix_bien > 0 and hono_acquereur is not null then round(hono_acquereur * 100.0 / prix_bien, 2) end) stored,

  -- Mandat
  type_mandat text check (type_mandat in ('favoriz', 'simple')),
  mandat_debut date,
  mandat_fin date,
  isuivi boolean not null default false,
  numero_isuivi text,
  gav boolean not null default false,
  bien_exception boolean not null default false,

  -- Localisation
  adresse text,
  complement_adresse text,
  adresse_sur_fiche boolean, -- null = non renseigné
  code_postal text,
  ville text,
  geoloc_precise boolean,
  pays text default 'France',
  code_postal_internet text,
  ville_internet text,
  distance text,
  latitude double precision,
  longitude double precision,

  -- Aspects financiers
  encadrement_loyers boolean,
  loyer_reference_majore_nu numeric(10, 2),
  loyer_reference_majore_meuble numeric(10, 2),
  prix_cession integer,
  loyer_mensuel_hc numeric(10, 2),
  loyer_base numeric(10, 2),
  loyer_parking text,
  charges_forfaitaires numeric(10, 2),
  frais_divers text,
  charges_copro_mensuelles numeric(10, 2),
  taxe_fonciere integer,

  -- Copropriété
  copropriete boolean,
  nb_lots integer,
  charges_copro_annuelles numeric(10, 2),
  procedure_en_cours boolean,

  -- Diagnostics
  dpe_classe char(1) check (dpe_classe between 'A' and 'G'),
  dpe_valeur integer,
  ges_classe char(1) check (ges_classe between 'A' and 'G'),
  ges_valeur integer,
  dpe_date date,

  -- Caractéristiques utiles au rapprochement et à l'estimation
  annee_construction smallint,
  ascenseur boolean,
  exterieurs text[] not null default '{}', -- balcon, terrasse, jardin, cave, parking, garage…
  etat_general text,

  -- Diffusion (titre et description par langue : {"fr": …, "en": …, "de": …, "es": …})
  titre_web jsonb not null default '{}',
  description_web jsonb not null default '{}',

  -- Onglets Laforêt non modélisés (Intérieur, Autres, Bail, Visites, Commentaires…)
  laforet_extra jsonb not null default '{}',
  notes text,
  laforet_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bien_pieces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bien_id uuid not null references public.biens (id) on delete cascade,
  ordre smallint not null default 0,
  niveau text,
  nom text not null,
  surface numeric(7, 2),
  exposition text,
  sol text,
  commentaire text
);

create table public.bien_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bien_id uuid not null references public.biens (id) on delete cascade,
  storage_path text not null, -- bucket privé « biens »
  ordre smallint not null default 0,
  confidentielle boolean not null default false,
  legende text,
  copyright text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Contacts (vendeurs, demandeurs, notaires…)
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  genre text not null default 'particulier' check (genre in ('particulier', 'societe')),
  raison_sociale text,
  forme_juridique text,
  civilite text,
  nom text not null,
  prenom text,
  fonction text,
  numero_rcs text,
  ville_rcs text,

  email text,
  portable text,
  telephone_fixe text,
  adresse text,
  code_postal text,
  ville text,

  categories text[] not null default '{}', -- demandeur, vendeur, bailleur, locataire, notaire…
  suivi_par text,
  agence text default 'Laforêt Roanne',
  communicabilite_fcnl boolean not null default false,
  envoi_comptes_rendus boolean not null default false,

  accepte_sms boolean not null default false,
  accepte_email boolean not null default false,
  rgpd_consentement_le timestamptz,

  notes text,
  laforet_extra jsonb not null default '{}',
  laforet_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bien_contacts (
  bien_id uuid not null references public.biens (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('vendeur', 'acquereur', 'bailleur', 'locataire', 'notaire', 'autre')),
  created_at timestamptz not null default now(),
  primary key (bien_id, contact_id, role)
);

-- ---------------------------------------------------------------------------
-- Projets (recherche ou vente / location d'un contact)
-- ---------------------------------------------------------------------------
create table public.projets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  nature text not null default 'recherche' check (nature in ('recherche', 'vente_location')),
  transaction text not null default 'achat' check (transaction in ('achat', 'location', 'vente')),
  titre text,
  types_bien text[] not null default '{}',
  budget_min integer,
  budget_max integer,
  pieces_min smallint,
  pieces_max smallint,
  surface_min numeric(8, 2),
  surface_max numeric(8, 2),
  communes jsonb not null default '[]', -- [{"code_postal": "42300", "ville": "ROANNE"}]
  exigences text[] not null default '{}', -- ascenseur, extérieur, garage…
  actif boolean not null default true,
  alerte_sms boolean not null default false,
  alerte_email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rapprochements projet ↔ bien
-- ---------------------------------------------------------------------------
create table public.rapprochements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bien_id uuid not null references public.biens (id) on delete cascade,
  projet_id uuid not null references public.projets (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  explication text,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'envoye', 'ecarte', 'visite')),
  avis text check (avis in ('interesse', 'en_attente', 'pas_interesse')),
  envoye_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bien_id, projet_id)
);

-- ---------------------------------------------------------------------------
-- Analyses IA d'un bien (estimation, avis de valeur…)
-- ---------------------------------------------------------------------------
create table public.bien_analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bien_id uuid not null references public.biens (id) on delete cascade,
  type text not null default 'estimation' check (type in ('estimation', 'avis_valeur', 'travaux', 'autre')),
  note_source text, -- note brute du conseiller
  valeur_basse integer,
  valeur_probable integer,
  valeur_haute integer,
  prix_m2 integer,
  points_forts text[] not null default '{}',
  points_faibles text[] not null default '{}',
  synthese text,
  details jsonb not null default '{}', -- comparables, hypothèses, sources (DVF…)
  modele text,
  created_at timestamptz not null default now()
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
  contact_id uuid references public.contacts (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- File Laforêt : biens, contacts et projets
-- ---------------------------------------------------------------------------
alter table public.laforet_sync drop constraint if exists laforet_sync_entite_check;
alter table public.laforet_sync
  add constraint laforet_sync_entite_check check (entite in ('bien', 'contact', 'projet', 'client'));

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
    case tg_table_name when 'biens' then 'bien' when 'contacts' then 'contact' else 'projet' end,
    v_row.id,
    case tg_op when 'INSERT' then 'creation' when 'UPDATE' then 'modification' else 'suppression' end,
    to_jsonb(v_row)
  );
  return v_row;
end;
$$;

create trigger biens_laforet_sync after insert or update or delete on public.biens
  for each row execute function public.enqueue_laforet_sync();
create trigger contacts_laforet_sync after insert or update or delete on public.contacts
  for each row execute function public.enqueue_laforet_sync();
create trigger projets_laforet_sync after insert or update or delete on public.projets
  for each row execute function public.enqueue_laforet_sync();

create trigger biens_touch before update on public.biens
  for each row execute function public.touch_updated_at();
create trigger contacts_touch before update on public.contacts
  for each row execute function public.touch_updated_at();
create trigger projets_touch before update on public.projets
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS : chaque conseiller ne voit que ses données
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'biens', 'bien_pieces', 'bien_images', 'contacts', 'bien_contacts',
    'projets', 'rapprochements', 'bien_analyses', 'taches'
  ] loop
    execute format('alter table public.%I enable row level security', t);
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

create index biens_statut_idx on public.biens (owner_id, statut);
create index biens_ville_idx on public.biens (owner_id, code_postal, ville);
create index bien_pieces_bien_idx on public.bien_pieces (bien_id, ordre);
create index bien_images_bien_idx on public.bien_images (bien_id, ordre);
create index bien_contacts_contact_idx on public.bien_contacts (contact_id);
create index projets_contact_idx on public.projets (contact_id);
create index rapprochements_projet_idx on public.rapprochements (projet_id);
create index bien_analyses_bien_idx on public.bien_analyses (bien_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Stockage des photos : bucket privé « biens », un dossier par conseiller (<owner_id>/<bien_id>/…)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('biens', 'biens', false)
on conflict (id) do nothing;

create policy "photos personnelles" on storage.objects
  for all to authenticated
  using (bucket_id = 'biens' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'biens' and (storage.foldername(name))[1] = (select auth.uid())::text);
