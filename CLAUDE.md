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

## Aujourd'hui (src/features/today, /dashboard)
- Une seule feuille de route, classée En retard / Aujourd'hui / Cette semaine / À anticiper (heure de Paris, `dates.ts`).
  Collecte dans `data.ts` (serveur) ; rien n'est stocké en dehors des tâches : une action disparaît quand le dossier change.
- Sources : tâches (`taches`, ajout rapide, cocher, reporter à demain) ; relances vendeurs (`biens.prochain_contact`,
  boutons +7 / +15 / +30 j) ; fins de mandat (`mandat_fin`, 30 j avant et après) ; rapprochements « nouveau » ≥ 70 % groupés
  par bien (Contacté / Écarter) ; avis de valeur à préparer puis relance 10 j après sans mandat ; témoignages à valider et
  avis à demander (biens sous offre) ; acquéreurs sans contact depuis 45 j (`projets.date_contact`).
- Boîte mail : dernier tri lu dans le localStorage (`ovalia.tri-boite`, même clé que la page Boîte mail).

## Note vocale (src/features/note, /dashboard/note)
- Bouton « Note » dans l'en-tête (toutes les pages) et page `/dashboard/note` (gros bouton, ouverte par l'icône du téléphone).
- Enregistrement et transcription repris de la dictée (`/api/dictee`), puis `lireNote` → `src/lib/ai/note.ts` : actions datées
  (type de tâche, date/heure calculées depuis « demain », « jeudi »…), biens et contacts reconnus par numéro dans une liste
  fournie (jamais d'identifiant venu de l'IA). Le conseiller coche / corrige, puis `enregistrerNote` crée les `taches`.
  Sans IA ou en cas d'échec : la note entière devient une tâche « Note vocale à traiter » (rien n'est perdu).
- Installable sur l'écran d'accueil : `app/manifest.ts` (start_url `/dashboard/note`), icônes `app/icon.tsx` et `app/apple-icon.tsx`
  (publiques dans `PUBLIC_PATHS`). Pas de raccourci Siri pour l'instant (il faudrait une clé personnelle, donc une migration).

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

## Dictée (src/features/dictee, /api/dictee)
- Bouton « Dicter » : saisie rapide (texte ajouté à la note) et fiche bien / fiche de la saisie (« Dicter des informations »).
- Navigateur : micro avec suppression de bruit et d'écho, 2 min max, converti en WAV 16 kHz mono (`enregistreur.ts`) puis envoyé
  en corps brut à `/api/dictee` (limite Vercel 4,5 Mo ; les actions serveur sont limitées à 1 Mo).
- Transcription (`src/lib/ai/dictee.ts`) : Vercel AI Gateway `/v4/ai/transcription-model`, modèle `openai/gpt-transcribe`
  (`DICTEE_MODELE` pour en changer), repli sur `google/gemini-3-flash` ; clé `AI_GATEWAY_API_KEY`. Audio jamais stocké.
- Lecture IA (`actions.ts`, consigne de la saisie rapide) → propositions champ par champ (`propositions.ts`, pur) que le
  conseiller coche ; textes libres ajoutés à la suite, listes complétées, pièces ajoutées ou mises à jour. Rien n'est
  enregistré sans clic sur « Enregistrer ».

## Pièces jointes (src/features/pieces-jointes)
- Bouton « Joindre des fichiers » : saisie rapide (étape 1, à côté de « Dicter ») et panneau « Dicter ou joindre des
  informations » (saisie étape 2 et fiche bien). Photos (converties en JPEG 2 000 px) et PDF (10 Mo max), 10 pièces par lecture.
- Dépôt direct navigateur → bucket privé `biens` (actions serveur limitées à 1 Mo) : photos `<uid>/<bien>/<uuid>.jpg`
  (+ `bien_images`), PDF `<uid>/<bien>/documents/<uuid8>-<nom>.pdf`. Pendant une saisie : `<uid>/brouillons/<uuid>/`,
  rangées par `rangerPieces` à l'enregistrement. Aucune table : les documents sont listés depuis le stockage (`documentsDuBien`).
