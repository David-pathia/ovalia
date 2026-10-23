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
  ventes DVF géolocalisées (files.data.gouv.fr/geo-dvf, CSV par commune et par année, cache 1 semaine).
  Seules les ventes d'un seul logement (+ dépendances) sont gardées.
- `calcul.ts` (pur) : comparables par paliers (surface, pièces, terrain, rayon), indexation selon la tendance
  du secteur, médiane et quartiles pondérés (récence × similarité × distance), fourchette ±12 % max,
  ajustements qualitatifs (±30 % total), prix conseillé FAI avec 12,5 % d'honoraires (`TAUX_HONORAIRES`).
- `estimer.ts` : orchestre et demande à Claude les ajustements chiffrés + argumentaire + stratégie ;
  le prix ne vient jamais du modèle. Résultat dans `bien_analyses` (valeur_probable non nulle = estimation,
  nulle = lecture de la saisie rapide). Lancée en arrière-plan (`after`) après saisie / 1re mise à jour.
- Plus tard : API Laforêt (ventes du réseau) comme source de comparables prioritaire.

## Sécurité
- `src/proxy.ts` → `src/lib/supabase/session.ts` : toute route hors `/connexion` et `/auth` exige une session.
  Sans variables Supabase, tout est fermé.
- `src/app/dashboard/layout.tsx` revérifie la session côté serveur.
- Pas d'inscription publique : les comptes sont créés depuis Supabase (Authentication → Invite user).
- RLS sur toutes les tables : `owner_id = auth.uid()`.

## Fiche d'estimation (obligatoire)
- `src/features/biens/fields.ts` : groupes `fiche: true` = fiche d'estimation Laforêt (31 champs) + relevé des pièces
  (longueur × largeur). `champsManquants()` bloque tout enregistrement (saisie rapide et fiche bien), côté client et serveur.
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
