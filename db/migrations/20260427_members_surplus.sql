-- Add consolidated_surplus to members table
alter table public.members add column if not exists consolidated_surplus numeric(12,2) default 0;