- Lecture IA (`lecture.ts`, `demanderContenu`) : photos et PDF envoyés à Claude avec la note ou la dictée (20 Mo au total),
  consigne `CONSIGNE_PIECES` (valeurs des documents reprises, déductions tirées des photos signalées à vérifier, la note prime).

## Prospects et rapprochements (src/features/prospects, src/lib/rapprochement)
- Import du « tableau de pilotage » de Julien (onglet Prospection acheteur, `excel.ts` avec exceljs) depuis `/dashboard/prospects` :
  analyse → aperçu (nouveaux, modifiés, inchangés, absents) → validation. Reconnaissance par nom normalisé (`cleNom`) puis
  téléphone ; seules les lignes nouvelles ou modifiées passent par l'IA (`src/lib/ai/prospects.ts`, sans les noms) ;
  communes résolues via geo.api.gouv.fr. Absents du fichier → archivés (jamais supprimés).
- Contacts / projets importés : `source = 'tableau_pilotage'`, `synchro_laforet = false` (le trigger de la file Laforêt les ignore).
  Migration `20261106120000_prospects_rapprochements.sql`. Ne jamais committer le fichier ni des données de prospects.
- Score (`score.ts`, pur) : type, budget FAI (prix affiché, sinon net vendeur + honoraires de la fiche, sinon + barème Laforêt
  `honoraires.ts` appliqué au net : 6 000 / 7 500 / 9 000 € jusqu'à 60 / 100 / 150 k€, puis 6 %), fourchette −15 % / +5 % du budget (en dehors : écarté),
  secteur (communes ou zone en km), chambres et surface minimales, critères de confort. Rapprochements ≥ 50 enregistrés ;
  statut du conseiller conservé. Recalcul : après import, estimation, modification d'un bien, bouton « Recalculer ».

## Site public de Julien (src/app/site, src/features/site)
- Pages publiques sous `/site` (ajouté aux `PUBLIC_PATHS` de session.ts) : accueil, mon histoire, valeurs, Julien & Laforêt,
  méthode, contact, mentions légales. Contenus dans `contenu.ts`, repris du cahier des charges de Julien : rien d'inventé.
- Charte claire en bleus (`src/styles/themes/julien.css`, variables redéfinies sur `[data-site='julien']`, police Lexend).
- Non référencé (`robots: noindex`) et sans logo Laforêt tant que l'agence n'a pas validé l'usage de la marque.
- WhatsApp via lien `wa.me` prérempli ; QR code et liens dans `/dashboard/mini-site`.
- Questionnaire « Votre avis compte » (`src/features/avis-clients`) : pages `/site/avis` (lien général, QR code) et
  `/site/avis/[jeton]` (lien personnel, une réponse). Table `avis_clients` + `site_config` (migration 20261112100000) ;
  le public n'écrit que via les fonctions SQL `deposer_avis` / `avis_invitation` (security definer, aucune lecture).
  Parcours en 3 étapes : prénom + nom obligatoires → 5 questions → commentaire et autorisation de publication ;
  signature publiée = prénom + initiale du nom (migration 20261120130000).
  Tableau de bord et validation des témoignages : `/dashboard/avis-clients`. Aucune publication automatique.
- À venir : demande d'estimation → prospect, réservation de rendez-vous, questionnaire sur le bien visité.

## Boîte mail (src/lib/mail, src/features/mails, /dashboard/mails)
- La messagerie Laforêt est un serveur **BlueMind en IMAP** (`messagerie.laforet.com:993`), pas Microsoft 365.
- L'utilisateur saisit adresse et mot de passe dans Ovalia : vérifiés auprès du serveur, puis mot de passe chiffré
  (AES-256-GCM, `src/lib/mail/chiffrement.ts`, clé `JETONS_CHIFFREMENT_CLE`) dans `comptes_mail` (migration 20261120110000).
- Boîte ouverte en lecture seule (`readOnly`) : 30 derniers mails, aperçu tiré des 24 premiers Ko ; rien n'est copié ni marqué lu.
- « Trier ma boîte » (`src/features/mails/tri.ts`, `src/lib/ai/tri-mails.ts`, types `tri-types.ts`) : mails reçus des 10 derniers
  jours (60 max, historique cité retiré) + en-têtes des mails envoyés, croisés avec biens et vendeurs, acquéreurs, rapprochements
  et tâches/visites. Catégories : urgent (48 h), échéance, réponse à valider (brouillon), rapprochement, relance, info ; 3 priorités ;
  bilan de la semaine (proposé le vendredi). En-têtes affichés repris du serveur, jamais de l'IA. Rien n'est enregistré
  (dernier tri gardé dans le localStorage du navigateur) ; brouillons copiés ou ouverts via `mailto:`, jamais envoyés par Ovalia.
- Plus tard : envoi via SMTP `messagerie.laforet.com`, tri automatique chaque matin (il faudra alors stocker le tri).

## LinkedIn (src/lib/typefully.ts, src/features/linkedin, /dashboard/linkedin)
- Publication via **Typefully** (compte de Julien, LinkedIn relié dans Typefully) : API v2 `api.typefully.com/v2`, clé personnelle
  `TYPEFULLY_API_KEY` (Typefully → Réglages → API) ; `TYPEFULLY_SOCIAL_SET_ID` facultatif si plusieurs comptes. Jamais de scraping
  ni d'automatisation de navigateur sur LinkedIn.
- Idées et rédaction IA (`src/lib/ai/linkedin.ts`) à partir des biens récents (type, commune, surface, statut, prix affiché) :
  ni nom, ni adresse, ni note interne. Envoi en brouillon (par défaut), au prochain créneau ou à une date. Rien n'est stocké dans
  Supabase : Typefully garde brouillons, programmés et publiés.

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

## Travail à plusieurs (Julien et David)
- `main` = production (déploiement Vercel automatique). Julien et David ont tous deux un accès complet : chacun peut
  fusionner lui-même ses pull requests. Habitude conseillée : une branche par sujet (`julien/<sujet>` ou `david/<sujet>`),
  committer, pousser la branche, ouvrir une pull request, tester sa version Vercel (« Preview »), puis fusionner.
  Avant de travailler : revenir sur `main` et le mettre à jour (`git pull`).
- Migrations SQL : toujours écrire le fichier dans `supabase/migrations/` (committé avec le code). Seul David a accès
  à Supabase : une PR qui contient une migration ne se fusionne pas seule ; la signaler à David, qui l'exécute
  (SQL Editor) **avant** la fusion du code qui en dépend.
- Ne jamais committer `.env.local`, de clé API, de mot de passe ni de données de clients ou de prospects.
- Avant de proposer une PR : `npx tsc --noEmit -p .` sans erreur, et `npx oxfmt --write` sur les fichiers modifiés.

## Conventions
- Interface en français.
- Icônes uniquement via `@/components/icons`.
- Couleurs uniquement via les tokens du thème `src/styles/themes/forest-mind.css`
  (`bg-card`, `text-muted-foreground`, `text-sauge`, `text-cuivre`, `bg-ok/15`…). Cuivre (`primary`) = actions importantes.
- Titres : `font-display` (Bricolage Grotesque). Données : Inter, chiffres en `font-mono` ou `tabular-nums`.
- Menu et ⌘K : `src/config/nav-config.ts`. Un module non livré affiche la page `dashboard/[module]`.
- Formatage : guillemets simples, JSX en guillemets simples, pas de virgule finale, indentation 2 espaces.
