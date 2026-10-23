-- Ovalia : grille de taux de crédit et hypothèses de financement, une ligne par conseiller.
create table public.parametres_credit (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  taux_15 numeric(5, 3),
  taux_20 numeric(5, 3),
  taux_25 numeric(5, 3),
  usure_10_20 numeric(5, 3),
  usure_20_plus numeric(5, 3),
  source text,
  taux_du date,
  apport_pct numeric(5, 2) not null default 10,
  assurance_pct numeric(5, 3) not null default 0.30,
  notaire_pct numeric(5, 2) not null default 7.5,
  updated_at timestamptz not null default now()
);

alter table public.parametres_credit enable row level security;

create policy "données personnelles" on public.parametres_credit
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create trigger parametres_credit_touch before update on public.parametres_credit
  for each row execute function public.touch_updated_at();
