-- Fase 2 · Paso 7 (parte 3): clientes y proveedores (B11) y pagos recurrentes (B10). docs/specs/03-negocio.md §3 y §6.

-- ─────────────────────────────────────────────────────────────
-- Clientes y proveedores. Son DEL NEGOCIO: Sirumi solo los guarda por encargo (Ley 1581).
-- Nunca se cruzan entre negocios ni se usan para mercadeo propio.
-- ─────────────────────────────────────────────────────────────
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('cliente', 'proveedor')),
  name text not null check (length(trim(name)) > 0),
  doc_type text check (doc_type in ('cedula', 'nit', 'ce', 'pasaporte')),
  doc_number text,
  phone text,
  email text,
  address text,
  city text,
  notes text,
  -- La persona del contacto autorizó guardar sus datos: sin eso no se guarda.
  data_consent boolean not null check (data_consent),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contacts_business_idx on public.contacts (business_id, name);
create trigger contacts_updated_at before update on public.contacts for each row execute function public.tocar_updated_at();
alter table public.contacts enable row level security;
create policy "Los miembros ven los contactos" on public.contacts for select to authenticated using (public.es_miembro(business_id));
create policy "El dueño crea contactos" on public.contacts for insert to authenticated with check (public.es_dueno(business_id));
create policy "El dueño edita contactos" on public.contacts for update to authenticated using (public.es_dueno(business_id)) with check (public.es_dueno(business_id));
create policy "El dueño borra contactos" on public.contacts for delete to authenticated using (public.es_dueno(business_id));
revoke all on public.contacts from anon;

-- ─────────────────────────────────────────────────────────────
-- Pagos recurrentes (arriendo, nómina…): la app recuerda, la persona confirma.
-- ─────────────────────────────────────────────────────────────
create table public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind text not null default 'fijo' check (kind in ('fijo', 'variable')),
  amount bigint not null check (amount > 0),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  account_id uuid references public.accounts (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index recurring_payments_business_idx on public.recurring_payments (business_id);
alter table public.recurring_payments enable row level security;
create policy "Los miembros ven los pagos recurrentes" on public.recurring_payments for select to authenticated using (public.es_miembro(business_id));
create policy "El dueño crea pagos recurrentes" on public.recurring_payments for insert to authenticated
  with check (public.es_dueno(business_id) and (account_id is null or public.cuenta_del_negocio(account_id, business_id)));
create policy "El dueño edita pagos recurrentes" on public.recurring_payments for update to authenticated
  using (public.es_dueno(business_id))
  with check (public.es_dueno(business_id) and (account_id is null or public.cuenta_del_negocio(account_id, business_id)));
create policy "El dueño borra pagos recurrentes" on public.recurring_payments for delete to authenticated using (public.es_dueno(business_id));
revoke all on public.recurring_payments from anon;

-- ─────────────────────────────────────────────────────────────
-- Movimientos: contacto (opcional) y pago recurrente de origen. Deben ser del mismo negocio.
-- ─────────────────────────────────────────────────────────────
alter table public.movements
  add column contact_id uuid references public.contacts (id) on delete set null,
  add column recurring_id uuid references public.recurring_payments (id) on delete set null;
alter table public.movements add constraint movements_contacto_solo_negocio check (owner_type = 'negocio' or (contact_id is null and recurring_id is null));
create index movements_contact_idx on public.movements (contact_id) where contact_id is not null;

create or replace function public.contacto_del_negocio(contacto uuid, negocio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.contacts where id = contacto and business_id = negocio);
$$;
create or replace function public.recurrente_del_negocio(recurrente uuid, negocio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.recurring_payments where id = recurrente and business_id = negocio);
$$;
revoke execute on function public.contacto_del_negocio(uuid, uuid), public.recurrente_del_negocio(uuid, uuid) from public, anon;
grant execute on function public.contacto_del_negocio(uuid, uuid), public.recurrente_del_negocio(uuid, uuid) to authenticated;

drop policy "El dueño registra movimientos del negocio" on public.movements;
drop policy "El dueño edita movimientos del negocio" on public.movements;
create policy "El dueño registra movimientos del negocio" on public.movements for insert to authenticated
  with check (
    owner_type = 'negocio' and public.es_dueno(business_id)
    and (account_id is null or public.cuenta_del_negocio(account_id, business_id))
    and (card_id is null or public.tarjeta_del_negocio(card_id, business_id))
    and (contact_id is null or public.contacto_del_negocio(contact_id, business_id))
    and (recurring_id is null or public.recurrente_del_negocio(recurring_id, business_id))
  );
create policy "El dueño edita movimientos del negocio" on public.movements for update to authenticated
  using (owner_type = 'negocio' and public.es_dueno(business_id))
  with check (
    owner_type = 'negocio' and public.es_dueno(business_id)
    and (account_id is null or public.cuenta_del_negocio(account_id, business_id))
    and (card_id is null or public.tarjeta_del_negocio(card_id, business_id))
    and (contact_id is null or public.contacto_del_negocio(contact_id, business_id))
    and (recurring_id is null or public.recurrente_del_negocio(recurring_id, business_id))
  );
