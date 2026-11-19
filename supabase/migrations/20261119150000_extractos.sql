-- Regla B9: importar el extracto del banco (CSV o Excel), en el negocio (por cuenta) o en personal.
-- Cada extracto queda registrado ("Bancolombia · agosto 2026"). Importar y deshacer son de una sola vez:
-- movimientos + ajuste del saldo inicial (para que el saldo de hoy no cambie) + registro.

create table public.statement_imports (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('personal', 'negocio')),
  user_id uuid references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  file_name text,
  rows integer not null default 0,
  inflows bigint not null default 0,
  outflows bigint not null default 0,
  -- Lo que se le sumó al saldo inicial de la cuenta (B9). Al deshacer se resta.
  adjustment bigint not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((owner_type = 'personal' and user_id is not null and business_id is null and account_id is null)
      or (owner_type = 'negocio' and business_id is not null and account_id is not null))
);
create index statement_imports_dueno_idx on public.statement_imports (business_id, month);
create index statement_imports_usuario_idx on public.statement_imports (user_id, month);
alter table public.statement_imports enable row level security;
create policy "Cada quien ve sus extractos; en el negocio, el dueño" on public.statement_imports for select to authenticated
  using ((owner_type = 'personal' and user_id = (select auth.uid())) or (owner_type = 'negocio' and public.es_dueno(business_id)));
revoke all on public.statement_imports from anon;
revoke insert, update, delete on public.statement_imports from authenticated;

alter table public.movements add column import_id uuid references public.statement_imports (id) on delete set null;
create index movements_import_idx on public.movements (import_id) where import_id is not null;

-- datos = { ambito: 'negocio' | 'personal', business_id, account_id, month: 'AAAA-MM', file_name,
--           rows: [{ date, description, amount (con signo: + entra, − sale), kind, category_id }] } → id
create or replace function public.importar_extracto(datos jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  usuario uuid := (select auth.uid());
  ambito text := datos ->> 'ambito';
  negocio uuid := nullif(datos ->> 'business_id', '')::uuid;
  cuenta uuid := nullif(datos ->> 'account_id', '')::uuid;
  registro uuid;
  fila jsonb;
  monto bigint;
  tipo text;
  categoria uuid;
  entradas bigint := 0;
  salidas bigint := 0;
  n integer := 0;
begin
  if usuario is null then raise exception 'sinPermiso' using errcode = '42501'; end if;
  if ambito = 'negocio' then
    if negocio is null or not public.es_dueno(negocio) or cuenta is null or not public.cuenta_del_negocio(cuenta, negocio) then
      raise exception 'sinPermiso' using errcode = '42501';
    end if;
    insert into public.statement_imports (owner_type, business_id, account_id, month, file_name)
    values ('negocio', negocio, cuenta, datos ->> 'month', nullif(datos ->> 'file_name', '')) returning id into registro;
  elsif ambito = 'personal' then
    insert into public.statement_imports (owner_type, user_id, month, file_name)
    values ('personal', usuario, datos ->> 'month', nullif(datos ->> 'file_name', '')) returning id into registro;
  else
    raise exception 'ambitoInvalido' using errcode = 'P0001';
  end if;

  for fila in select * from jsonb_array_elements(coalesce(datos -> 'rows', '[]'::jsonb)) loop
    monto := (fila ->> 'amount')::bigint;
    tipo := fila ->> 'kind';
    if monto is null or monto = 0 then raise exception 'filaInvalida' using errcode = 'P0001'; end if;
    if monto > 0 then entradas := entradas + monto; else salidas := salidas - monto; end if;
    n := n + 1;
    if ambito = 'negocio' then
      -- El tipo tiene que ir con la dirección: lo que entra es venta, aporte o préstamo (B1).
      if (monto > 0) <> (tipo in ('venta', 'aporte', 'prestamo')) then raise exception 'tipoNoCuadra' using errcode = 'P0001'; end if;
      insert into public.movements (owner_type, business_id, date, kind, amount, paid, account_id, description, source, import_id)
      values ('negocio', negocio, (fila ->> 'date')::date, tipo, abs(monto), true, cuenta, nullif(left(trim(coalesce(fila ->> 'description', '')), 200), ''), 'extracto', registro);
    else
      categoria := nullif(fila ->> 'category_id', '')::uuid;
      if categoria is not null and not exists (select 1 from public.categories where id = categoria and user_id = usuario) then
        raise exception 'sinPermiso' using errcode = '42501';
      end if;
      insert into public.movements (owner_type, user_id, date, kind, amount, category_id, description, source, import_id)
      values ('personal', usuario, (fila ->> 'date')::date, case when monto > 0 then 'ingreso' else 'gasto' end, abs(monto), categoria,
        nullif(left(trim(coalesce(fila ->> 'description', '')), 200), ''), 'extracto', registro);
    end if;
  end loop;
  if n = 0 then raise exception 'extractoVacio' using errcode = 'P0001'; end if;

  -- B9: el saldo de hoy no cambia → saldo inicial −= (entradas − salidas).
  update public.statement_imports set rows = n, inflows = entradas, outflows = salidas,
    adjustment = case when ambito = 'negocio' then salidas - entradas else 0 end where id = registro;
  if ambito = 'negocio' then
    update public.accounts set initial_balance = initial_balance + (salidas - entradas) where id = cuenta;
  end if;
  return registro;
end;
$$;

create or replace function public.deshacer_importacion(importacion uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  i public.statement_imports;
begin
  select * into i from public.statement_imports where id = importacion for update;
  if i.id is null
     or (i.owner_type = 'personal' and i.user_id is distinct from (select auth.uid()))
     or (i.owner_type = 'negocio' and not public.es_dueno(i.business_id)) then
    raise exception 'sinPermiso' using errcode = '42501';
  end if;
  delete from public.movements where import_id = importacion;
  if i.owner_type = 'negocio' then
    update public.accounts set initial_balance = initial_balance - i.adjustment where id = i.account_id;
  end if;
  delete from public.statement_imports where id = importacion;
end;
$$;

revoke execute on function public.importar_extracto(jsonb), public.deshacer_importacion(uuid) from public, anon;
grant execute on function public.importar_extracto(jsonb), public.deshacer_importacion(uuid) to authenticated;
