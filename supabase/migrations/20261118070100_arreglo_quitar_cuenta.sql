-- Arreglo: al quitar una cuenta, primero se borran los traslados entre esa cuenta y la principal
-- (quedarían de una cuenta a sí misma, algo que la tabla no permite); después se mueve todo a la principal.
create or replace function public.quitar_cuenta_negocio(cuenta uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  negocio uuid;
  principal uuid;
  movidos integer;
begin
  select business_id into negocio from public.accounts where id = cuenta and owner_type = 'negocio' and kind <> 'efectivo';
  if negocio is null or not public.es_dueno(negocio) then
    raise exception 'No se puede quitar esa cuenta';
  end if;
  select id into principal from public.accounts
  where business_id = negocio and id <> cuenta
  order by is_main desc, (kind = 'efectivo') desc, created_at
  limit 1;
  delete from public.transfers
  where (from_account = cuenta and to_account = principal) or (from_account = principal and to_account = cuenta);
  update public.movements set account_id = principal where account_id = cuenta;
  get diagnostics movidos = row_count;
  update public.transfers set from_account = principal where from_account = cuenta;
  update public.transfers set to_account = principal where to_account = cuenta;
  delete from public.accounts where id = cuenta;
  return movidos;
end;
$$;
