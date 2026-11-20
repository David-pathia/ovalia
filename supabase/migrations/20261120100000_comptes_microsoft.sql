-- Boîte mail : connexion du compte Microsoft 365 (adresse Laforêt) via l'API Microsoft Graph.
-- Un compte par utilisateur Ovalia. Les jetons sont chiffrés par l'application (AES-256-GCM,
-- clé JETONS_CHIFFREMENT_CLE dans Vercel) : la base ne contient jamais de jeton lisible.
-- Aucun contenu de mail n'est stocké : la page lit la boîte en direct.

create table if not exists public.comptes_microsoft (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email text,
  nom text,
  access_token_chiffre text not null,
  refresh_token_chiffre text not null,
  expire_le timestamptz not null,
  scopes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comptes_microsoft enable row level security;
drop policy if exists "données personnelles" on public.comptes_microsoft;
create policy "données personnelles" on public.comptes_microsoft for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
