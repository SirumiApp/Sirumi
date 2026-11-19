-- D10 · Contar la caja (arqueo): queda guardado cada conteo y, si la persona quiere, el ajuste para que cuadre.

create table public.cash_counts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  expected bigint not null,
  counted bigint not null check (counted >= 0),
  difference bigint generated always as (counted - expected) stored,
  adjusted boolean not null default false,
  note text check (note is null or length(note) <= 200),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index cash_counts_negocio_idx on public.cash_counts (business_id, created_at desc);
alter table public.cash_counts enable row level security;
create policy "El dueño ve los arqueos" on public.cash_counts for select to authenticated using (public.es_dueno(business_id));
revoke all on public.cash_counts from anon;
revoke insert, update, delete on public.cash_counts from authenticated;

alter table public.movements drop constraint movements_source_check;
alter table public.movements add constraint movements_source_check check (source in ('manual', 'pos', 'importacion', 'extracto', 'arqueo'));

-- datos = { business_id, account_id, date, expected, counted, adjust: bool, note, faltante: texto, sobrante: texto } → id
create or replace function public.registrar_arqueo(datos jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  negocio uuid := (datos ->> 'business_id')::uuid;
  cuenta uuid := (datos ->> 'account_id')::uuid;
  esperado bigint := (datos ->> 'expected')::bigint;
  contado bigint := (datos ->> 'counted')::bigint;
  ajustar boolean := coalesce((datos ->> 'adjust')::boolean, false);
  diferencia bigint;
  id_arqueo uuid;
begin
  if negocio is null or not public.es_dueno(negocio) or not public.cuenta_del_negocio(cuenta, negocio) then
    raise exception 'sinPermiso' using errcode = '42501';
  end if;
  if esperado is null or contado is null or contado < 0 then raise exception 'montoInvalido' using errcode = 'P0001'; end if;
  diferencia := contado - esperado;
  insert into public.cash_counts (business_id, account_id, expected, counted, adjusted, note)
  values (negocio, cuenta, esperado, contado, ajustar and diferencia <> 0, nullif(left(trim(coalesce(datos ->> 'note', '')), 200), ''))
  returning id into id_arqueo;
  -- Ajuste: faltante = gasto variable; sobrante = venta (casi siempre, una venta sin registrar).
  if ajustar and diferencia <> 0 then
    insert into public.movements (owner_type, business_id, date, kind, amount, paid, account_id, description, source)
    values ('negocio', negocio, coalesce((datos ->> 'date')::date, current_date), case when diferencia < 0 then 'variable' else 'venta' end,
      abs(diferencia), true, cuenta, left(coalesce(case when diferencia < 0 then datos ->> 'faltante' else datos ->> 'sobrante' end, 'Arqueo'), 200), 'arqueo');
  end if;
  return id_arqueo;
end;
$$;
revoke execute on function public.registrar_arqueo(jsonb) from public, anon;
grant execute on function public.registrar_arqueo(jsonb) to authenticated;
