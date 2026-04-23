-- Pièce jointe / lien justificatif pour les décharges comité (InsForge / Postgres)
alter table public.deposits add column if not exists bordereau_url text;
