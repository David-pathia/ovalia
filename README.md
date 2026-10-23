# Ovalia

Poste de pilotage IA pour conseiller immobilier Laforêt — charte **Forest Mind** (« Explorer • Apprendre • Agir »).

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés Supabase
npm run dev
```

## Supabase

1. Appliquer `supabase/migrations/*.sql` (SQL Editor, ou `supabase db push`).
2. Authentication → URL Configuration : ajouter l'URL du site et `<url>/auth/callback` dans les Redirect URLs.
3. Authentication → Sign In / Providers : désactiver « Allow new users to sign up ».
4. Authentication → Users → Invite user pour créer chaque compte.

## Variables d'environnement (Vercel)

| Nom | Où le trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_APP_URL` | URL publique du site (ex. `https://ovalia.vercel.app`) |

Template d'origine : [next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) (MIT).
