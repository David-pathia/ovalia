-- Questionnaire « Votre avis compte » (site de Julien) : avis sur l'accompagnement après une visite.
-- Les visiteurs n'ont pas de compte : ils ne peuvent qu'enregistrer leur réponse via deux fonctions sécurisées,
-- sans jamais lire la table. Aucune publication automatique : Julien valide chaque témoignage.

-- Propriétaire du site public (le compte Ovalia de Julien), qui reçoit les avis déposés via le lien général.
create table if not exists public.site_config (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.site_config enable row level security;
drop policy if exists "données personnelles" on public.site_config;
create policy "données personnelles" on public.site_config for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create table if not exists public.avis_clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  jeton text unique, -- lien personnel ; nul pour un avis déposé via le lien général (QR code)
  prenom text,
  telephone text,
  bien_id uuid references public.biens (id) on delete set null,
  canal text check (canal in ('whatsapp', 'sms', 'lien', 'qr')),
  note_professionnalisme smallint check (note_professionnalisme between 1 and 5),
  note_clarte smallint check (note_clarte between 1 and 5),
  note_ecoute smallint check (note_ecoute between 1 and 5),
  note_relation smallint check (note_relation between 1 and 5),
  note_recommandation smallint check (note_recommandation between 1 and 5),
  commentaire text,
  publication_autorisee boolean not null default false,
  nom_publication text,
  publication text not null default 'a_valider' check (publication in ('a_valider', 'publie', 'refuse')),
  repondu_le timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists avis_clients_owner_idx on public.avis_clients (owner_id, repondu_le desc);
alter table public.avis_clients enable row level security;
drop policy if exists "données personnelles" on public.avis_clients;
create policy "données personnelles" on public.avis_clients for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Lecture minimale d'une invitation pour la page publique : prénom et état, rien d'autre.
create or replace function public.avis_invitation(p_jeton text)
returns table (prenom text, repondu boolean)
language sql
security definer set search_path = ''
stable
as $$
  select a.prenom, a.repondu_le is not null
  from public.avis_clients a
  where a.jeton = p_jeton and length(p_jeton) >= 16;
$$;

-- Enregistrement d'une réponse : via un lien personnel (jeton) ou via le lien général (jeton nul).
create or replace function public.repondre_avis(
  p_jeton text,
  p_notes smallint[],
  p_commentaire text,
  p_publication boolean,
  p_nom text
)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_owner uuid;
  v_id uuid;
begin
  if p_notes is null or array_length(p_notes, 1) <> 5 then return 'invalide'; end if;
  if exists (select 1 from unnest(p_notes) n where n is null or n < 1 or n > 5) then return 'invalide'; end if;

  if p_jeton is not null then
    select id into v_id from public.avis_clients where jeton = p_jeton and length(p_jeton) >= 16;
    if v_id is null then return 'introuvable'; end if;
    update public.avis_clients set
      note_professionnalisme = p_notes[1], note_clarte = p_notes[2], note_ecoute = p_notes[3],
      note_relation = p_notes[4], note_recommandation = p_notes[5],
      commentaire = left(nullif(trim(p_commentaire), ''), 2000),
      publication_autorisee = coalesce(p_publication, false),
      nom_publication = case when p_publication then left(nullif(trim(p_nom), ''), 80) end,
      repondu_le = now()
    where id = v_id and repondu_le is null;
    if not found then return 'deja'; end if;
    return 'ok';
  end if;

  select owner_id into v_owner from public.site_config order by created_at limit 1;
  if v_owner is null then return 'indisponible'; end if;
  insert into public.avis_clients (
    owner_id, canal, note_professionnalisme, note_clarte, note_ecoute, note_relation, note_recommandation,
    commentaire, publication_autorisee, nom_publication, repondu_le
  ) values (
    v_owner, 'qr', p_notes[1], p_notes[2], p_notes[3], p_notes[4], p_notes[5],
    left(nullif(trim(p_commentaire), ''), 2000), coalesce(p_publication, false),
    case when p_publication then left(nullif(trim(p_nom), ''), 80) end, now()
  );
  return 'ok';
end;
$$;

revoke all on function public.avis_invitation(text) from public;
revoke all on function public.repondre_avis(text, smallint[], text, boolean, text) from public;
grant execute on function public.avis_invitation(text) to anon, authenticated;
grant execute on function public.repondre_avis(text, smallint[], text, boolean, text) to anon, authenticated;
