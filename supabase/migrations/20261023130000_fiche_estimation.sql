-- Ovalia : champs de la fiche d'estimation Laforêt (obligatoires à l'enregistrement, sauf mention « inconnu / sans objet »)

alter table public.biens
  -- 1. Informations générales
  add column if not exists annee_renovations text,
  add column if not exists nb_niveaux smallint,
  -- 2. Construction et isolation
  add column if not exists type_construction text,
  add column if not exists isolation_combles text,
  add column if not exists isolation_murs text,
  add column if not exists isolation_plancher text,
  add column if not exists fenetres text,
  add column if not exists toiture text,
  -- 3. Chauffage et équipements
  add column if not exists chauffage_systeme text,
  add column if not exists chauffage_energie text,
  add column if not exists chauffage_annee smallint,
  add column if not exists eau_chaude text,
  add column if not exists ventilation text,
  add column if not exists assainissement text,
  -- 4. Charges, diagnostics et travaux
  add column if not exists consommation_energie_annuelle integer,
  add column if not exists derniers_travaux text,
  add column if not exists travaux_a_prevoir text,
  add column if not exists documents_disponibles text,
  -- 5. Extérieurs et projet de vente
  add column if not exists garage text,
  add column if not exists sous_sol_dependances text,
  add column if not exists annexes text,
  add column if not exists orientation text,
  add column if not exists motif_vente text,
  add column if not exists prix_envisage integer,
  -- Champs déclarés « inconnu / sans objet » par le conseiller, et observations libres
  add column if not exists fiche_na text[] not null default '{}',
  add column if not exists observations text;

alter table public.bien_pieces
  add column if not exists longueur numeric(6, 2),
  add column if not exists largeur numeric(6, 2);

-- Reprise des informations déjà extraites par la saisie rapide
update public.biens
set chauffage_systeme = coalesce(chauffage_systeme, laforet_extra ->> 'chauffage')
where laforet_extra ? 'chauffage';
