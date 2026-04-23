create table if not exists public.settings (
  id text primary key default 'main',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  church_function text,
  district text,
  whatsapp text not null,
  category_id text not null,
  custom_amount numeric(12,2) default 0,
  date_joined timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text not null,
  payment_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null,
  category text not null,
  method text not null default 'Espèces',
  created_at timestamptz not null default now()
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  amount numeric(12,2) not null check (amount > 0),
  deposit_date date not null,
  bordereau_ref text,
  is_deposited boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  member_name text,
  whatsapp text not null,
  message_type text not null,
  message_body text not null,
  provider_status text,
  provider_response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_whatsapp on public.members(whatsapp);
create index if not exists idx_payments_member_id on public.payments(member_id);
create index if not exists idx_payments_date on public.payments(payment_date);
create index if not exists idx_expenses_date on public.expenses(expense_date);
create index if not exists idx_deposits_date on public.deposits(deposit_date);
create index if not exists idx_whatsapp_logs_created_at on public.whatsapp_logs(created_at desc);

