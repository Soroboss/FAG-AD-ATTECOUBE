-- Consentement communication SMS/WhatsApp
alter table public.members add column if not exists comms_opt_in boolean not null default true;
