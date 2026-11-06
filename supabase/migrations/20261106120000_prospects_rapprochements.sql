-- Prospects acquéreurs importés du tableau de pilotage de Julien, et rapprochements bien ↔ projet de recherche.
-- Les prospects importés ne partent pas dans la file de synchronisation Laforêt (synchro_laforet = false).

alter table public.contacts
  add column if not exists synchro_laforet boolean not null default true,
  add column if not exists archive boolean not null default false,
  add column if not exists source text,
  add column if not exists cle_import text, -- nom normalisé (lettres triées) pour reconnaître le prospect d'un import à l'autre
  add column if not exists importe_le timestamptz;

create index if not exists contacts_cle_import_idx on public.contacts (owner_id, cle_import);

alter table public.projets
  add column if not exists synchro_laforet boolean not null default true,
  add column if not exists chambres_min smallint,
  add column if not exists localisation_texte text, -- texte d'origine du tableau
  add column if not exists informations text, -- texte d'origine du tableau
  add column if not exists zone jsonb, -- {"ville": "Roanne", "lat": 46.03, "lon": 4.07, "rayon_km": 15}
  add column if not exists criteres jsonb not null default '{}', -- {"garage": true, "terrain_min": 800, "plain_pied": true, …}
  add column if not exists date_contact date,
  add column if not exists import_brut jsonb, -- ligne du tableau telle qu'importée (détection des changements)
  add column if not exists import_hash text;

alter table public.rapprochements
  add column if not exists details jsonb not null default '[]', -- [{"critere": "budget", "etat": "ok", "texte": "…"}]
  add column if not exists prix_compare integer,
  add column if not exists calcule_le timestamptz not null default now();

-- La file Laforêt ignore les lignes marquées synchro_laforet = false (prospects importés).
create or replace function public.enqueue_laforet_sync()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_row record;
  v_json jsonb;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;
  v_json := to_jsonb(v_row);
  if v_json ? 'synchro_laforet' and (v_json ->> 'synchro_laforet')::boolean is false then
    return v_row;
  end if;
  insert into public.laforet_sync (owner_id, entite, entite_id, operation, payload)
  values (
    v_row.owner_id,
    case tg_table_name when 'biens' then 'bien' when 'contacts' then 'contact' else 'projet' end,
    v_row.id,
    case tg_op when 'INSERT' then 'creation' when 'UPDATE' then 'modification' else 'suppression' end,
    v_json
  );
  return v_row;
end;
$$;
