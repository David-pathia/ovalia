-- Questionnaire « Votre avis compte » : le client indique d'abord son prénom et son nom (obligatoires),
-- puis répond aux 5 questions et termine par un commentaire.
-- Signature d'un témoignage publié : prénom + initiale du nom (« Marie D. »), jamais le nom complet.
-- L'ancienne fonction repondre_avis reste en place le temps du déploiement du nouveau code.

alter table public.avis_clients add column if not exists nom text;

create or replace function public.deposer_avis(
  p_jeton text,
  p_prenom text,
  p_nom text,
  p_notes smallint[],
  p_commentaire text,
  p_publication boolean
)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_owner uuid;
  v_id uuid;
  v_prenom text := left(nullif(trim(p_prenom), ''), 60);
  v_nom text := left(nullif(trim(p_nom), ''), 80);
  v_signature text;
begin
  if v_prenom is null or v_nom is null then return 'nom'; end if;
  if p_notes is null or array_length(p_notes, 1) <> 5 then return 'invalide'; end if;
  if exists (select 1 from unnest(p_notes) n where n is null or n < 1 or n > 5) then return 'invalide'; end if;
  v_signature := case when p_publication then v_prenom || ' ' || upper(left(v_nom, 1)) || '.' end;

  if p_jeton is not null then
    select id into v_id from public.avis_clients where jeton = p_jeton and length(p_jeton) >= 16;
    if v_id is null then return 'introuvable'; end if;
    update public.avis_clients set
      prenom = v_prenom, nom = v_nom,
      note_professionnalisme = p_notes[1], note_clarte = p_notes[2], note_ecoute = p_notes[3],
      note_relation = p_notes[4], note_recommandation = p_notes[5],
      commentaire = left(nullif(trim(p_commentaire), ''), 2000),
      publication_autorisee = coalesce(p_publication, false),
      nom_publication = v_signature,
      repondu_le = now()
    where id = v_id and repondu_le is null;
    if not found then return 'deja'; end if;
    return 'ok';
  end if;

  select owner_id into v_owner from public.site_config order by created_at limit 1;
  if v_owner is null then return 'indisponible'; end if;
  insert into public.avis_clients (
    owner_id, canal, prenom, nom, note_professionnalisme, note_clarte, note_ecoute, note_relation,
    note_recommandation, commentaire, publication_autorisee, nom_publication, repondu_le
  ) values (
    v_owner, 'qr', v_prenom, v_nom, p_notes[1], p_notes[2], p_notes[3], p_notes[4], p_notes[5],
    left(nullif(trim(p_commentaire), ''), 2000), coalesce(p_publication, false), v_signature, now()
  );
  return 'ok';
end;
$$;

revoke all on function public.deposer_avis(text, text, text, smallint[], text, boolean) from public;
grant execute on function public.deposer_avis(text, text, text, smallint[], text, boolean) to anon, authenticated;
