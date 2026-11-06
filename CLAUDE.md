# CLAUDE.md — Ovalia

Tableau de bord IA pour un conseiller Laforêt Immobilier (Julien Ossedat).
Next.js 16 (App Router) + shadcn/ui (Base UI) + Tailwind 4 + Supabase, hébergé sur Vercel.
Base : template « next-shadcn-dashboard-starter » (Kiranism), nettoyé.

## Modules prévus
Aujourd'hui (tâches du jour) · Biens · Clients · Rapprochements bien ↔ client (mail de meilleur taux) ·
Estimations (DVF) et pré-saisie Laforêt Business · Avis de valeur détaillé · Mandats · Estimation travaux ·
Boîte mail · LinkedIn · Mini-site Julien Ossedat (retours de visite, avis clients, documents).

## Laforêt
Pas encore d'API. Toute création / modification de bien, contact ou projet part dans la table `laforet_sync`
(trigger SQL). Le futur connecteur ne fera que vider cette file.

Schéma calqué sur les fiches Laforêt (`supabase/migrations/20261023100000_schema_laforet.sql`) :
`biens` (+ `bien_pieces`, `bien_images`, `bien_analyses`), `contacts`, `bien_contacts` (rôle vendeur…),
`projets` (projet de recherche = critères de rapprochement), `rapprochements` (projet ↔ bien), `taches`.
Valeurs Laforêt : statut `estimation | avant_premiere | mandat_en_cours | sous_offre | suspendu` ;
type_mandat `favoriz | simple` ; type `appartement | maison | immeuble | terrain | garage | local` ;
classif_projet `court_terme | moyen_terme | long_terme`. Champs Laforêt non modélisés → `laforet_extra` (jsonb).

## Estimation (src/lib/estimation)
- `dvf.ts` (serveur) : Base Adresse Nationale → commune INSEE, communes à < 8 km (geo.api.gouv.fr),
  ventes DVF géolocalisées (files.data.gouv.fr/geo-dvf, CSV par commune et par année, cache 1 semaine) ; l'estimation
  ne retient que les ventes des 3 dernières années.
  Seules les ventes d'un seul logement (+ dépendances) sont gardées.
- `calcul.ts` (pur) : comparables par paliers (surface, pièces, terrain, rayon), indexation selon la tendance
  du secteur, médiane et quartiles pondérés (récence × similarité × distance), fourchette ±12 % max,
  ajustements qualitatifs (±30 % total), prix conseillé arrondi. **Tout est en net vendeur : aucun honoraire** (demande Julien).
- Prix net vendeur retenu : `details.prixRetenu` (saisi dans le panneau d'estimation ou dans l'avis, gardé à la relance) ;
  lire le prix avec `prixNetVendeur()` / `fourchetteNetVendeur()` (`src/lib/estimation/prix.ts`).
- `estimer.ts` : orchestre et demande à Claude les ajustements chiffrés + argumentaire + stratégie ;
  le prix ne vient jamais du modèle. Résultat dans `bien_analyses` (valeur_probable non nulle = estimation,
  nulle = lecture de la saisie rapide). Lancée en arrière-plan (`after`) après saisie / 1re mise à jour.
- Page Marché (`src/features/marche`, `/dashboard/marche`) : recherche DVF par adresse/commune + rayon + filtres,
  carte Leaflet (fonds IGN Géoplateforme sans clé, cadastre en option), indicateurs, médiane par semestre, par commune, tableau triable, export CSV (2 500 lignes max).
  Avec `?bien=<id>` : choix manuel des comparables → `estimerAvecSelection` → `marcheSurSelection` (pas de retrait des
  extrêmes). La sélection est gardée par « Relancer » (`details.selection = 'manuelle'`, `details.ventesIds`).
- Plus tard : API Laforêt (ventes du réseau) comme source de comparables prioritaire.

