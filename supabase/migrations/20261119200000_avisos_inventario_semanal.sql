-- Avisos que manda el servidor (push al celular), cada uno se apaga en Ajustes:
-- 1) C9 · Inventario bajo: cuando un producto llega a su mínimo (sumando todas las bodegas), al dueño.
-- 2) B14 · Resumen semanal: cada lunes 8 a. m. (Bogotá), lo de la semana pasada. Solo a quien tuvo movimiento.

create or replace function public.avisar_inventario_bajo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  producto record;
  ahora integer;
  antes integer;
  mensajes jsonb;
begin
  select p.id, p.name, p.min_stock into producto from public.product_variants v join public.products p on p.id = v.product_id where v.id = new.variant_id;
  if producto.id is null or coalesce(producto.min_stock, 0) <= 0 then return new; end if;
  select coalesce(sum(s.quantity), 0) into ahora from public.stock s join public.product_variants v on v.id = s.variant_id where v.product_id = producto.id;
  antes := ahora - (new.quantity - coalesce(case when tg_op = 'UPDATE' then old.quantity end, 0));
  -- Solo cuando cruza el mínimo (antes estaba por encima y ahora llegó o bajó de él).
  if not (antes > producto.min_stock and ahora <= producto.min_stock) then return new; end if;
  select jsonb_agg(jsonb_build_object(
      'to', t.token,
      'sound', 'default',
      'title', case when pr.language = 'en' then 'Running low: ' else 'Queda poco: ' end || producto.name,
      'body', case when pr.language = 'en'
        then ahora || ' left (minimum ' || producto.min_stock || '). Time to restock.'
        else 'Quedan ' || ahora || ' (mínimo ' || producto.min_stock || '). Es hora de reponer.' end,
      'data', jsonb_build_object('tipo', 'inventario', 'producto', producto.id)
    ))
    into mensajes
  from public.push_tokens t
  join public.business_members m on m.user_id = t.user_id and m.business_id = new.business_id and m.role = 'owner'
  join public.profiles pr on pr.id = t.user_id
  where coalesce((pr.preferences -> 'notificaciones' ->> 'inventario')::boolean, true);
  if mensajes is not null then
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := mensajes,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
  end if;
  return new;
end;
$$;
revoke execute on function public.avisar_inventario_bajo() from public, anon, authenticated;
create trigger avisar_inventario_bajo after insert or update of quantity on public.stock
  for each row execute function public.avisar_inventario_bajo();

-- B14 · Lo de la semana (lunes a domingo) de una persona: su negocio (si es dueña) y su plata personal.
create or replace function public.resumen_de_semana(usuario uuid, desde date, hasta date)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'negocio', (select b.name from public.business_members m join public.businesses b on b.id = m.business_id where m.user_id = usuario and m.role = 'owner' order by m.created_at limit 1),
    'ventas', coalesce((select sum(mv.amount) from public.movements mv join public.business_members m on m.business_id = mv.business_id and m.user_id = usuario and m.role = 'owner'
                        where mv.owner_type = 'negocio' and mv.kind = 'venta' and mv.date between desde and hasta), 0),
    'salidas', coalesce((select sum(mv.amount) from public.movements mv join public.business_members m on m.business_id = mv.business_id and m.user_id = usuario and m.role = 'owner'
                         where mv.owner_type = 'negocio' and mv.kind in ('compra', 'fijo', 'variable', 'impuesto', 'inversion') and mv.date between desde and hasta), 0),
    'numero', (select count(*) from public.sales s join public.business_members m on m.business_id = s.business_id and m.user_id = usuario and m.role = 'owner'
               where s.status <> 'devuelta' and s.date between desde and hasta),
    'gastos', coalesce((select sum(amount) from public.movements where owner_type = 'personal' and user_id = usuario and kind = 'gasto' and date between desde and hasta), 0),
    'ingresos', coalesce((select sum(amount) from public.movements where owner_type = 'personal' and user_id = usuario and kind = 'ingreso' and date between desde and hasta), 0)
  );
$$;
revoke execute on function public.resumen_de_semana(uuid, date, date) from public, anon, authenticated;

create or replace function public.enviar_resumen_semanal()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  hoy date := (now() at time zone 'America/Bogota')::date;
  desde date := hoy - 7;
  hasta date := hoy - 1;
  persona record;
  r jsonb;
  en boolean;
  titulo text;
  cuerpo text;
  mensajes jsonb := '[]'::jsonb;
  enviados integer := 0;
begin
  for persona in
    select pr.id, pr.language from public.profiles pr
    where exists (select 1 from public.push_tokens t where t.user_id = pr.id)
      and coalesce((pr.preferences -> 'notificaciones' ->> 'semanal')::boolean, true)
  loop
    r := public.resumen_de_semana(persona.id, desde, hasta);
    en := persona.language = 'en';
    if (r ->> 'ventas')::bigint > 0 or (r ->> 'salidas')::bigint > 0 then
      titulo := case when en then 'Your week at ' else 'Tu semana en ' end || (r ->> 'negocio');
      cuerpo := concat_ws(' · ',
        case when en then 'Sales ' else 'Vendiste ' end || public.formato_pesos((r ->> 'ventas')::bigint),
        case when (r ->> 'numero')::int > 0 then (r ->> 'numero') || case when en then ' POS sales' else ' ventas en el POS' end end,
        case when en then 'Out ' else 'Salió ' end || public.formato_pesos((r ->> 'salidas')::bigint));
    elsif (r ->> 'gastos')::bigint > 0 or (r ->> 'ingresos')::bigint > 0 then
      titulo := case when en then 'Your week' else 'Tu semana' end;
      cuerpo := concat_ws(' · ',
        case when en then 'You spent ' else 'Gastaste ' end || public.formato_pesos((r ->> 'gastos')::bigint),
        case when (r ->> 'ingresos')::bigint > 0 then case when en then 'Income ' else 'Te entró ' end || public.formato_pesos((r ->> 'ingresos')::bigint) end);
    else
      continue;
    end if;
    select mensajes || coalesce(jsonb_agg(jsonb_build_object('to', t.token, 'sound', 'default', 'title', titulo, 'body', cuerpo, 'data', jsonb_build_object('tipo', 'semanal'))), '[]'::jsonb)
      into mensajes from public.push_tokens t where t.user_id = persona.id;
    enviados := enviados + 1;
  end loop;
  -- Expo recibe hasta 100 avisos por envío.
  for i in 0 .. greatest(jsonb_array_length(mensajes) - 1, 0) / 100 loop
    if jsonb_array_length(mensajes) > 0 then
      perform net.http_post(url := 'https://exp.host/--/api/v2/push/send',
        body := (select jsonb_agg(x) from (select x from jsonb_array_elements(mensajes) with ordinality as e(x, n) where n > i * 100 and n <= (i + 1) * 100) s),
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
    end if;
  end loop;
  return enviados;
end;
$$;
revoke execute on function public.enviar_resumen_semanal() from public, anon, authenticated;

create extension if not exists pg_cron;
-- Lunes 8:00 a. m. en Bogotá = 13:00 UTC.
select cron.schedule('resumen-semanal', '0 13 * * 1', 'select public.enviar_resumen_semanal()');
