-- Boîte mail : la messagerie Laforêt est un serveur BlueMind (IMAP), pas Microsoft 365.
-- On remplace la table `comptes_microsoft` (jamais utilisée) par `comptes_mail`.
-- Le mot de passe est chiffré par l'application (AES-256-GCM, clé JETONS_CHIFFREMENT_CLE dans Vercel) :
-- la base ne contient jamais de mot de passe lisible. Aucun contenu de mail n'est stocké.

drop table if exists public.comptes_microsoft;

create table if not exists public.comptes_mail (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email text,
  nom text,
  serveur text not null,
  port integer not null default 993,
  identifiant text not null,
  mot_de_passe_chiffre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comptes_mail enable row level security;
drop policy if exists "données personnelles" on public.comptes_mail;
create policy "données personnelles" on public.comptes_mail for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
