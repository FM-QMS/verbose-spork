-- ───────────────────────────────────────────────────────────────
-- MSM Devices table
-- Stores MSM device requests created from the Logistics → MSM Device tab.
-- Mirrors the conventions used by the `returns` table.
-- ───────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.msm_devices (
  id              uuid primary key default gen_random_uuid(),
  date            date        not null default current_date,
  patient_id      text        not null,
  products        text[]      not null default '{}',
  device_status   text        not null default 'Pending'
                              check (device_status in ('Pending', 'Mailed')),
  date_mailed     date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists msm_devices_patient_id_idx    on public.msm_devices (patient_id);
create index if not exists msm_devices_device_status_idx on public.msm_devices (device_status);
create index if not exists msm_devices_date_idx          on public.msm_devices (date desc);

-- Auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists msm_devices_set_updated_at on public.msm_devices;
create trigger msm_devices_set_updated_at
  before update on public.msm_devices
  for each row execute function public.set_updated_at();

-- RLS — same permissive pattern as `returns`
alter table public.msm_devices enable row level security;

drop policy if exists "anyone can read msm_devices"   on public.msm_devices;
drop policy if exists "anyone can insert msm_devices" on public.msm_devices;
drop policy if exists "anyone can update msm_devices" on public.msm_devices;
drop policy if exists "anyone can delete msm_devices" on public.msm_devices;

create policy "anyone can read msm_devices"
  on public.msm_devices for select using (true);

create policy "anyone can insert msm_devices"
  on public.msm_devices for insert with check (true);

create policy "anyone can update msm_devices"
  on public.msm_devices for update using (true) with check (true);

create policy "anyone can delete msm_devices"
  on public.msm_devices for delete using (true);