## Avis de valeur (src/features/avis)
- Éditeur `/dashboard/biens/[id]/avis` : prix présentés, textes, comparables (10 max), photos (bucket privé `biens`,
  converties en JPEG 2 000 px côté navigateur), pages, destinataire, conseiller, agence. Enregistré dans `bien_analyses`
  (type `avis_valeur`, valeur_probable nulle : à exclure des « lectures IA » avec `.neq('type', 'avis_valeur')`).
- PDF : route `/dashboard/biens/[id]/avis/pdf` → `pdf/render.tsx` (données, cartes IGN WMS, marché DVF 3 ans, crédit)
  → `pdf/document.tsx` (@react-pdf/renderer, charte Laforêt bleue, police Lexend dans `fonts/`, tracée par next.config).
- Annonce (page après l'estimation) : `src/lib/ai/annonce.ts` rédige titre, texte et points forts (ton sobre / chaleureux / prestige,
  rien d'inventé, ni prix ni motif de vente). Première version produite avec l'estimation (`details.annonce`), réécriture depuis
  l'éditeur (`redigerAnnonce`). Prix et mentions légales (honoraires, DPE et dépenses d'énergie, copropriété, Géorisques)
  calculés par `mentionsAnnonce` (types.ts), jamais par le modèle. Puis la frise « Les prochaines étapes » (`etapes`, modifiables).
- Couverture : photo du conseiller (`src/features/avis/assets/conseiller.jpg`, tracée par next.config) + nom, fonction,
  présentation (`conseiller.accroche`) et portable ; conseiller par défaut `CONSEILLER_DEFAUT`, puis repris du dernier avis.
- Refonte (cahier des charges Julien, nov. 2026) : ordre des pages = `PAGES_AVIS` (types.ts), « Notre avis de valeur » clôt
  toujours le dossier. `pdf/base.tsx` (charte, primitives), `pdf/document.tsx` (couverture, sommaire, secteur, comparables,
  positionnement, ajustements, DPE, méthode, annonce), `pdf/pages-laforet.tsx` (réseau et agence, équipe, accompagnement,
  Favoriz), `pdf/pages-bien.tsx` (bien synthétique, cadastre, stratégie de prix, DVF, assainissement, cible et financement,
  avis final). Contenus Laforêt dans `laforet.ts` (repris de la plaquette officielle), statistiques sourcées dans `sources.ts`
  (ne rien ajouter sans source publique datée). Photos de l'équipe : `assets/equipe/`.
- Cadastre : `parcelleDuBien(adresse)` = géocodage BAN de l'adresse exacte → parcelle rattachée à l'adresse (lookup BAN), sinon
  parcelle sous le point (API Carto IGN), sinon la plus proche (signalée « à confirmer ») ; une seule carte ortho + Parcellaire Express.
- Rayon des comparables adapté à la densité (`densiteSecteur`, `RAYONS` dans calcul.ts) : urbain 1→5 km, périurbain 2→8 km,
  rural 5→20 km ; on élargit le rayon avant d'assouplir les critères. Ventes de 3 ans maximum.
- Assainissement : page dédiée (schémas SVG, non-conformités, coûts sourcés `COUTS_ASSAINISSEMENT` : tarifs Roannaise de l'Eau
  2026, référence ministère 2013, prix constatés 2026, aides 2026). Cible acquéreur : 2-3 profils avec « notre approche ».
- Synthèse IA (`src/lib/ai/synthese.ts`) : points forts, vigilance, cible acquéreur ; produite avec l'estimation (`details.synthese`)
  ou depuis l'éditeur (`redigerSynthese`). Comparables DVF sur 3 ans uniquement.
