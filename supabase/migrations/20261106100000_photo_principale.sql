-- Photo principale du bien (couverture du dossier et photo de tête de l'annonce) et versions retouchées.
alter table public.bien_images
  add column if not exists principale boolean not null default false,
  add column if not exists retouche text check (retouche in ('fidele', 'ia')),
  add column if not exists originale_id uuid references public.bien_images (id) on delete cascade;

-- Une seule photo principale par bien.
create unique index if not exists bien_images_principale_unique on public.bien_images (bien_id) where principale;
create index if not exists bien_images_originale_idx on public.bien_images (originale_id);
