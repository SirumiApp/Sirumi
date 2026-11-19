-- Notificaciones del celular (pedido de Nicolás: "lo más esencial").
-- Cada celular guarda su dirección de notificaciones (token de Expo). Cuando alguien vende en el POS,
-- la base de datos le avisa al dueño por el servicio de notificaciones de Expo (no se mandan montos a analítica:
-- esto es un aviso al propio dueño, sobre su propio negocio).

create extension if not exists pg_net;

create table public.push_tokens (
  token text primary key check (token like 'ExponentPushToken[%' or token like 'ExpoPushToken[%'),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
create policy "Cada quien ve sus celulares" on public.push_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy "Cada quien registra su celular" on public.push_tokens for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Cada quien actualiza su celular" on public.push_tokens for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Cada quien borra su celular" on public.push_tokens for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.push_tokens from anon;

-- Si el mismo celular pasa a otra cuenta (cerró sesión y entró otra persona), el token se mueve a la nueva.
create or replace function public.registrar_celular(token text, plataforma text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'sinPermiso' using errcode = '42501'; end if;
  insert into public.push_tokens (token, user_id, platform, updated_at) values (token, (select auth.uid()), plataforma, now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;
revoke execute on function public.registrar_celular(text, text) from public, anon;
grant execute on function public.registrar_celular(text, text) to authenticated;

-- "$ 1.250.000"
create or replace function public.formato_pesos(valor bigint)
returns text language sql immutable set search_path = '' as $$
  select '$ ' || replace(to_char(valor, 'FM999,999,999,999'), ',', '.');
$$;

-- ¡Venta! Aviso a los dueños del negocio (menos a quien hizo la venta), si no lo apagaron en Ajustes.
create or replace function public.avisar_venta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  mensajes jsonb;
  quien text;
  formas text;
begin
  select display_name into quien from public.business_members where business_id = new.business_id and user_id = new.seller_id and role = 'seller';
  select string_agg(p ->> 'nombre', ' + ') into formas from jsonb_array_elements(new.payments) p;
  select jsonb_agg(jsonb_build_object(
      'to', t.token,
      'sound', 'default',
      'title', case when pr.language = 'en' then 'Sale! ' else '¡Venta! ' end || public.formato_pesos(new.total),
      'body', concat_ws(' · ',
        case when quien is not null then quien || case when pr.language = 'en' then ' sold' else ' vendió' end end,
        'POS-' || lpad(new.number::text, 4, '0'), formas),
      'data', jsonb_build_object('tipo', 'venta', 'venta', new.id)
    ))
    into mensajes
  from public.push_tokens t
  join public.business_members m on m.user_id = t.user_id and m.business_id = new.business_id and m.role = 'owner'
  join public.profiles pr on pr.id = t.user_id
  where t.user_id is distinct from new.seller_id
    and coalesce((pr.preferences -> 'notificaciones' ->> 'ventas')::boolean, true);
  if mensajes is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := mensajes,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
  return new;
end;
$$;
revoke execute on function public.avisar_venta() from public, anon, authenticated;

create trigger sales_avisar_venta after insert on public.sales for each row execute function public.avisar_venta();