- Photo principale (fiche du bien, `src/features/photos`) : couverture du dossier et tête de l'annonce. Colonnes
  `bien_images.principale / retouche ('fidele'|'ia') / originale_id` (migration 20261106100000). L'originale est toujours gardée.
  Retouche fidèle (`retouche.ts`, navigateur) : balance des blancs, niveaux, ombres, contraste, vibrance, verts ravivés.
  Retouche IA (`src/lib/ai/image.ts`) : Vercel AI Gateway `/v1/chat/completions` + `modalities`, modèle `google/gemini-3.1-flash-image`,
  clé `AI_GATEWAY_API_KEY` ; consignes strictes (ciel, lumière, pelouse existante, petits objets mobiles ; rien d'ajouté au
  bien ni à la végétation). Mention « Photo retouchée (lumière, ciel) » en couverture et sur l'annonce si version IA.
- Nombres : remplacer l'espace fine U+202F (absente de la police) ; préciser `lineHeight` sur les textes > 10 pt.
- Ne jamais committer de PDF ou de données de clients réels.

## Prospects et rapprochements (src/features/prospects, src/lib/rapprochement)
- Import du « tableau de pilotage » de Julien (onglet Prospection acheteur, `excel.ts` avec exceljs) depuis `/dashboard/prospects` :
  analyse → aperçu (nouveaux, modifiés, inchangés, absents) → validation. Reconnaissance par nom normalisé (`cleNom`) puis
  téléphone ; seules les lignes nouvelles ou modifiées passent par l'IA (`src/lib/ai/prospects.ts`, sans les noms) ;
  communes résolues via geo.api.gouv.fr. Absents du fichier → archivés (jamais supprimés).
- Contacts / projets importés : `source = 'tableau_pilotage'`, `synchro_laforet = false` (le trigger de la file Laforêt les ignore).
  Migration `20261106120000_prospects_rapprochements.sql`. Ne jamais committer le fichier ni des données de prospects.
- Score (`score.ts`, pur) : type, budget FAI (prix affiché, sinon net vendeur + 12,5 %), tolérance 5 % puis 10 % (au-delà : écarté),
  secteur (communes ou zone en km), chambres et surface minimales, critères de confort. Rapprochements ≥ 50 enregistrés ;
  statut du conseiller conservé. Recalcul : après import, estimation, modification d'un bien, bouton « Recalculer ».

## Sécurité
- `src/proxy.ts` → `src/lib/supabase/session.ts` : toute route hors `/connexion` et `/auth` exige une session.
  Sans variables Supabase, tout est fermé.
- `src/app/dashboard/layout.tsx` revérifie la session côté serveur.
- Pas d'inscription publique : les comptes sont créés depuis Supabase (Authentication → Invite user).
- RLS sur toutes les tables : `owner_id = auth.uid()`.

## Fiche d'estimation (obligatoire)
- `src/features/biens/fields.ts` : groupes `fiche: true` = fiche d'estimation Laforêt ; seuls les champs marqués `fiche: true`
  (21) sont exigés. Facultatifs : année des rénovations, isolations (combles, murs, plancher), DPE (classe, date, dépenses),
  derniers travaux, motif de vente, prix envisagé.
  Relevé des pièces : surface en m² par pièce (longueur et largeur ne servent plus qu'aux anciens relevés).
  `champsManquants()` bloque tout enregistrement (saisie rapide et fiche bien), côté client et serveur.
- Un champ peut être déclaré « Inconnu / sans objet » (colonne `biens.fiche_na`), sauf la surface habitable.
- La même liste de champs sert au formulaire, à la validation Zod et au brouillon renvoyé par l'IA.

## Conventions
- Interface en français.
- Icônes uniquement via `@/components/icons`.
- Couleurs uniquement via les tokens du thème `src/styles/themes/forest-mind.css`
  (`bg-card`, `text-muted-foreground`, `text-sauge`, `text-cuivre`, `bg-ok/15`…). Cuivre (`primary`) = actions importantes.
- Titres : `font-display` (Bricolage Grotesque). Données : Inter, chiffres en `font-mono` ou `tabular-nums`.
- Menu et ⌘K : `src/config/nav-config.ts`. Un module non livré affiche la page `dashboard/[module]`.
- Formatage : guillemets simples, JSX en guillemets simples, pas de virgule finale, indentation 2 espaces.
