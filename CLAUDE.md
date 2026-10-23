# CLAUDE.md — Ovalia

Tableau de bord IA pour un conseiller Laforêt Immobilier (Julien Ossedat).
Next.js 16 (App Router) + shadcn/ui (Base UI) + Tailwind 4 + Supabase, hébergé sur Vercel.
Base : template « next-shadcn-dashboard-starter » (Kiranism), nettoyé.

## Modules prévus
Aujourd'hui (tâches du jour) · Biens · Clients · Rapprochements bien ↔ client (mail de meilleur taux) ·
Estimations (DVF) et pré-saisie Laforêt Business · Avis de valeur détaillé · Mandats · Estimation travaux ·
Boîte mail · LinkedIn · Mini-site Julien Ossedat (retours de visite, avis clients, documents).

## Laforêt
Pas encore d'API. Toute création / modification de bien ou client part dans la table `laforet_sync`
(trigger SQL). Le futur connecteur ne fera que vider cette file.

## Sécurité
- `src/proxy.ts` → `src/lib/supabase/session.ts` : toute route hors `/connexion` et `/auth` exige une session.
  Sans variables Supabase, tout est fermé.
- `src/app/dashboard/layout.tsx` revérifie la session côté serveur.
- Pas d'inscription publique : les comptes sont créés depuis Supabase (Authentication → Invite user).
- RLS sur toutes les tables : `owner_id = auth.uid()`.

## Conventions
- Interface en français.
- Icônes uniquement via `@/components/icons`.
- Couleurs uniquement via les tokens du thème `src/styles/themes/forest-mind.css`
  (`bg-card`, `text-muted-foreground`, `text-sauge`, `text-cuivre`, `bg-ok/15`…). Cuivre (`primary`) = actions importantes.
- Titres : `font-display` (Bricolage Grotesque). Données : Inter, chiffres en `font-mono` ou `tabular-nums`.
- Menu et ⌘K : `src/config/nav-config.ts`. Un module non livré affiche la page `dashboard/[module]`.
- Formatage : guillemets simples, JSX en guillemets simples, pas de virgule finale, indentation 2 espaces.
